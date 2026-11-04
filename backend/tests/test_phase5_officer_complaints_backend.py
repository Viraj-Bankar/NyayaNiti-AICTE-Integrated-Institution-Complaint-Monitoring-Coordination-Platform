import os
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import (
    Case, CaseEvent, User, Complainant, Institution, Bureau,
    CaseAssignment, DocumentMetadata, Notification, AuditLog, CaseRelationship
)
from app.api.documents import BASE_STORAGE_DIR

client = TestClient(app)

def get_officer_headers(username="admin", password="admin123"):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Officer login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def get_bureau_head_headers():
    res = client.post("/api/auth/login", json={"username": "bureauhead_pgrc", "password": "head123"})
    assert res.status_code == 200, f"Bureau head login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def get_standard_officer_headers():
    res = client.post("/api/auth/login", json={"username": "officer_pgrc", "password": "officer123"})
    assert res.status_code == 200, f"Standard officer login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def get_citizen_headers():
    uid = uuid.uuid4().hex[:6]
    payload = {
        "full_name": f"Citizen Backend {uid}",
        "email": f"backend.{uid}@aicte.test.in",
        "mobile": f"9{uuid.uuid4().int % 900000000 + 100000000}",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "complainant_type": "Student"
    }
    reg_res = client.post("/api/complainant/register", json=payload)
    assert reg_res.status_code == 201

    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, payload

# -------------------------------------------------------------------------
# 1. Role Authorization Tests
# -------------------------------------------------------------------------
def test_officer_inbox_role_authorization():
    # 1. Unauthenticated request should be rejected (401)
    res_unauth = client.get("/api/officer/complaints")
    assert res_unauth.status_code in [401, 403]

    # 2. Complainant token attempting to access officer inbox should be rejected (403)
    citizen_headers, _ = get_citizen_headers()
    res_complainant = client.get("/api/officer/complaints", headers=citizen_headers)
    assert res_complainant.status_code == 403

    # 3. Authorized officer should succeed (200)
    officer_headers = get_officer_headers()
    res_officer = client.get("/api/officer/complaints", headers=officer_headers)
    assert res_officer.status_code == 200
    data = res_officer.json()
    assert "items" in data
    assert "total" in data

# -------------------------------------------------------------------------
# 2. Feature 1: Complaint Listing, Filters, Search & Pagination
# -------------------------------------------------------------------------
def test_officer_complaint_inbox_search_and_filters():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()
    assert inst is not None

    unique_title = f"Searchable Fee Violation {uuid.uuid4().hex[:6]}"
    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": unique_title,
        "category": "Fees and Financial Issues",
        "description": "Specific query content testing filtering and searching capability."
    })
    assert sub_res.status_code == 201
    created_id = sub_res.json()["id"]

    # Filter by search q
    res_q = client.get(f"/api/officer/complaints?q={created_id}", headers=officer_headers)
    assert res_q.status_code == 200
    q_data = res_q.json()
    assert q_data["total"] >= 1
    assert any(c["id"] == created_id for c in q_data["items"])

    # Filter by category
    res_cat = client.get(f"/api/officer/complaints?category=Fees and Financial Issues", headers=officer_headers)
    assert res_cat.status_code == 200
    cat_data = res_cat.json()
    assert all(c["category"] == "Fees and Financial Issues" for c in cat_data["items"])

    # Filter by status
    res_status = client.get(f"/api/officer/complaints?status=Submitted", headers=officer_headers)
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert all(c["status"] == "Submitted" for c in status_data["items"])

    # Filter by unassigned_only
    res_unassigned = client.get("/api/officer/complaints?unassigned_only=true", headers=officer_headers)
    assert res_unassigned.status_code == 200
    unassigned_data = res_unassigned.json()
    assert all(c["assigned_officer_id"] is None for c in unassigned_data["items"])

# -------------------------------------------------------------------------
# 3. Feature 2: Complaint Details & Role-Based Privacy
# -------------------------------------------------------------------------
def test_officer_complaint_details_and_privacy_controls():
    citizen_headers, citizen_meta = get_citizen_headers()
    admin_headers = get_officer_headers()
    standard_headers = get_standard_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Privacy Audited Grievance",
        "category": "Admission and Enrollment",
        "description": "Testing PII segregation between admin/bureau head and standard officer."
    })
    assert sub_res.status_code == 201
    case_id = sub_res.json()["id"]

    # 1. Admin / Bureau Head can view verified complainant contact info
    admin_res = client.get(f"/api/officer/complaints/{case_id}", headers=admin_headers)
    assert admin_res.status_code == 200
    admin_detail = admin_res.json()
    assert admin_detail["complainant"] is not None
    assert admin_detail["complainant"]["email"] == citizen_meta["email"]
    assert admin_detail["complainant"]["full_name"] == citizen_meta["full_name"]

    # 2. Non-assigned standard officer sees masked / redacted PII
    std_res = client.get(f"/api/officer/complaints/{case_id}", headers=standard_headers)
    assert std_res.status_code == 200
    std_detail = std_res.json()
    assert std_detail["complainant"]["pii_redacted"] is True
    assert "email" not in std_detail["complainant"]

# -------------------------------------------------------------------------
# 4. Feature 3: Review, Acceptance, Rejection & Clarification Workflow
# -------------------------------------------------------------------------
def test_officer_review_and_validation_lifecycle():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Lifecycle Progression Matter",
        "category": "Academic Issues",
        "description": "Lifecycle transition test."
    })
    assert sub_res.status_code == 201
    case_id = sub_res.json()["id"]
    assert sub_res.json()["status"] == "Submitted"

    # 1. Start Review: transitions 'Submitted' -> 'Under Review'
    start_res = client.post(f"/api/officer/complaints/{case_id}/start-review", headers=officer_headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "Under Review"

    # 2. Request Info: transitions 'Under Review' -> 'Additional Information Required'
    req_info_res = client.post(f"/api/officer/complaints/{case_id}/request-info", headers=officer_headers, json={
        "query_details": "Please submit your appointment letter and salary slips.",
        "required_documents": "PDF copies of last 3 pay slips",
        "deadline_days": 10
    })
    assert req_info_res.status_code == 200
    assert req_info_res.json()["status"] == "Additional Information Required"

    # Verify citizen received high-severity notification
    db = SessionLocal()
    cit_notif = db.query(Notification).filter(
        Notification.related_case_id == case_id,
        Notification.notification_type == "INFO_REQUESTED"
    ).first()
    assert cit_notif is not None
    assert cit_notif.complainant_id is not None
    db.close()

    # 3. Citizen submits clarification: auto-resumes to 'Under Review'
    clarify_res = client.post(f"/api/complainant/complaints/{case_id}/clarification", headers=citizen_headers, json={
        "response_text": "Attached appointment letter and bank statements showing non-payment."
    })
    assert clarify_res.status_code == 200
    assert clarify_res.json()["status"] == "Under Review"

    # 4. Accept Complaint: transitions 'Under Review' -> 'In Progress'
    accept_res = client.post(f"/api/officer/complaints/{case_id}/accept", headers=officer_headers, json={
        "priority": "High",
        "remarks": "Admitted for formal bureau inspection"
    })
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "In Progress"

# -------------------------------------------------------------------------
# 5. Statutory Rejection with Mandatory Reason
# -------------------------------------------------------------------------
def test_statutory_rejection_with_mandatory_reason():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Sub-Judice Matter Rejection Test",
        "category": "Admission and Enrollment",
        "description": "Matter is currently pending before the High Court."
    })
    case_id = sub_res.json()["id"]

    # Reject without mandatory justification should fail validation (422)
    bad_reject = client.post(f"/api/officer/complaints/{case_id}/reject", headers=officer_headers, json={
        "statutory_reason": "Sub-Judice / Active Court Case",
        "remarks": "   "
    })
    assert bad_reject.status_code == 422

    # Proper rejection with statutory grounds
    valid_reject = client.post(f"/api/officer/complaints/{case_id}/reject", headers=officer_headers, json={
        "statutory_reason": "Sub-Judice / Active Court Case",
        "remarks": "Matter is under active adjudication before Hon'ble High Court in WP No. 1024/2026."
    })
    assert valid_reject.status_code == 200
    assert valid_reject.json()["status"] == "Rejected"

    # Verify audit log
    db = SessionLocal()
    audit_entry = db.query(AuditLog).filter(
        AuditLog.entity_id == case_id,
        AuditLog.event_type == "COMPLAINT_REJECTED"
    ).first()
    assert audit_entry is not None
    assert "Sub-Judice" in audit_entry.remarks
    db.close()

# -------------------------------------------------------------------------
# 6. Invalid Status Transition Prevention
# -------------------------------------------------------------------------
def test_invalid_status_transition_rejection():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Direct Transition Breach Test",
        "category": "Academic Issues",
        "description": "Attempting illegal direct transition from Submitted to In Progress."
    })
    case_id = sub_res.json()["id"]
    assert sub_res.json()["status"] == "Submitted"

    # Attempting to accept directly into In Progress from Submitted violates statutory flow
    # (Must enter Under Review first)
    invalid_accept = client.post(f"/api/officer/complaints/{case_id}/accept", headers=officer_headers, json={
        "remarks": "Direct admission without preliminary review"
    })
    assert invalid_accept.status_code == 400
    assert "statutory transition violation" in invalid_accept.json()["detail"].lower()

# -------------------------------------------------------------------------
# 7. Feature 4: Complaint-to-Case Integration & Linking (Zero Duplication)
# -------------------------------------------------------------------------
def test_complaint_to_case_integration_and_linking():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Complainant A submits
    sub_a = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Lead Docket: Capitation Fee Demand",
        "category": "Fees and Financial Issues",
        "description": "Student A forced to pay 50k cash."
    })
    case_a = sub_a.json()["id"]

    # Complainant B submits
    sub_b = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Child Grievance: Capitation Fee Demand",
        "category": "Fees and Financial Issues",
        "description": "Student B forced to pay same cash fee."
    })
    case_b = sub_b.json()["id"]

    # 1. Link Case B to Case A
    link_res = client.post(f"/api/officer/complaints/{case_a}/link-case", headers=officer_headers, json={
        "target_case_id": case_b,
        "relationship_type": "Consolidated Grievance",
        "remarks": "Unified institutional fee racket inquiry"
    })
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["case_a_id"] == case_a
    assert link_data["case_b_id"] == case_b

    # 2. Prevent duplicate link creation
    dup_res = client.post(f"/api/officer/complaints/{case_a}/link-case", headers=officer_headers, json={
        "target_case_id": case_b,
        "relationship_type": "Consolidated Grievance"
    })
    assert dup_res.status_code == 400
    assert "already linked" in dup_res.json()["detail"].lower()

    # 3. Prevent self-link
    self_res = client.post(f"/api/officer/complaints/{case_a}/link-case", headers=officer_headers, json={
        "target_case_id": case_a
    })
    assert self_res.status_code == 400

    # 4. Verify detail endpoint reports the linked case
    detail_res = client.get(f"/api/officer/complaints/{case_a}", headers=officer_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert any(lc["related_case_id"] == case_b for lc in detail["linked_cases"])

# -------------------------------------------------------------------------
# 8. Feature 5: Officer Assignment Permissions & Chain of Custody
# -------------------------------------------------------------------------
def test_officer_assignment_validation_and_chain_of_custody():
    citizen_headers, _ = get_citizen_headers()
    admin_headers = get_officer_headers()
    std_officer_headers = get_standard_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    active_officer = db.query(User).filter(User.role == "authorized_officer", User.is_active == True).first()
    db.close()
    assert active_officer is not None

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Assignment Chain Custody Test",
        "category": "Admission and Enrollment",
        "description": "Testing assignment authorization and immutable custody logging."
    })
    case_id = sub_res.json()["id"]

    # 1. Standard officer without assign permission cannot assign (403)
    unauth_assign = client.post(f"/api/officer/complaints/{case_id}/assign", headers=std_officer_headers, json={
        "to_officer_id": active_officer.id
    })
    assert unauth_assign.status_code == 403

    # 2. Invalid target officer ID returns 404
    bad_officer = client.post(f"/api/officer/complaints/{case_id}/assign", headers=admin_headers, json={
        "to_officer_id": 999999
    })
    assert bad_officer.status_code == 404

    # 3. Valid assignment by Admin succeeds
    assign_res = client.post(f"/api/officer/complaints/{case_id}/assign", headers=admin_headers, json={
        "to_officer_id": active_officer.id,
        "remarks": "Assigned for detailed inspection"
    })
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_officer_id"] == active_officer.id
    assert assign_res.json()["status"] == "Under Review"

    # Verify immutable CaseAssignment record was created
    db = SessionLocal()
    custody_entry = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == case_id,
        CaseAssignment.to_officer_id == active_officer.id
    ).first()
    assert custody_entry is not None
    assert custody_entry.remarks == "Assigned for detailed inspection"
    db.close()

# -------------------------------------------------------------------------
# 9. Feature 7: Document Access & Confidentiality Controls
# -------------------------------------------------------------------------
def test_document_download_and_confidentiality_access_controls():
    citizen_headers, _ = get_citizen_headers()
    admin_headers = get_officer_headers()
    std_officer_headers = get_standard_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Create dummy evidence file
    os.makedirs(BASE_STORAGE_DIR, exist_ok=True)
    test_filename = f"evidence_{uuid.uuid4().hex[:6]}.pdf"
    test_filepath = os.path.join(BASE_STORAGE_DIR, test_filename)
    with open(test_filepath, "wb") as f:
        f.write(b"%PDF-1.4 official evidence dummy binary bytes")

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Evidence Verification Matter",
        "category": "Fees and Financial Issues",
        "description": "Evidence attached for scrutiny."
    })
    case_id = sub_res.json()["id"]

    db = SessionLocal()
    doc = DocumentMetadata(
        case_id=case_id,
        file_name=test_filename,
        original_filename="Fee_Receipt_Proof.pdf",
        file_size=len(b"%PDF-1.4 official evidence dummy binary bytes"),
        file_type="pdf",
        category="Action Evidence",
        access_classification="Confidential - Bureau Head Only",
        uploader_role="complainant",
        file_path=test_filepath,
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    doc_id = doc.id
    db.close()

    # 1. Standard officer blocked by 'Confidential - Bureau Head Only' (403)
    blocked_res = client.get(
        f"/api/officer/complaints/{case_id}/documents/{doc_id}/download",
        headers=std_officer_headers
    )
    assert blocked_res.status_code == 403

    # 2. Super Admin or Bureau Head succeeds and streams binary content (200)
    allowed_res = client.get(
        f"/api/officer/complaints/{case_id}/documents/{doc_id}/download",
        headers=admin_headers
    )
    assert allowed_res.status_code == 200
    assert allowed_res.content.startswith(b"%PDF-1.4")
    assert allowed_res.headers["content-type"] == "application/pdf"

    # Clean up file
    if os.path.exists(test_filepath):
        os.remove(test_filepath)

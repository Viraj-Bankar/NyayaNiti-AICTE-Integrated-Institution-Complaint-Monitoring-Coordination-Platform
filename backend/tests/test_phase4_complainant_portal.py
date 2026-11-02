import io
import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import (
    Complainant, Institution, Case, CaseEvent,
    DocumentMetadata, Notification, AuditLog, ComplaintCategory
)
from app.seed_data import seed_complainants

client = TestClient(app)

# Ensure seed data exists
_db = SessionLocal()
try:
    seed_complainants(_db)
finally:
    _db.close()


def get_citizen_auth_headers(prefix="portal"):
    uid = uuid.uuid4().hex[:6]
    payload = {
        "full_name": f"Citizen {prefix.title()} {uid}",
        "email": f"{prefix}.{uid}@test.in",
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
# 1. Complainant Institution Search (Both Endpoints)
# -------------------------------------------------------------------------
def test_complainant_institution_search():
    headers, _ = get_citizen_auth_headers("inst")

    # Primary endpoint: /api/complainant/complaints/institutions
    res = client.get("/api/complainant/complaints/institutions", headers=headers)
    assert res.status_code == 200
    insts = res.json()
    assert len(insts) >= 1
    assert "permanent_id" in insts[0]
    assert "official_name" in insts[0]

    # Alias endpoint: /api/complainant/institutions
    res_alias = client.get("/api/complainant/institutions", headers=headers)
    assert res_alias.status_code == 200

    # Filtered by search query
    res_filtered = client.get("/api/complainant/complaints/institutions?q=Delhi", headers=headers)
    assert res_filtered.status_code == 200
    data = res_filtered.json()
    assert len(data) >= 1
    assert any("Delhi" in inst["official_name"] or "Delhi" in inst["city"] for inst in data)


# -------------------------------------------------------------------------
# 2. Statutory Complaint Categories
# -------------------------------------------------------------------------
def test_complainant_categories():
    headers, _ = get_citizen_auth_headers("cats")

    res = client.get("/api/complainant/complaints/categories", headers=headers)
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) >= 10
    names = [c["name"] for c in categories]
    assert "Fees and Financial Issues" in names
    assert "Harassment and Discrimination" in names
    assert "Academic Issues" in names


# -------------------------------------------------------------------------
# 3. Successful Complaint Submission (/api/complainant/complaints)
# -------------------------------------------------------------------------
def test_file_complaint_and_receive_reference_id():
    headers, citizen = get_citizen_auth_headers("lodge")

    inst_res = client.get("/api/complainant/complaints/institutions", headers=headers)
    inst_id = inst_res.json()[0]["id"]

    payload = {
        "institution_id": inst_id,
        "title": "Unapproved Tuition Hike Without Receipt",
        "category": "Fees and Financial Issues",
        "subcategory": "Tuition Fee Surcharge",
        "description": "College demanded extra Rs 50,000 cash for 3rd semester registration without any formal receipt."
    }

    # Primary route: POST /api/complainant/complaints
    res = client.post("/api/complainant/complaints", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    # Public Reference Number format verification
    assert data["id"].startswith("AICTE-PGRC-")
    assert data["institution_id"] == inst_id
    assert data["title"] == payload["title"]
    assert data["category"] == payload["category"]
    assert data["status"] == "Submitted"
    assert data["bureau_code"] == "PGRC"
    assert "prescribed_deadline" in data
    assert "date_received" in data


# -------------------------------------------------------------------------
# 4. Invalid Complaint Data Validation
# -------------------------------------------------------------------------
def test_invalid_complaint_data():
    headers, _ = get_citizen_auth_headers("inval")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    # 1. Short description (< 20 chars) -> 422 Unprocessable Entity
    short_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Valid Title Here",
        "category": "Academic Issues",
        "description": "Too short"
    }, headers=headers)
    assert short_res.status_code == 422

    # 2. Non-existent institution -> 404 Not Found
    no_inst_res = client.post("/api/complainant/complaints", json={
        "institution_id": 9999999,
        "title": "Valid Title Here",
        "category": "Academic Issues",
        "description": "Factual description that has well over twenty characters for testing."
    }, headers=headers)
    assert no_inst_res.status_code == 404
    assert "institution not found" in no_inst_res.json()["detail"].lower()

    # 3. Invalid complaint category -> 400 Bad Request
    bad_cat_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Valid Title Here",
        "category": "Completely Bogus Fake Category XYZ",
        "description": "Factual description that has well over twenty characters for testing."
    }, headers=headers)
    assert bad_cat_res.status_code == 400
    assert "invalid complaint category" in bad_cat_res.json()["detail"].lower()


# -------------------------------------------------------------------------
# 5. Missing Authentication Enforcement
# -------------------------------------------------------------------------
def test_missing_authentication_rejected():
    # Calling without Authorization header must return 401
    res1 = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "category": "Academic Issues",
        "description": "Valid length description for testing missing auth."
    })
    assert res1.status_code == 401

    res2 = client.get("/api/complainant/complaints")
    assert res2.status_code == 401

    res3 = client.get("/api/complainant/complaints/AICTE-PGRC-2026-9999")
    assert res3.status_code == 401


# -------------------------------------------------------------------------
# 6. Officer Token Access Restrictions
# -------------------------------------------------------------------------
def test_officer_token_rejected_by_complainant_portal():
    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    officer_token = off_login.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # Officer tokens calling citizen portal endpoints MUST receive 403 Forbidden
    res1 = client.get("/api/complainant/complaints", headers=officer_headers)
    assert res1.status_code == 403
    assert "restricted to registered citizens" in res1.json()["detail"].lower()

    res2 = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "category": "Academic Issues",
        "description": "Valid length description for testing officer token rejection."
    }, headers=officer_headers)
    assert res2.status_code == 403


# -------------------------------------------------------------------------
# 7. Complaint Ownership & Anti-IDOR Restrictions
# -------------------------------------------------------------------------
def test_complaint_ownership_isolation():
    headers_a, _ = get_citizen_auth_headers("user_a")
    headers_b, _ = get_citizen_auth_headers("user_b")

    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers_a).json()[0]["id"]
    file_a = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Citizen A Confidential Grievance",
        "category": "Academic Issues",
        "description": "Examination result tampered by administration in university."
    }, headers=headers_a)
    complaint_a_id = file_a.json()["id"]

    # Citizen B attempts to access Citizen A's complaint -> MUST return 404
    hack_detail = client.get(f"/api/complainant/complaints/{complaint_a_id}", headers=headers_b)
    assert hack_detail.status_code == 404
    assert "not found or access unauthorized" in hack_detail.json()["detail"].lower()

    # Citizen B attempts to access Citizen A's history -> MUST return 404
    hack_hist = client.get(f"/api/complainant/complaints/{complaint_a_id}/history", headers=headers_b)
    assert hack_hist.status_code == 404

    # Citizen B attempts to upload document to Citizen A's complaint -> MUST return 404
    pdf_bytes = io.BytesIO(b"%PDF-1.4 test document content")
    hack_doc = client.post(
        f"/api/complainant/complaints/{complaint_a_id}/documents",
        headers=headers_b,
        files={"file": ("hack.pdf", pdf_bytes, "application/pdf")},
        data={"category": "Evidence"}
    )
    assert hack_doc.status_code == 404


# -------------------------------------------------------------------------
# 8. Complaint Listing Isolation, Pagination, Filtering & Sorting
# -------------------------------------------------------------------------
def test_complaint_listing_isolation_pagination_sorting():
    headers, _ = get_citizen_auth_headers("listuser")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    # File two distinct complaints
    res1 = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "First Grievance Complaint",
        "category": "Academic Issues",
        "description": "Description of the first complaint that is well over twenty characters."
    }, headers=headers)
    assert res1.status_code == 201

    res2 = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Second Grievance Complaint",
        "category": "Fees and Financial Issues",
        "description": "Description of the second complaint that is well over twenty characters."
    }, headers=headers)
    assert res2.status_code == 201

    # 1. Basic List
    list_res = client.get("/api/complainant/complaints", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 2

    # 2. Filtering by category
    filter_res = client.get("/api/complainant/complaints?category=Academic Issues", headers=headers)
    assert filter_res.status_code == 200
    filtered_items = filter_res.json()
    assert len(filtered_items) == 1
    assert filtered_items[0]["category"] == "Academic Issues"

    # 3. Pagination (limit=1)
    page_res = client.get("/api/complainant/complaints?limit=1&skip=0", headers=headers)
    assert page_res.status_code == 200
    assert len(page_res.json()) == 1

    # 4. Sorting order
    sort_asc = client.get("/api/complainant/complaints?sort_order=asc", headers=headers)
    assert sort_asc.status_code == 200
    sort_desc = client.get("/api/complainant/complaints?sort_order=desc", headers=headers)
    assert sort_desc.status_code == 200
    assert sort_asc.json()[0]["id"] == res1.json()["id"]
    assert sort_desc.json()[0]["id"] == res2.json()["id"]


# -------------------------------------------------------------------------
# 9. Complaint Status History Endpoint
# -------------------------------------------------------------------------
def test_complaint_status_history_timeline():
    headers, _ = get_citizen_auth_headers("hist")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Delayed Scholarship Release",
        "category": "Student Welfare",
        "description": "State scholarship disbursed to institution has not been credited to student account for 6 months."
    }, headers=headers)
    complaint_id = file_res.json()["id"]

    # History query via GET /api/complainant/complaints/{id}/history
    hist_res = client.get(f"/api/complainant/complaints/{complaint_id}/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1
    assert history[0]["event_type"] == "SUBMITTED"
    assert "remarks" in history[0]
    assert "timestamp" in history[0]


# -------------------------------------------------------------------------
# 10. Supporting Document Upload, Content Validation & Download
# -------------------------------------------------------------------------
def test_document_upload_content_validation_and_download():
    headers, _ = get_citizen_auth_headers("docup")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Infrastructure Ceiling Hazard",
        "category": "Infrastructure and Facilities",
        "description": "Structural cracks in chemistry laboratory ceiling posing immediate danger."
    }, headers=headers)
    complaint_id = file_res.json()["id"]

    # 1. Valid PDF upload with magic bytes (%PDF)
    pdf_bytes = io.BytesIO(b"%PDF-1.4 official complaint document test bytes for AICTE PGRC.")
    files = {"file": ("ceiling_inspection.pdf", pdf_bytes, "application/pdf")}
    data = {"category": "Inspection Evidence"}

    upload_res = client.post(f"/api/complainant/complaints/{complaint_id}/documents", headers=headers, files=files, data=data)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["case_id"] == complaint_id
    assert doc_data["original_filename"] == "ceiling_inspection.pdf"
    assert doc_data["file_type"] == "pdf"
    doc_id = doc_data["id"]

    # 2. Reject mismatched magic bytes (pretending to be PDF but actually plain text)
    fake_pdf = io.BytesIO(b"This is not a pdf file at all!")
    bad_content_res = client.post(
        f"/api/complainant/complaints/{complaint_id}/documents",
        headers=headers,
        files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
        data=data
    )
    assert bad_content_res.status_code == 400
    assert "file content does not match" in bad_content_res.json()["detail"].lower()

    # 3. Reject unsupported extension (.exe)
    exe_bytes = io.BytesIO(b"malicious executable content")
    bad_ext_res = client.post(
        f"/api/complainant/complaints/{complaint_id}/documents",
        headers=headers,
        files={"file": ("malware.exe", exe_bytes, "application/octet-stream")},
        data=data
    )
    assert bad_ext_res.status_code == 400
    assert "unsupported file format" in bad_ext_res.json()["detail"].lower()

    # 4. Reject empty 0-byte file
    empty_bytes = io.BytesIO(b"")
    empty_res = client.post(
        f"/api/complainant/complaints/{complaint_id}/documents",
        headers=headers,
        files={"file": ("empty.pdf", empty_bytes, "application/pdf")},
        data=data
    )
    assert empty_res.status_code == 400
    assert "file is empty" in empty_res.json()["detail"].lower()

    # 5. List documents via GET /api/complainant/complaints/{id}/documents
    docs_list = client.get(f"/api/complainant/complaints/{complaint_id}/documents", headers=headers)
    assert docs_list.status_code == 200
    assert len(docs_list.json()) >= 1

    # 6. Secure document download
    download_res = client.get(f"/api/complainant/complaints/{complaint_id}/documents/{doc_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert "ceiling_inspection.pdf" in download_res.headers.get("content-disposition", "")
    assert download_res.headers.get("x-content-type-options") == "nosniff"


# -------------------------------------------------------------------------
# 11. Duplicate Submission Safeguard
# -------------------------------------------------------------------------
def test_duplicate_submission_safeguard():
    headers, _ = get_citizen_auth_headers("dupuser")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    payload = {
        "institution_id": inst_id,
        "title": "Duplicate Check Grievance",
        "category": "Academic Issues",
        "description": "Unique text describing an academic issue in college for duplicate prevention check."
    }

    # First submission -> 201 Created
    first_res = client.post("/api/complainant/complaints", json=payload, headers=headers)
    assert first_res.status_code == 201

    # Immediate second identical submission -> 409 Conflict
    dup_res = client.post("/api/complainant/complaints", json=payload, headers=headers)
    assert dup_res.status_code == 409
    assert "duplicate complaint detected" in dup_res.json()["detail"].lower()


# -------------------------------------------------------------------------
# 12. Database Relationships and Audit Logging Verification
# -------------------------------------------------------------------------
def test_database_relationships_and_audit():
    headers, citizen = get_citizen_auth_headers("audituser")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Audit Trail Grievance Submission",
        "category": "Administrative Issues",
        "description": "Administrative refusal to process bona fide certificate request for educational loan."
    }, headers=headers)
    assert res.status_code == 201
    complaint_id = res.json()["id"]

    # Verify directly in DB
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == complaint_id).first()
        assert case is not None
        assert case.complainant_id is not None
        assert case.institution_id == inst_id
        assert case.status == "Submitted"

        # Verify CaseEvents
        assert len(case.events) >= 1
        assert any(e.event_type == "SUBMITTED" for e in case.events)

        # Verify AuditLog
        audit_entry = db.query(AuditLog).filter(
            AuditLog.entity_id == complaint_id,
            AuditLog.event_type == "GRIEVANCE_FILED"
        ).first()
        assert audit_entry is not None
        assert audit_entry.actor_role == "complainant"

        # Verify Notification
        notif = db.query(Notification).filter(
            Notification.related_case_id == complaint_id,
            Notification.complainant_id == case.complainant_id
        ).first()
        assert notif is not None
        assert notif.is_read is False
    finally:
        db.close()


# -------------------------------------------------------------------------
# 13. Official Acknowledgment Receipt
# -------------------------------------------------------------------------
def test_complainant_statutory_receipt():
    headers, citizen = get_citizen_auth_headers("rcpt")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Withheld Original Certificates",
        "category": "Administrative Issues",
        "description": "College refuses to return B.Tech degree certificates after graduation."
    }, headers=headers)
    complaint_id = file_res.json()["id"]

    receipt_res = client.get(f"/api/complainant/complaints/{complaint_id}/receipt", headers=headers)
    assert receipt_res.status_code == 200
    receipt = receipt_res.json()
    assert receipt["case_id"] == complaint_id
    assert receipt["complainant_name"] == citizen["full_name"]
    assert "permanent_id" in receipt
    assert "institution_address" in receipt
    assert receipt["status"] == "Submitted"
    assert receipt["tracking_url"] == f"/complainant/cases/{complaint_id}"


# -------------------------------------------------------------------------
# 14. Officer Status Progression & Automated Citizen Notification Dispatch
# -------------------------------------------------------------------------
def test_officer_status_update_and_citizen_notification():
    headers, citizen = get_citizen_auth_headers("notif_track")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    # 1. Citizen lodges complaint
    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Unauthorized Examination Fee Demand",
        "category": "Examination and Results",
        "description": "Institute is demanding extra cash fees for issuing semester exam admit card."
    }, headers=headers)
    assert file_res.status_code == 201
    complaint_id = file_res.json()["id"]

    # 2. Officer logs in
    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert off_login.status_code == 200
    officer_token = off_login.json()["access_token"]
    off_headers = {"Authorization": f"Bearer {officer_token}"}

    # 3. Officer locates complaint using citizen_only filter
    cases_res = client.get(f"/api/cases?citizen_only=true&q={complaint_id}", headers=off_headers)
    assert cases_res.status_code == 200
    matched = cases_res.json()
    assert len(matched) >= 1
    assert matched[0]["id"] == complaint_id
    assert matched[0]["is_citizen_complaint"] is True

    # 4. Officer updates status: Submitted -> Under Review
    patch_res = client.patch(f"/api/cases/{complaint_id}", json={
        "status": "Under Review",
        "remarks": "PGRC Regulatory Scrutiny initiated by Bureau Officer"
    }, headers=off_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Under Review"

    # 5. Citizen fetches notifications and verifies update alert received
    notifs_res = client.get("/api/complainant/notifications", headers=headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert len(notifs) >= 1
    review_notif = next((n for n in notifs if n["related_case_id"] == complaint_id and "Under Review" in n["title"]), None)
    assert review_notif is not None
    assert review_notif["severity"] == "Info"

    # 6. Citizen verifies public status timeline includes the milestone
    hist_res = client.get(f"/api/complainant/complaints/{complaint_id}/history", headers=headers)
    assert hist_res.status_code == 200
    events = hist_res.json()
    assert any(e["event_type"] == "STATUS_CHANGE" and e["new_value"] == "Under Review" for e in events)


# -------------------------------------------------------------------------
# 15. Additional Information Request & Clarification Workflow
# -------------------------------------------------------------------------
def test_officer_request_additional_information_and_citizen_clarification():
    headers, citizen = get_citizen_auth_headers("clarify")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    # 1. Lodge complaint
    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Lab Fee Overcharge Without Facilities",
        "category": "Fees and Financial Issues",
        "description": "Students charged specialized computer lab fees, but labs remain locked."
    }, headers=headers)
    complaint_id = file_res.json()["id"]

    # 2. Officer login
    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    off_headers = {"Authorization": f"Bearer {off_login.json()['access_token']}"}

    # 3. Transition: Submitted -> Under Review
    client.patch(f"/api/cases/{complaint_id}", json={"status": "Under Review"}, headers=off_headers)

    # 4. Officer transitions: Under Review -> Additional Information Required
    request_remarks = "Please attach copy of semester fee receipt and specify lab room numbers."
    info_req_res = client.patch(f"/api/cases/{complaint_id}", json={
        "status": "Additional Information Required",
        "remarks": request_remarks
    }, headers=off_headers)
    assert info_req_res.status_code == 200
    assert info_req_res.json()["status"] == "Additional Information Required"

    # 5. Citizen receives high-severity notification
    notifs = client.get("/api/complainant/notifications", headers=headers).json()
    req_notif = next((n for n in notifs if n["related_case_id"] == complaint_id and n["notification_type"] == "INFO_REQUESTED"), None)
    assert req_notif is not None
    assert req_notif["severity"] == "High"
    assert "Action Required" in req_notif["title"]

    # 6. IDOR protection: Another citizen cannot submit clarification for this complaint
    other_headers, _ = get_citizen_auth_headers("other_clarify")
    idor_res = client.post(f"/api/complainant/complaints/{complaint_id}/clarification", json={
        "response_text": "Unauthorized clarification attempt by another user."
    }, headers=other_headers)
    assert idor_res.status_code == 404

    # 7. Citizen uploads supplementary document first
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    doc_res = client.post(
        f"/api/complainant/complaints/{complaint_id}/documents",
        files={"file": ("fee_receipt_sem5.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"category": "Fee Receipt / Bank Proof"},
        headers=headers
    )
    assert doc_res.status_code == 201
    doc_id = doc_res.json()["id"]

    # 8. Citizen submits valid clarification with document_id
    clarify_res = client.post(f"/api/complainant/complaints/{complaint_id}/clarification", json={
        "response_text": "Attached fee receipt for Semester 5 (Rs. 15,000 lab fee). The affected computer labs are Rooms 304 and 305.",
        "document_id": doc_id
    }, headers=headers)
    assert clarify_res.status_code == 200
    updated_complaint = clarify_res.json()
    # Status automatically transitioned back to Under Review
    assert updated_complaint["status"] == "Under Review"

    # 9. Verify clarification appears on public timeline
    history = client.get(f"/api/complainant/complaints/{complaint_id}/history", headers=headers).json()
    clarify_event = next((e for e in history if e["event_type"] == "CLARIFICATION_SUBMITTED"), None)
    assert clarify_event is not None
    assert "Rooms 304 and 305" in clarify_event["remarks"]


# -------------------------------------------------------------------------
# 16. Disallowed Status Transitions & Security Rejection
# -------------------------------------------------------------------------
def test_disallowed_status_transitions_and_role_protection():
    headers, _ = get_citizen_auth_headers("invalid_status")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Arbitrary Fine Imposed",
        "category": "Administrative Issues",
        "description": "Hostel warden imposed unauthorized fine."
    }, headers=headers)
    complaint_id = file_res.json()["id"]

    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    off_headers = {"Authorization": f"Bearer {off_login.json()['access_token']}"}

    # A. Invalid transition: Submitted -> Resolved directly without scrutiny/review
    bad_transition = client.patch(f"/api/cases/{complaint_id}", json={
        "status": "Resolved"
    }, headers=off_headers)
    assert bad_transition.status_code == 400
    assert "invalid status transition" in bad_transition.json()["detail"].lower()

    # B. Complainant token cannot call officer PATCH endpoint
    comp_tamper = client.patch(f"/api/cases/{complaint_id}", json={
        "status": "Resolved"
    }, headers=headers)
    assert comp_tamper.status_code in [401, 403]

    # C. Complainant cannot call clarification when complaint is NOT in 'Additional Information Required'
    premature_clarify = client.post(f"/api/complainant/complaints/{complaint_id}/clarification", json={
        "response_text": "Trying to clarify while complaint is still in Submitted status."
    }, headers=headers)
    assert premature_clarify.status_code == 400
    assert "additional information required" in premature_clarify.json()["detail"].lower()


# -------------------------------------------------------------------------
# 17. Confidential Internal Notes Filtered from Public Timeline
# -------------------------------------------------------------------------
def test_confidential_officer_notes_filtered_from_public_timeline():
    headers, _ = get_citizen_auth_headers("leak_check")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Confidentiality Audit Complaint",
        "category": "Harassment and Discrimination",
        "description": "Sensitive allegation requiring confidential inquiry."
    }, headers=headers)
    complaint_id = file_res.json()["id"]

    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    off_headers = {"Authorization": f"Bearer {off_login.json()['access_token']}"}

    # Officer records a confidential internal note
    note_res = client.post(f"/api/cases/{complaint_id}/notes", json={
        "remarks": "CONFIDENTIAL_INVESTIGATION_NOTE: Subject institution under vigilance investigation; high corruption risk.",
        "is_public": False
    }, headers=off_headers)
    assert note_res.status_code == 200

    # 1. Officer case detail sees the event
    off_detail = client.get(f"/api/cases/{complaint_id}", headers=off_headers).json()
    assert any("CONFIDENTIAL_INVESTIGATION_NOTE" in e.get("remarks", "") for e in off_detail["events"])

    # 2. Citizen complaint detail MUST NOT see the confidential note
    citizen_detail = client.get(f"/api/complainant/complaints/{complaint_id}", headers=headers).json()
    for ev in citizen_detail.get("events", []):
        assert "CONFIDENTIAL_INVESTIGATION_NOTE" not in ev.get("remarks", "")
        assert ev.get("event_type") != "INTERNAL_NOTE"

    # 3. Citizen public timeline MUST NOT see the confidential note
    citizen_hist = client.get(f"/api/complainant/complaints/{complaint_id}/history", headers=headers).json()
    for ev in citizen_hist:
        assert "CONFIDENTIAL_INVESTIGATION_NOTE" not in ev.get("remarks", "")
        assert ev.get("event_type") != "INTERNAL_NOTE"


# -------------------------------------------------------------------------
# 18. Citizen Notification Management (Read, Mark-All-Read, Unread-Count)
# -------------------------------------------------------------------------
def test_complainant_notification_management():
    headers, citizen = get_citizen_auth_headers("notif_mgmt")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    # File complaint to generate initial submission notification
    client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Notification Testing Complaint",
        "category": "Academic Issues",
        "description": "Checking unread counts and read receipts."
    }, headers=headers)

    # 1. Check unread count
    count_res = client.get("/api/complainant/notifications/unread-count", headers=headers)
    assert count_res.status_code == 200
    initial_unread = count_res.json()["unread_count"]
    assert initial_unread >= 1

    # 2. List notifications
    notifs = client.get("/api/complainant/notifications", headers=headers).json()
    assert len(notifs) >= 1
    target_notif_id = notifs[0]["id"]

    # 3. Mark single notification as read
    mark_one = client.patch(f"/api/complainant/notifications/{target_notif_id}/read", headers=headers)
    assert mark_one.status_code == 200

    # 4. Mark all notifications as read
    mark_all = client.patch("/api/complainant/notifications/mark-all-read", headers=headers)
    assert mark_all.status_code == 200

    # 5. Verify unread count is now 0
    after_count = client.get("/api/complainant/notifications/unread-count", headers=headers).json()
    assert after_count["unread_count"] == 0

    # 6. IDOR protection: Other complainant cannot mark this notification read
    other_headers, _ = get_citizen_auth_headers("other_notif")
    idor_notif = client.patch(f"/api/complainant/notifications/{target_notif_id}/read", headers=other_headers)
    assert idor_notif.status_code == 404


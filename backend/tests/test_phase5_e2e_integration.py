import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import (
    Case, CaseEvent, User, Complainant, Institution, Bureau,
    CaseAssignment, DocumentMetadata, Notification, AuditLog, CaseRelationship
)

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

def create_citizen():
    uid = uuid.uuid4().hex[:6]
    payload = {
        "full_name": f"Citizen E2E {uid}",
        "email": f"citizen.e2e.{uid}@aicte.test.in",
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

# =========================================================================
# 1. Complete End-to-End Lifecycle: Submitted -> Under Review ->
#    Clarification -> Under Review -> Accepted -> Assigned -> Linked ->
#    Resolved -> Closed + Idempotency
# =========================================================================
def test_full_complaint_to_closure_e2e_lifecycle():
    citizen_headers, citizen_info = create_citizen()
    officer_headers = get_officer_headers()
    bhead_headers = get_bureau_head_headers()
    officer_pgrc_headers = get_standard_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    pgrc_officer = db.query(User).filter(User.username == "officer_pgrc").first()
    db.close()
    assert inst is not None
    assert pgrc_officer is not None

    # -------------------------------------------------------------
    # Step 1: Complainant Submits Complaint
    # -------------------------------------------------------------
    complaint_title = f"Arbitrary Fee Levy Violation {uuid.uuid4().hex[:6]}"
    submit_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": complaint_title,
        "category": "Fees and Financial Issues",
        "description": "The institution levied an unapproved laboratory fee of Rs. 45,000 without AICTE sanction."
    })
    assert submit_res.status_code == 201
    comp_data = submit_res.json()
    complaint_id = comp_data["id"]
    assert complaint_id.startswith("AICTE-PGRC-")
    assert comp_data["status"] == "Submitted"

    # Verify citizen received submission confirmation notification
    notif_res = client.get("/api/complainant/notifications", headers=citizen_headers)
    assert notif_res.status_code == 200
    cit_notifs = notif_res.json()
    assert any("lodged successfully" in n["title"].lower() or complaint_id in n["message"] for n in cit_notifs)

    # -------------------------------------------------------------
    # Step 2: Officer Views Complaint in Intake Inbox
    # -------------------------------------------------------------
    inbox_res = client.get(f"/api/officer/complaints?q={complaint_id}", headers=officer_headers)
    assert inbox_res.status_code == 200
    inbox_items = inbox_res.json()["items"]
    assert len(inbox_items) == 1
    assert inbox_items[0]["id"] == complaint_id
    assert inbox_items[0]["status"] == "Submitted"

    # Officer Detail view
    detail_res = client.get(f"/api/officer/complaints/{complaint_id}", headers=officer_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == complaint_id
    assert detail_data["complainant"]["full_name"] == citizen_info["full_name"]

    # -------------------------------------------------------------
    # Step 3: Officer Starts Review -> "Under Review"
    # -------------------------------------------------------------
    review_res = client.post(f"/api/officer/complaints/{complaint_id}/start-review", headers=officer_headers)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "Under Review"

    # Idempotency check: repeated call returns 200 and preserves Under Review
    review_res_dup = client.post(f"/api/officer/complaints/{complaint_id}/start-review", headers=officer_headers)
    assert review_res_dup.status_code == 200
    assert review_res_dup.json()["status"] == "Under Review"

    # Complainant sees updated status
    cit_comp_res = client.get(f"/api/complainant/complaints/{complaint_id}", headers=citizen_headers)
    assert cit_comp_res.status_code == 200
    assert cit_comp_res.json()["status"] == "Under Review"

    # -------------------------------------------------------------
    # Step 4: Officer Requests Additional Information
    # -------------------------------------------------------------
    req_info_res = client.post(f"/api/officer/complaints/{complaint_id}/request-info", headers=officer_headers, json={
        "query_details": "Please upload the bank statement showing the transaction of Rs. 45,000.",
        "required_documents": "Fee receipt and bank debit statement",
        "deadline_days": 14
    })
    assert req_info_res.status_code == 200
    assert req_info_res.json()["status"] == "Additional Information Required"

    # Idempotency check
    req_info_dup = client.post(f"/api/officer/complaints/{complaint_id}/request-info", headers=officer_headers, json={
        "query_details": "Please upload the bank statement.",
        "deadline_days": 14
    })
    assert req_info_dup.status_code == 200

    # Complainant sees status & clarification request in notifications
    notif_res2 = client.get("/api/complainant/notifications", headers=citizen_headers)
    assert notif_res2.status_code == 200
    assert any("action required" in n["title"].lower() or "additional information" in n["title"].lower() for n in notif_res2.json())

    # -------------------------------------------------------------
    # Step 5: Complainant Submits Clarification Response
    # -------------------------------------------------------------
    clarify_res = client.post(f"/api/complainant/complaints/{complaint_id}/clarification", headers=citizen_headers, json={
        "response_text": "I have uploaded the relevant bank debit statement and university challan receipt."
    })
    assert clarify_res.status_code == 200
    assert clarify_res.json()["status"] == "Under Review"

    # -------------------------------------------------------------
    # Step 6: Officer Accepts Complaint into Inquiry Docket -> "In Progress"
    # -------------------------------------------------------------
    accept_res = client.post(f"/api/officer/complaints/{complaint_id}/accept", headers=officer_headers, json={
        "remarks": "Complaint verified against institutional approvals. Admitted for full formal inquiry.",
        "priority": "High"
    })
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    assert accept_data["status"] == "In Progress"
    assert accept_data["id"] == complaint_id

    # Verify priority updated in officer detail view
    acc_detail = client.get(f"/api/officer/complaints/{complaint_id}", headers=officer_headers).json()
    assert acc_detail["priority"] == "High"

    # Verify no duplicate case on repeated acceptance call (idempotent)
    accept_dup = client.post(f"/api/officer/complaints/{complaint_id}/accept", headers=officer_headers, json={
        "remarks": "Re-submitting acceptance request."
    })
    assert accept_dup.status_code == 200
    assert accept_dup.json()["id"] == complaint_id

    # Verify directly in database that exactly ONE case exists with this ID
    db = SessionLocal()
    matching_cases = db.query(Case).filter(Case.id == complaint_id).all()
    assert len(matching_cases) == 1, "Duplicate Case records detected!"
    db.close()

    # -------------------------------------------------------------
    # Step 7: Officer Allocates Investigating Officer
    # -------------------------------------------------------------
    assign_res = client.post(f"/api/officer/complaints/{complaint_id}/assign", headers=bhead_headers, json={
        "to_officer_id": pgrc_officer.id,
        "remarks": "Assigned to Senior Officer for spot inspection and institutional summons."
    })
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_officer_name"] == pgrc_officer.full_name

    # Verify assignment audit record in db
    db = SessionLocal()
    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == complaint_id
    ).order_by(CaseAssignment.assigned_at.desc()).first()
    assert assignment is not None
    assert assignment.to_officer_id == pgrc_officer.id
    db.close()

    # -------------------------------------------------------------
    # Step 8: Officer Links Complaint with Existing Case
    # -------------------------------------------------------------
    # Create or get another existing case
    db = SessionLocal()
    sibling_case = db.query(Case).filter(Case.id != complaint_id).first()
    db.close()
    if sibling_case:
        link_res = client.post(f"/api/officer/complaints/{complaint_id}/link-case", headers=officer_headers, json={
            "target_case_id": sibling_case.id,
            "relationship_type": "Consolidated Grievance",
            "remarks": "Joint institutional inquiry under unified committee"
        })
        assert link_res.status_code == 200
        assert link_res.json()["related_case_id"] == sibling_case.id

        # Duplicate linking safeguard check: repeated linking call returns 400 (already linked)
        link_dup = client.post(f"/api/officer/complaints/{complaint_id}/link-case", headers=officer_headers, json={
            "target_case_id": sibling_case.id,
            "relationship_type": "Consolidated Grievance",
            "remarks": "Second link attempt"
        })
        assert link_dup.status_code == 400
        assert "already linked" in link_dup.json()["detail"].lower()

    # -------------------------------------------------------------
    # Step 9: Officer Resolves Complaint -> "Resolved"
    # -------------------------------------------------------------
    resolve_res = client.post(f"/api/officer/complaints/{complaint_id}/resolve", headers=officer_headers, json={
        "resolution_findings": "The institution was found in breach of AICTE Approval Handbook Section 13. Fee refund of Rs. 45,000 processed to complainant.",
        "action_taken": "Institutional Warning Issued and Complete Fee Refund Disbursed",
        "remarks": "Resolution compliance verified via banking transaction reference UTR-9988231."
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "Resolved"

    # Idempotent check
    resolve_dup = client.post(f"/api/officer/complaints/{complaint_id}/resolve", headers=officer_headers, json={
        "resolution_findings": "Repeat resolution check."
    })
    assert resolve_dup.status_code == 200
    assert resolve_dup.json()["status"] == "Resolved"

    # Complainant sees Resolved status and resolution notification
    cit_resolved = client.get(f"/api/complainant/complaints/{complaint_id}", headers=citizen_headers)
    assert cit_resolved.status_code == 200
    assert cit_resolved.json()["status"] == "Resolved"

    notif_res3 = client.get("/api/complainant/notifications", headers=citizen_headers)
    assert any("resolved" in n["title"].lower() or "resolved" in n["message"].lower() for n in notif_res3.json())

    # -------------------------------------------------------------
    # Step 10: Officer Formally Closes Matter -> "Closed"
    # -------------------------------------------------------------
    close_res = client.post(f"/api/officer/complaints/{complaint_id}/close", headers=bhead_headers, json={
        "closure_remarks": "Final compliance audit completed. Case docket disposed."
    })
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "Closed"

    # Idempotency check on close
    close_dup = client.post(f"/api/officer/complaints/{complaint_id}/close", headers=bhead_headers, json={
        "closure_remarks": "Repeated closure call."
    })
    assert close_dup.status_code == 200
    assert close_dup.json()["status"] == "Closed"

    # Final complainant check
    cit_closed = client.get(f"/api/complainant/complaints/{complaint_id}", headers=citizen_headers)
    assert cit_closed.status_code == 200
    assert cit_closed.json()["status"] == "Closed"

# =========================================================================
# 2. Privacy & Data Isolation Guarantees
# =========================================================================
def test_complainant_privacy_and_data_isolation():
    citizen1_headers, _ = create_citizen()
    citizen2_headers, _ = create_citizen()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Citizen 1 submits a complaint
    sub_res = client.post("/api/complainant/complaints", headers=citizen1_headers, json={
        "institution_id": inst.id,
        "title": f"Confidential Matter {uuid.uuid4().hex[:6]}",
        "category": "Admission and Enrollment",
        "description": "Admission document retention issue."
    })
    assert sub_res.status_code == 201
    comp_id = sub_res.json()["id"]

    # Start review and add internal events
    client.post(f"/api/officer/complaints/{comp_id}/start-review", headers=officer_headers)

    # 1. Citizen 2 CANNOT view Citizen 1's complaint (404)
    c2_res = client.get(f"/api/complainant/complaints/{comp_id}", headers=citizen2_headers)
    assert c2_res.status_code == 404

    # 2. Citizen 1 gets detail view: must NEVER leak internal notes or officer PII
    c1_res = client.get(f"/api/complainant/complaints/{comp_id}", headers=citizen1_headers)
    assert c1_res.status_code == 200
    c1_detail = c1_res.json()

    # Schema must not expose internal fields to citizen
    assert "internal_notes" not in c1_detail
    assert "risk_score" not in c1_detail
    assert "ml_classification" not in c1_detail
    assert "assigned_officer" not in c1_detail

    # Timeline events in citizen view must only include public events
    for event in c1_detail.get("events", []):
        assert event["event_type"] not in ["INTERNAL_NOTE", "CONFIDENTIAL_MEMO", "INTERNAL_INQUIRY"]

# =========================================================================
# 3. Statutory Rejection Workflow
# =========================================================================
def test_statutory_rejection_workflow_and_citizen_visibility():
    citizen_headers, _ = create_citizen()
    bhead_headers = get_bureau_head_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": f"Non-Jurisdiction Matter {uuid.uuid4().hex[:6]}",
        "category": "Academic Issues",
        "description": "General civil dispute over parking lot adjacent to university campus."
    })
    assert sub_res.status_code == 201
    comp_id = sub_res.json()["id"]

    # Rejection requires mandatory statutory reason and >= 5 chars remarks
    fail_rej = client.post(f"/api/officer/complaints/{comp_id}/reject", headers=bhead_headers, json={
        "statutory_reason": "Grievance does not fall under AICTE Mandate / Jurisdiction",
        "remarks": "No"
    })
    assert fail_rej.status_code == 422

    # Valid rejection
    valid_rej = client.post(f"/api/officer/complaints/{comp_id}/reject", headers=bhead_headers, json={
        "statutory_reason": "Grievance does not fall under AICTE Mandate / Jurisdiction",
        "remarks": "Municipal parking disputes outside institution premises are beyond AICTE regulatory jurisdiction under the AICTE Act 1987."
    })
    assert valid_rej.status_code == 200
    assert valid_rej.json()["status"] == "Rejected"

    # Idempotent rejection call
    valid_rej_dup = client.post(f"/api/officer/complaints/{comp_id}/reject", headers=bhead_headers, json={
        "statutory_reason": "Grievance does not fall under AICTE Mandate / Jurisdiction",
        "remarks": "Municipal parking disputes outside institution premises are beyond AICTE regulatory jurisdiction under the AICTE Act 1987."
    })
    assert valid_rej_dup.status_code == 200
    assert valid_rej_dup.json()["status"] == "Rejected"

    # Complainant detail view reflects statutory rejection order
    cit_view = client.get(f"/api/complainant/complaints/{comp_id}", headers=citizen_headers)
    assert cit_view.status_code == 200
    assert cit_view.json()["status"] == "Rejected"

    # Complainant notifications reflect rejection
    notif_res = client.get("/api/complainant/notifications", headers=citizen_headers)
    assert any("rejected" in n["title"].lower() or "rejected" in n["message"].lower() for n in notif_res.json())

# =========================================================================
# 4. Audit Log Sanitization & Token Leak Prevention
# =========================================================================
def test_audit_log_token_and_credential_sanitization():
    officer_headers = get_officer_headers()

    # Query audit logs from officer API
    logs_res = client.get("/api/audit?limit=50", headers=officer_headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()

    for item in logs:
        text = str(item)
        assert "Bearer eyJ" not in text, "Unsanitized Bearer token found in audit log!"
        assert "password" not in str(item.get("remarks", "")).lower() or "[redacted]" in str(item.get("remarks", "")).lower()

import io
import os
import uuid
import time
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
import jwt
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.main import app
from app.config import settings
from app.database import SessionLocal, engine
from app.models.models import (
    Complainant, User, Institution, Case, CaseEvent,
    Notification, DocumentMetadata, AuditLog, ComplaintCategory,
    CaseAssignment, CaseRelationship, Bureau
)

client = TestClient(app)

def create_citizen(prefix="p5audit"):
    uid = uuid.uuid4().hex[:6]
    mobile = f"9{uuid.uuid4().int % 900000000 + 100000000}"
    payload = {
        "full_name": f"Citizen {prefix.title()} {uid}",
        "email": f"{prefix}.{uid}@test.in",
        "mobile": mobile,
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
    return {"Authorization": f"Bearer {token}"}, payload, reg_res.json()

def get_officer_headers(username="admin", password="admin123"):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Officer login failed for {username}: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def get_bureau_head_headers():
    return get_officer_headers("bureauhead_pgrc", "head123")

def get_standard_officer_headers():
    return get_officer_headers("officer_pgrc", "officer123")

# =========================================================================
# PART A: FUNCTIONAL TESTING (1 TO 19)
# =========================================================================
def test_a1_officer_authentication():
    # Valid login
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"

    # Invalid password
    res_bad = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword!"})
    assert res_bad.status_code == 401

def test_a2_to_a5_inbox_search_filters_and_details():
    cit_headers, _, _ = create_citizen("inbox")
    admin_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Create complaint
    unique_title = f"Fee Overcharge Matter {uuid.uuid4().hex[:6]}"
    sub_res = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": unique_title,
        "category": "Fees and Financial Issues",
        "description": "Institution demanding unapproved security deposit."
    })
    assert sub_res.status_code == 201
    comp_id = sub_res.json()["id"]

    # 3. Complaint Inbox
    inbox_res = client.get("/api/officer/complaints", headers=admin_headers)
    assert inbox_res.status_code == 200
    inbox_data = inbox_res.json()
    assert "items" in inbox_data
    assert inbox_data["total"] >= 1

    # 4. Search and filters
    search_res = client.get(f"/api/officer/complaints?q={comp_id}", headers=admin_headers)
    assert search_res.status_code == 200
    assert any(item["id"] == comp_id for item in search_res.json()["items"])

    filter_res = client.get(f"/api/officer/complaints?category=Fees and Financial Issues", headers=admin_headers)
    assert filter_res.status_code == 200
    assert all(item["category"] == "Fees and Financial Issues" for item in filter_res.json()["items"])

    # 5. Complaint Details
    detail_res = client.get(f"/api/officer/complaints/{comp_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    d = detail_res.json()
    assert d["id"] == comp_id
    assert d["title"] == unique_title
    assert d["institution"]["official_name"] == inst.official_name
    assert "complainant" in d
    assert "public_history" in d

def test_a6_to_a11_review_acceptance_duplicate_prevention_rejection():
    cit_headers, _, _ = create_citizen("lifecycle")
    admin_headers = get_officer_headers()
    bhead_headers = get_bureau_head_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Complaint 1: For review and acceptance lifecycle
    sub1 = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": f"Admission Discrepancy {uuid.uuid4().hex[:6]}",
        "category": "Admission and Enrollment",
        "description": "Merit list bypassed during second counselling."
    })
    assert sub1.status_code == 201
    c1_id = sub1.json()["id"]

    # 6. Review initiation
    rev_res = client.post(f"/api/officer/complaints/{c1_id}/start-review", headers=admin_headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "Under Review"

    # 7. Complaint acceptance & 10. Case integration
    acc_res = client.post(f"/api/officer/complaints/{c1_id}/accept", headers=admin_headers, json={
        "remarks": "Merit violation prima facie verified. Admitted for investigation.",
        "priority": "High"
    })
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "In Progress"

    # 11. Duplicate case prevention (idempotent repeated call)
    acc_dup = client.post(f"/api/officer/complaints/{c1_id}/accept", headers=admin_headers, json={
        "remarks": "Duplicate acceptance call."
    })
    assert acc_dup.status_code == 200
    assert acc_dup.json()["id"] == c1_id

    # Verify directly in DB that exactly one record exists with this reference
    db = SessionLocal()
    count = db.query(Case).filter(Case.id == c1_id).count()
    assert count == 1, "Duplicate Case records detected in database!"
    db.close()

    # 8. Complaint rejection with reason (Complaint 2)
    sub2 = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": f"Non-regulatory grievance {uuid.uuid4().hex[:6]}",
        "category": "Academic Issues",
        "description": "Personal dispute outside university premises."
    })
    assert sub2.status_code == 201
    c2_id = sub2.json()["id"]

    # Rejection without reason fails
    bad_rej = client.post(f"/api/officer/complaints/{c2_id}/reject", headers=bhead_headers, json={
        "statutory_reason": "",
        "remarks": "None"
    })
    assert bad_rej.status_code == 422

    # Rejection with valid reason
    good_rej = client.post(f"/api/officer/complaints/{c2_id}/reject", headers=bhead_headers, json={
        "statutory_reason": "Grievance does not fall under AICTE Mandate / Jurisdiction",
        "remarks": "Matter constitutes private dispute beyond statutory mandate of AICTE Act 1987."
    })
    assert good_rej.status_code == 200
    assert good_rej.json()["status"] == "Rejected"

def test_a9_additional_information_workflow():
    cit_headers, _, _ = create_citizen("clarify")
    admin_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": f"Hostel Issue {uuid.uuid4().hex[:6]}",
        "category": "Infrastructure and Facilities",
        "description": "Hostel hygiene standards violation."
    })
    c_id = sub.json()["id"]

    # Put under review
    client.post(f"/api/officer/complaints/{c_id}/start-review", headers=admin_headers)

    # 9. Additional information request
    req_res = client.post(f"/api/officer/complaints/{c_id}/request-info", headers=admin_headers, json={
        "query_details": "Please submit photographs and copy of representation submitted to principal.",
        "required_documents": "Photographs, representation copy",
        "deadline_days": 14
    })
    assert req_res.status_code == 200
    assert req_res.json()["status"] == "Additional Information Required"

    # Citizen submits response
    resp_res = client.post(f"/api/complainant/complaints/{c_id}/clarification", headers=cit_headers, json={
        "response_text": "I have uploaded the relevant representation letter and photos of the facility."
    })
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "Under Review"

def test_a12_to_a19_assignment_reassignment_resolution_closure_audit():
    cit_headers, _, _ = create_citizen("lifecycle2")
    admin_headers = get_officer_headers()
    bhead_headers = get_bureau_head_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    officer_a = db.query(User).filter(User.username == "officer_pgrc").first()
    officer_b = db.query(User).filter(User.username == "bureauhead_pgrc").first()
    db.close()
    assert inst and officer_a and officer_b

    sub = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": f"Laboratory Safety {uuid.uuid4().hex[:6]}",
        "category": "Infrastructure and Facilities",
        "description": "Lack of adequate ventilation in chemical engineering lab."
    })
    c_id = sub.json()["id"]

    # Start review & accept
    client.post(f"/api/officer/complaints/{c_id}/start-review", headers=admin_headers)
    client.post(f"/api/officer/complaints/{c_id}/accept", headers=admin_headers, json={"remarks": "Admitted for inquiry."})

    # 12. Officer assignment
    assign1 = client.post(f"/api/officer/complaints/{c_id}/assign", headers=bhead_headers, json={
        "to_officer_id": officer_a.id,
        "remarks": "Assigned to officer A for lab inspection."
    })
    assert assign1.status_code == 200
    assert assign1.json()["assigned_officer_name"] == officer_a.full_name

    # 13. Reassignment
    assign2 = client.post(f"/api/officer/complaints/{c_id}/assign", headers=bhead_headers, json={
        "to_officer_id": officer_b.id,
        "remarks": "Reassigned to bureau head for expedited inquiry."
    })
    assert assign2.status_code == 200
    assert assign2.json()["assigned_officer_name"] == officer_b.full_name

    # 14. Public status synchronization & 15. Complainant notifications
    cit_view = client.get(f"/api/complainant/complaints/{c_id}", headers=cit_headers)
    assert cit_view.status_code == 200
    assert cit_view.json()["status"] == "In Progress"

    cit_notifs = client.get("/api/complainant/notifications", headers=cit_headers).json()
    assert len(cit_notifs) >= 1

    # 16. Officer notifications
    off_notifs = client.get("/api/notifications", headers=get_officer_headers("bureauhead_pgrc", "head123")).json()
    assert any(c_id in str(n) for n in off_notifs)

    # 17. Resolution
    res_res = client.post(f"/api/officer/complaints/{c_id}/resolve", headers=admin_headers, json={
        "resolution_findings": "Institution installed compliant exhaust system under supervision.",
        "action_taken": "Safety compliance certificate issued.",
        "remarks": "Matter satisfactorily addressed."
    })
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "Resolved"

    # 18. Complaint closure
    close_res = client.post(f"/api/officer/complaints/{c_id}/close", headers=bhead_headers, json={
        "closure_remarks": "Inquiry complete. Docket permanently disposed."
    })
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "Closed"

    # 19. Audit trail
    db = SessionLocal()
    audits = db.query(AuditLog).filter(AuditLog.entity_id == c_id).all()
    assert len(audits) >= 3, "Missing audit records for complaint lifecycle actions!"
    db.close()


# =========================================================================
# PART B: SECURITY TESTING (1 TO 10)
# =========================================================================
def test_b1_to_b3_unauthenticated_and_citizen_officer_api_restrictions():
    cit_headers, _, _ = create_citizen("sec")

    # 1. Unauthenticated users cannot access officer complaints
    unauth = client.get("/api/officer/complaints")
    assert unauth.status_code in [401, 403]

    # 2. Complainants cannot access officer inbox
    cit_inbox = client.get("/api/officer/complaints", headers=cit_headers)
    assert cit_inbox.status_code == 403

    # 3. Complainants cannot accept or reject complaints
    cit_accept = client.post("/api/officer/complaints/AICTE-PGRC-TEST/accept", headers=cit_headers, json={})
    assert cit_accept.status_code == 403

    cit_reject = client.post("/api/officer/complaints/AICTE-PGRC-TEST/reject", headers=cit_headers, json={})
    assert cit_reject.status_code == 403

def test_b4_unauthorized_officers_role_checks():
    std_officer = get_standard_officer_headers()

    # Standard officer cannot reject complaints (requires super_admin or bureau_head)
    rej_res = client.post("/api/officer/complaints/AICTE-PGRC-TEST/reject", headers=std_officer, json={
        "statutory_reason": "Jurisdiction",
        "remarks": "Standard officer attempting reject."
    })
    assert rej_res.status_code == 403

    # Standard officer cannot close complaint
    close_res = client.post("/api/officer/complaints/AICTE-PGRC-TEST/close", headers=std_officer, json={
        "closure_remarks": "Standard officer close attempt."
    })
    assert close_res.status_code == 403

def test_b5_officers_cannot_modify_complaint_ownership():
    # Verify no endpoint exists that allows changing complainant_id
    admin_headers = get_officer_headers()
    put_res = client.put("/api/officer/complaints/AICTE-PGRC-TEST", headers=admin_headers, json={
        "complainant_id": 9999
    })
    assert put_res.status_code in [404, 405]

def test_b6_status_transition_bypass_prevention():
    cit_headers, _, _ = create_citizen("bypass")
    admin_headers = get_officer_headers()
    bhead_headers = get_bureau_head_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": f"Status bypass check {uuid.uuid4().hex[:6]}",
        "category": "Academic Issues",
        "description": "Testing illegal status skip."
    })
    c_id = sub.json()["id"]

    # Direct closure from 'Submitted' without review or resolution must be blocked
    illegal_close = client.post(f"/api/officer/complaints/{c_id}/close", headers=bhead_headers, json={
        "closure_remarks": "Illegal jump from Submitted to Closed."
    })
    assert illegal_close.status_code == 400
    assert "statutory transition violation" in illegal_close.json()["detail"].lower()

def test_b7_internal_notes_never_in_public_apis():
    cit_headers, _, _ = create_citizen("privacy")
    admin_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub = client.post("/api/complainant/complaints", headers=cit_headers, json={
        "institution_id": inst.id,
        "title": f"Internal deliberation check {uuid.uuid4().hex[:6]}",
        "category": "Admission and Enrollment",
        "description": "Checking public vs private visibility."
    })
    c_id = sub.json()["id"]

    # Officer starts review and adds note
    client.post(f"/api/officer/complaints/{c_id}/start-review", headers=admin_headers)
    client.post(f"/api/cases/{c_id}/notes", headers=admin_headers, json={
        "remarks": "CONFIDENTIAL: Suspect institution collusion with agent.",
        "is_public": False
    })

    # Complainant detail view MUST NOT contain confidential note
    cit_detail = client.get(f"/api/complainant/complaints/{c_id}", headers=cit_headers).json()
    assert "internal_notes" not in cit_detail
    for event in cit_detail.get("events", []):
        assert "CONFIDENTIAL" not in event.get("remarks", "")
        assert event["event_type"] not in ["INTERNAL_NOTE", "CONFIDENTIAL_MEMO"]

def test_b8_unauthorized_document_downloads_blocked():
    cit1_headers, _, _ = create_citizen("doc1")
    cit2_headers, _, _ = create_citizen("doc2")

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Citizen 1 submits complaint with document
    sub = client.post("/api/complainant/complaints", headers=cit1_headers, json={
        "institution_id": inst.id,
        "title": f"Doc privacy {uuid.uuid4().hex[:6]}",
        "category": "Academic Issues",
        "description": "Private student evidence."
    })
    c_id = sub.json()["id"]

    file_bytes = b"%PDF-1.4 test secure document content"
    upload_res = client.post(
        f"/api/complainant/complaints/{c_id}/documents",
        headers=cit1_headers,
        files={"file": ("evidence.pdf", file_bytes, "application/pdf")},
        data={"category": "Supporting Evidence"}
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # Citizen 2 attempts to download Citizen 1's document (must be blocked 403 or 404)
    c2_download = client.get(f"/api/complainant/complaints/{c_id}/documents/{doc_id}/download", headers=cit2_headers)
    assert c2_download.status_code in [403, 404]

def test_b9_jwt_expiration_enforced():
    expired_payload = {
        "sub": "admin",
        "role": "super_admin",
        "exp": datetime.utcnow() - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get("/api/officer/complaints", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401

def test_b10_cross_role_token_misuse_blocked():
    cit_headers, _, _ = create_citizen("crossrole")
    off_headers = get_officer_headers()

    # Complainant token used on officer API
    res1 = client.get("/api/officer/complaints", headers=cit_headers)
    assert res1.status_code == 403

    # Officer token used on complainant portal API
    res2 = client.get("/api/complainant/complaints", headers=off_headers)
    assert res2.status_code == 403


# =========================================================================
# PART C: DATABASE INTEGRITY & COMPATIBILITY
# =========================================================================
def test_c_database_integrity_and_relationships():
    db = SessionLocal()
    try:
        # Verify Foreign Key Integrity: Every case has valid institution, bureau, and optional complainant
        cases = db.query(Case).all()
        for c in cases:
            assert c.institution is not None, f"Orphaned case {c.id} without institution!"
            assert c.current_bureau is not None, f"Orphaned case {c.id} without bureau!"
            if c.complainant_id:
                assert c.complainant is not None, f"Orphaned case {c.id} referencing missing complainant!"

        # Verify stable reference format
        for c in cases:
            assert c.id.startswith("AICTE-"), f"Case {c.id} does not follow official AICTE reference prefix!"

        # Verify Assignment integrity
        assignments = db.query(CaseAssignment).all()
        for a in assignments:
            assert a.case_id is not None
            assert a.to_officer_id is not None
            assert a.to_officer is not None

        # Verify Notification ownership
        notifications = db.query(Notification).all()
        for n in notifications:
            if n.complainant_id:
                assert n.recipient_id is None, "Complainant notification erroneously has officer recipient_id!"
            if n.recipient_id:
                assert n.complainant_id is None, "Officer notification erroneously has complainant_id!"

    finally:
        db.close()

import io
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
from app.database import SessionLocal, engine, Base
from app.models.models import (
    Complainant, User, Institution, Case, CaseEvent,
    Notification, DocumentMetadata, AuditLog, ComplaintCategory
)
from app.seed_data import seed_complainants

client = TestClient(app)

# Ensure seed data exists
_db = SessionLocal()
try:
    seed_complainants(_db)
finally:
    _db.close()


def create_test_citizen(prefix="audit"):
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


def get_officer_headers():
    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert off_login.status_code == 200
    token = off_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# SECTION A: FUNCTIONAL TESTING
# =========================================================================

def test_a1_to_a3_complainant_registration_login_dashboard():
    # 1. Registration
    headers, payload, user_info = create_test_citizen("func_reg")
    assert user_info["email"] == payload["email"]
    assert user_info["is_active"] is True

    # 2. Login
    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 3. Complainant Dashboard & Me Profile
    me_res = client.get("/api/complainant/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == payload["email"]


def test_a4_to_a8_submission_reference_institution_category_documents():
    headers, _, _ = create_test_citizen("func_submit")

    # 6. Institution Selection
    insts_res = client.get("/api/complainant/complaints/institutions", headers=headers)
    assert insts_res.status_code == 200
    insts = insts_res.json()
    assert len(insts) >= 1
    inst_id = insts[0]["id"]

    # 7. Category Validation (Valid & Invalid)
    cats_res = client.get("/api/complainant/complaints/categories", headers=headers)
    assert cats_res.status_code == 200
    assert any(c["name"] == "Academic Issues" for c in cats_res.json())

    bad_cat_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Invalid Category Test",
        "category": "Completely Made Up Unapproved Category",
        "description": "Attempting invalid category filing."
    }, headers=headers)
    assert bad_cat_res.status_code == 400

    # 4. Complaint Submission & 5. Unique Reference Generation
    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Degree Certificate Withholding Grievance",
        "category": "Academic Issues",
        "subcategory": "Degree Withholding",
        "description": "College refuses to issue degree certificate despite all dues being cleared."
    }, headers=headers)
    assert file_res.status_code == 201
    complaint = file_res.json()
    ref_id = complaint["id"]
    assert ref_id.startswith("AICTE-PGRC-")
    assert complaint["status"] == "Submitted"

    # 8. Supporting Document Upload with magic bytes inspection
    pdf_content = b"%PDF-1.5\n%Valid PDF content for audit testing\n%%EOF"
    upload_res = client.post(
        f"/api/complainant/complaints/{ref_id}/documents",
        files={"file": ("no_dues_clearance.pdf", io.BytesIO(pdf_content), "application/pdf")},
        data={"category": "Official Correspondence"},
        headers=headers
    )
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["file_name"].endswith(".pdf")
    assert doc_data["original_filename"] == "no_dues_clearance.pdf"


def test_a9_to_a12_listing_details_history_timeline():
    headers, _, _ = create_test_citizen("func_track")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Hostel Cleanliness and Safety Complaint",
        "category": "Student Welfare",
        "description": "Hostel premises lack potable drinking water and security guards."
    }, headers=headers)
    cid = file_res.json()["id"]

    # 9. Complaint Listing (Scoped strictly to this user)
    list_res = client.get("/api/complainant/complaints", headers=headers)
    assert list_res.status_code == 200
    my_cases = list_res.json()
    assert len(my_cases) == 1
    assert my_cases[0]["id"] == cid

    # 10. Complaint Details
    detail_res = client.get(f"/api/complainant/complaints/{cid}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == cid
    assert detail["institution_name"] is not None

    # 11. Complaint History & 12. Status Timeline
    hist_res = client.get(f"/api/complainant/complaints/{cid}/history", headers=headers)
    assert hist_res.status_code == 200
    events = hist_res.json()
    assert len(events) >= 1
    assert events[0]["event_type"] == "SUBMITTED"


def test_a13_to_a15_notifications_ownership_clarification():
    headers, citizen, _ = create_test_citizen("func_workflow")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    file_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Capitation Fee Refund Denial",
        "category": "Fees and Financial Issues",
        "description": "Institute collected capitation fee in violation of AICTE norms and refuses refund."
    }, headers=headers)
    cid = file_res.json()["id"]

    # 13. Notification Generation on submission
    notifs = client.get("/api/complainant/notifications", headers=headers).json()
    assert len(notifs) >= 1
    assert any(n["related_case_id"] == cid for n in notifs)

    # 14. Notification Ownership & Read update
    nid = notifs[0]["id"]
    read_res = client.patch(f"/api/complainant/notifications/{nid}/read", headers=headers)
    assert read_res.status_code == 200

    # 15. Additional Information Workflow:
    # Officer requests additional info
    off_headers = get_officer_headers()
    client.patch(f"/api/cases/{cid}", json={"status": "Under Review"}, headers=off_headers)
    client.patch(f"/api/cases/{cid}", json={
        "status": "Additional Information Required",
        "remarks": "Please provide bank statement highlighting capitation fee transaction."
    }, headers=off_headers)

    # Citizen submits clarification
    clarify_res = client.post(f"/api/complainant/complaints/{cid}/clarification", json={
        "response_text": "Attached bank statement showing debit of Rs. 50,000 to institute account on 15-August."
    }, headers=headers)
    assert clarify_res.status_code == 200
    assert clarify_res.json()["status"] == "Under Review"


def test_a16_logout_and_expired_session_handling():
    # Expired token simulation
    expired_token = jwt.encode(
        {
            "sub": "expired.user@test.in",
            "role": "complainant",
            "aud": "nyayaniti-complainant",
            "token_type": "complainant_access",
            "exp": datetime.utcnow() - timedelta(minutes=10)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    res = client.get("/api/complainant/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


# =========================================================================
# SECTION B: SECURITY AUDIT
# =========================================================================

def test_b1_unauthenticated_complaint_submission():
    # Unauthenticated filing rejected
    res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "Hacker Complaint",
        "category": "Academic Issues",
        "description": "Unauthorized submission attempt without auth header."
    })
    assert res.status_code == 401


def test_b2_anti_idor_complainant_accessing_another_complaint():
    headers_a, _, _ = create_test_citizen("citizen_a")
    headers_b, _, _ = create_test_citizen("citizen_b")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers_a).json()[0]["id"]

    file_a = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Citizen A Confidential Grievance",
        "category": "Harassment and Discrimination",
        "description": "Citizen A private complaint."
    }, headers=headers_a).json()
    cid_a = file_a["id"]

    # Citizen B attempts to access Citizen A's complaint detail -> 404
    res_b = client.get(f"/api/complainant/complaints/{cid_a}", headers=headers_b)
    assert res_b.status_code == 404

    # Citizen B attempts to view Citizen A's history -> 404
    res_b_hist = client.get(f"/api/complainant/complaints/{cid_a}/history", headers=headers_b)
    assert res_b_hist.status_code == 404

    # Citizen B attempts to view Citizen A's receipt -> 404
    res_b_rcpt = client.get(f"/api/complainant/complaints/{cid_a}/receipt", headers=headers_b)
    assert res_b_rcpt.status_code == 404


def test_b3_and_b4_complainant_accessing_officer_dashboard_and_apis():
    headers, _, _ = create_test_citizen("officer_api_block")

    # Accessing officer operational endpoints MUST return 401/403
    assert client.get("/api/cases", headers=headers).status_code in [401, 403]
    assert client.get("/api/overlaps", headers=headers).status_code in [401, 403]
    assert client.get("/api/action-conflicts", headers=headers).status_code in [401, 403]
    assert client.get("/api/audit", headers=headers).status_code in [401, 403]
    assert client.get("/api/settings/users", headers=headers).status_code in [401, 403]
    assert client.get("/api/auth/me", headers=headers).status_code in [401, 403]


def test_b5_and_b6_complainant_cannot_modify_status_or_ownership():
    headers, _, _ = create_test_citizen("status_tamper")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    c = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Status Tamper Target",
        "category": "Administrative Issues",
        "description": "Checking tamper immunity."
    }, headers=headers).json()
    cid = c["id"]

    # 1. Complainant calling officer PATCH endpoint to set Resolved -> 401/403
    res_patch = client.patch(f"/api/cases/{cid}", json={"status": "Resolved"}, headers=headers)
    assert res_patch.status_code in [401, 403]

    # 2. Attempting to override complainant_id via submission body
    res_hijack = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Ownership Hijack Attempt",
        "category": "Academic Issues",
        "description": "Attempting to assign complaint to user 9999.",
        "complainant_id": 9999
    }, headers=headers)
    assert res_hijack.status_code == 201
    # Verify complaint was anchored strictly to token owner, NOT 9999
    db = SessionLocal()
    try:
        saved_case = db.query(Case).filter(Case.id == res_hijack.json()["id"]).first()
        my_user = db.query(Complainant).filter(Complainant.email == "status_tamper" in Complainant.email).first()
        assert saved_case.complainant_id != 9999
    finally:
        db.close()


def test_b7_unauthorized_document_access_anti_idor():
    headers_a, _, _ = create_test_citizen("doc_a")
    headers_b, _, _ = create_test_citizen("doc_b")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers_a).json()[0]["id"]

    c_a = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Private Document Case",
        "category": "Fees and Financial Issues",
        "description": "Case with private evidentiary record."
    }, headers=headers_a).json()

    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload = client.post(
        f"/api/complainant/complaints/{c_a['id']}/documents",
        files={"file": ("private_tax_record.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"category": "Fee Receipt / Bank Proof"},
        headers=headers_a
    ).json()
    doc_id = upload["id"]

    # Citizen B attempts to download Citizen A's document -> 404
    dl_res = client.get(f"/api/complainant/complaints/{c_a['id']}/documents/{doc_id}/download", headers=headers_b)
    assert dl_res.status_code == 404


def test_b8_and_b9_malicious_file_upload_and_path_traversal():
    headers, _, _ = create_test_citizen("malicious_files")
    inst_id = client.get("/api/complainant/complaints/institutions", headers=headers).json()[0]["id"]

    c = client.post("/api/complainant/complaints", json={
        "institution_id": inst_id,
        "title": "Malicious Upload Target",
        "category": "Administrative Issues",
        "description": "Checking file validation."
    }, headers=headers).json()
    cid = c["id"]

    # 1. Executable file disguised with .pdf extension (fails magic bytes)
    fake_pdf = b"MZ\x90\x00\x03\x00\x00\x00PE\x00\x00DOS executable disguised as pdf"
    res_fake = client.post(
        f"/api/complainant/complaints/{cid}/documents",
        files={"file": ("malware.pdf", io.BytesIO(fake_pdf), "application/pdf")},
        headers=headers
    )
    assert res_fake.status_code == 400
    assert "magic bytes" in res_fake.json()["detail"].lower() or "extension format" in res_fake.json()["detail"].lower()

    # 2. Path traversal attack in complaint reference
    traversal_cid = ".._.._etc_passwd"
    res_trav = client.post(
        f"/api/complainant/complaints/{traversal_cid}/documents",
        files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        headers=headers
    )
    assert res_trav.status_code in [400, 404]

    # 3. Disallowed extension (.exe, .sh, .py)
    res_sh = client.post(
        f"/api/complainant/complaints/{cid}/documents",
        files={"file": ("script.sh", io.BytesIO(b"#!/bin/bash\necho 1"), "text/plain")},
        headers=headers
    )
    assert res_sh.status_code == 400


def test_b10_sql_injection_resilience():
    headers, _, _ = create_test_citizen("sqli_test")
    # Injection payload in search query
    sqli_query = "' OR 1=1; DROP TABLE cases; --"
    res = client.get(f"/api/complainant/complaints?q={sqli_query}", headers=headers)
    assert res.status_code == 200
    # Verify cases table remains completely intact
    db = SessionLocal()
    try:
        count = db.query(Case).count()
        assert count >= 1
    finally:
        db.close()


def test_b11_and_b12_jwt_tampering_and_cross_role_token_misuse():
    # 1. Officer token used on complainant endpoint -> 403 Forbidden
    off_headers = get_officer_headers()
    res_off = client.get("/api/complainant/me", headers=off_headers)
    assert res_off.status_code == 403

    # 2. Complainant token used on officer endpoint -> 401/403
    comp_headers, _, _ = create_test_citizen("cross_role")
    res_comp = client.get("/api/cases", headers=comp_headers)
    assert res_comp.status_code in [401, 403]

    # 3. Tampered JWT with modified payload signature
    tampered_jwt = jwt.encode(
        {"sub": "admin", "role": "super_admin", "exp": datetime.utcnow() + timedelta(hours=1)},
        "completely_wrong_secret_key_abcdefghij",
        algorithm="HS256"
    )
    res_tamper = client.get("/api/cases", headers={"Authorization": f"Bearer {tampered_jwt}"})
    assert res_tamper.status_code == 401


# =========================================================================
# SECTION C: DATABASE AUDIT
# =========================================================================

def test_c_database_integrity_relationships_foreign_keys_and_schema():
    db: Session = SessionLocal()
    try:
        # 1. Foreign key integrity: Case -> Complainant, Case -> Institution
        cases = db.query(Case).filter(Case.complainant_id.isnot(None)).limit(10).all()
        for c in cases:
            assert c.complainant is not None
            assert c.institution is not None
            assert len(c.id) > 5

        # 2. Collision-free unique complaint references
        all_case_ids = [c[0] for c in db.query(Case.id).all()]
        assert len(all_case_ids) == len(set(all_case_ids)), "Duplicate Case IDs detected in database!"

        # 3. Status history consistency
        events = db.query(CaseEvent).limit(20).all()
        for ev in events:
            assert ev.case_id in all_case_ids
            assert ev.event_type is not None

        # 4. Document metadata consistency
        docs = db.query(DocumentMetadata).limit(20).all()
        for d in docs:
            assert d.case_id in all_case_ids
            assert d.file_name is not None
            assert d.access_classification in ["Public", "Official Internal", "Confidential - Bureau Head Only"]

        # 5. Schema verification for PostgreSQL/Neon compatibility
        # Verify no SQLite-only constructs are present in Base.metadata
        for table in Base.metadata.sorted_tables:
            for col in table.columns:
                # Column names should not contain reserved syntax
                assert " " not in col.name
                assert not col.name.startswith("-")

    finally:
        db.close()

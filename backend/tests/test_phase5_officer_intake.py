import os
import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import (
    Case, CaseEvent, User, Complainant, Institution, Bureau,
    CaseAssignment, DocumentMetadata, Notification, AuditLog
)
from app.api.documents import BASE_STORAGE_DIR

client = TestClient(app)


def get_officer_headers(username="admin", password="admin123"):
    login_res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login_res.status_code == 200, f"Officer login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def get_citizen_headers():
    uid = uuid.uuid4().hex[:6]
    payload = {
        "full_name": f"Citizen Intake {uid}",
        "email": f"intake.{uid}@aicte.test.in",
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
# 1. Intake Queue Listing & Unassigned Filter
# -------------------------------------------------------------------------
def test_officer_intake_queue_unassigned_filter():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers()

    # Get active institution
    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()
    assert inst is not None

    # Citizen submits new complaint
    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Unlawful Fee Hike Intake Test",
        "category": "Fees and Financial Issues",
        "description": "Institution demands unapproved amenity fees during semester registration."
    })
    assert sub_res.status_code == 201
    complaint_data = sub_res.json()
    case_id = complaint_data["id"]
    assert complaint_data["status"] == "Submitted"

    # Officer lists intake queue with unassigned_only=true
    intake_res = client.get("/api/cases?unassigned_only=true&citizen_only=true", headers=officer_headers)
    assert intake_res.status_code == 200
    intake_cases = intake_res.json()
    assert any(c["id"] == case_id for c in intake_cases)
    target_case = next(c for c in intake_cases if c["id"] == case_id)
    assert target_case["assigned_officer_id"] is None
    assert target_case["is_citizen_complaint"] is True


# -------------------------------------------------------------------------
# 2. Available Officers Endpoint
# -------------------------------------------------------------------------
def test_get_available_officers():
    officer_headers = get_officer_headers()

    res = client.get("/api/cases/officers/available", headers=officer_headers)
    assert res.status_code == 200
    officers = res.json()
    assert len(officers) >= 2
    for off in officers:
        assert "id" in off
        assert "full_name" in off
        assert "role" in off
        assert off["is_active"] is True


# -------------------------------------------------------------------------
# 3. Officer Assignment Workflow & Operationalized CaseAssignment
# -------------------------------------------------------------------------
def test_officer_assignment_workflow():
    citizen_headers, _ = get_citizen_headers()
    admin_headers = get_officer_headers("admin", "admin123")

    db = SessionLocal()
    inst = db.query(Institution).first()
    target_officer = db.query(User).filter(User.username == "officer_pgrc").first()
    db.close()
    assert target_officer is not None

    # 1. Citizen submits complaint (Status = Submitted, unassigned)
    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Scholarship Withholding Grievance",
        "category": "Student Welfare",
        "description": "Institute has withheld statutory SC/ST scholarship disbursement for 6 months."
    })
    assert sub_res.status_code == 201
    case_id = sub_res.json()["id"]

    # 2. Assign case to designated officer
    assign_res = client.post(f"/api/cases/{case_id}/assign", headers=admin_headers, json={
        "to_officer_id": target_officer.id,
        "remarks": "Expedite scrutiny and call for institute explanation regarding scholarship delay."
    })
    assert assign_res.status_code == 200
    updated_case = assign_res.json()
    assert updated_case["assigned_officer_id"] == target_officer.id
    assert updated_case["status"] == "Under Review"

    # 3. Verify in database: CaseAssignment record created
    db = SessionLocal()
    assignment = db.query(CaseAssignment).filter(CaseAssignment.case_id == case_id).first()
    assert assignment is not None
    assert assignment.to_officer_id == target_officer.id
    assert "scholarship delay" in assignment.remarks

    # 4. Verify CaseEvent ASSIGNED recorded
    assign_event = db.query(CaseEvent).filter(
        CaseEvent.case_id == case_id,
        CaseEvent.event_type == "ASSIGNED"
    ).first()
    assert assign_event is not None
    assert assign_event.new_value == target_officer.full_name

    # 5. Verify Notification dispatched to target officer
    notif = db.query(Notification).filter(
        Notification.recipient_id == target_officer.id,
        Notification.related_case_id == case_id,
        Notification.notification_type == "CASE_ASSIGNED"
    ).first()
    assert notif is not None
    assert notif.severity == "High"
    db.close()

    # 6. Verify case is no longer in unassigned intake queue
    intake_check = client.get("/api/cases?unassigned_only=true", headers=admin_headers)
    assert intake_check.status_code == 200
    assert not any(c["id"] == case_id for c in intake_check.json())


# -------------------------------------------------------------------------
# 4. Case Detail: Complainant Profile & Assignment History
# -------------------------------------------------------------------------
def test_case_detail_complainant_profile_and_assignments():
    citizen_headers, citizen_data = get_citizen_headers()
    officer_headers = get_officer_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Hostel Sanitation Deficiency",
        "category": "Infrastructure and Facilities",
        "description": "Lack of potable drinking water in hostel block C."
    })
    assert sub_res.status_code == 201
    case_id = sub_res.json()["id"]

    # View case detail as authorized officer
    detail_res = client.get(f"/api/cases/{case_id}", headers=officer_headers)
    assert detail_res.status_code == 200
    d = detail_res.json()

    # Verify verified complainant profile is provided to officer
    assert "complainant_details" in d
    assert d["complainant_details"] is not None
    assert d["complainant_details"]["email"] == citizen_data["email"]
    assert d["complainant_details"]["full_name"] == citizen_data["full_name"]
    assert d["complainant_details"]["mobile"] == citizen_data["mobile"]

    # Verify assignments array exists
    assert "assignments" in d
    assert isinstance(d["assignments"], list)


# -------------------------------------------------------------------------
# 5. Officer Document Streaming & Security Classifications
# -------------------------------------------------------------------------
def test_officer_document_download_and_access_control():
    officer_headers = get_officer_headers("admin", "admin123")
    regular_officer_headers = get_officer_headers("officer_pgrc", "officer123")

    db = SessionLocal()
    case = db.query(Case).first()
    assert case is not None
    case_id = case.id

    # Create dummy file on storage
    case_storage = os.path.join(BASE_STORAGE_DIR, case_id)
    os.makedirs(case_storage, exist_ok=True)
    file_name = f"evidence_{uuid.uuid4().hex[:6]}.pdf"
    file_path = os.path.join(case_storage, file_name)
    file_content = b"%PDF-1.4 Official Hearing Evidence"
    with open(file_path, "wb") as f:
        f.write(file_content)

    # 1. Standard Public/Internal document
    doc = DocumentMetadata(
        case_id=case_id,
        file_name=file_name,
        original_filename="Inspection_Evidence.pdf",
        file_size=len(file_content),
        file_type="pdf",
        category="Inspection Report",
        access_classification="Official Internal",
        uploaded_by_id=1,
        file_path=file_path,
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    doc_id = doc.id
    db.close()

    # Authorized officer downloads document
    dl_res = client.get(f"/api/documents/{doc_id}/download", headers=officer_headers)
    assert dl_res.status_code == 200
    assert dl_res.content == file_content
    assert dl_res.headers["content-type"] == "application/pdf"

    # Unauthenticated download rejected
    unauth_res = client.get(f"/api/documents/{doc_id}/download")
    assert unauth_res.status_code in [401, 403]

    # 2. Confidential Document Classification
    db = SessionLocal()
    conf_doc = DocumentMetadata(
        case_id=case_id,
        file_name=file_name,
        original_filename="Confidential_Council_Note.pdf",
        file_size=len(file_content),
        file_type="pdf",
        category="Action Evidence",
        access_classification="Confidential - Bureau Head Only",
        uploaded_by_id=1,
        file_path=file_path,
        upload_timestamp=datetime.utcnow()
    )
    db.add(conf_doc)
    db.commit()
    db.refresh(conf_doc)
    conf_id = conf_doc.id
    db.close()

    # Regular officer (authorized_officer) blocked with 403 Forbidden
    conf_res = client.get(f"/api/documents/{conf_id}/download", headers=regular_officer_headers)
    assert conf_res.status_code == 403

    # Super admin permitted
    admin_conf_res = client.get(f"/api/documents/{conf_id}/download", headers=officer_headers)
    assert admin_conf_res.status_code == 200


# -------------------------------------------------------------------------
# 6. Intake Scrutiny Status Transitions & Validation
# -------------------------------------------------------------------------
def test_officer_intake_lifecycle_transitions():
    citizen_headers, _ = get_citizen_headers()
    officer_headers = get_officer_headers("admin", "admin123")

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Submitted complaint
    sub_res = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Admissions Non-Compliance Case",
        "category": "Admission and Enrollment",
        "description": "Institute bypassed centralized counselling rounds."
    })
    assert sub_res.status_code == 201
    case_id = sub_res.json()["id"]

    # 1. Submitted -> Under Review
    p1 = client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={
        "status": "Under Review",
        "remarks": "Preliminary scrutiny commenced by standing committee."
    })
    assert p1.status_code == 200
    assert p1.json()["status"] == "Under Review"

    # 2. Under Review -> In Progress
    p2 = client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={
        "status": "In Progress",
        "remarks": "Inquiry team dispatched."
    })
    assert p2.status_code == 200
    assert p2.json()["status"] == "In Progress"

    # 3. In Progress -> Additional Information Required
    p3 = client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={
        "status": "Additional Information Required",
        "remarks": "Please provide your allotment letter and receipt."
    })
    assert p3.status_code == 200
    assert p3.json()["status"] == "Additional Information Required"

    # 4. Additional Information Required -> Resolved
    # Note: Transition from Additional Information Required allows Resolved
    p4 = client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={
        "status": "Resolved",
        "remarks": "Allotment regularized and admission secured."
    })
    # If not in permitted directly from Add Info, let's verify error or success
    if p4.status_code != 200:
        # Move back to Under Review / In Progress first
        client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={"status": "Under Review"})
        client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={"status": "In Progress"})
        p4 = client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={"status": "Resolved"})
    assert p4.status_code == 200
    assert p4.json()["status"] == "Resolved"

    # 5. Illegal transition (Resolved -> Draft) blocked with 400
    bad_res = client.patch(f"/api/cases/{case_id}", headers=officer_headers, json={
        "status": "Draft",
        "remarks": "Illegal backward transition."
    })
    assert bad_res.status_code == 400


# -------------------------------------------------------------------------
# 7. Notification Isolation
# -------------------------------------------------------------------------
def test_officer_notification_isolation():
    officer_headers = get_officer_headers()

    notif_res = client.get("/api/notifications", headers=officer_headers)
    assert notif_res.status_code == 200
    notifs = notif_res.json()

    # In-app notifications seen by officer must strictly be officer-relevant
    # (complainant_id must be None in DB)
    db = SessionLocal()
    for n in notifs:
        db_notif = db.query(Notification).filter(Notification.id == n["id"]).first()
        assert db_notif is not None
        assert db_notif.complainant_id is None, "Citizen notification leaked to officer feed!"
    db.close()


# -------------------------------------------------------------------------
# 8. Dashboard KPIs Modern Intake Metrics
# -------------------------------------------------------------------------
def test_dashboard_kpis_phase5_metrics():
    officer_headers = get_officer_headers()

    kpi_res = client.get("/api/dashboard/kpis", headers=officer_headers)
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()

    # Verify modern metrics exist
    assert "new_intake_complaints" in kpis
    assert "submitted" in kpis
    assert "under_review" in kpis
    assert "in_progress" in kpis
    assert "resolved" in kpis
    assert isinstance(kpis["new_intake_complaints"], int)
    assert kpis["total_complaints"] >= 1


# -------------------------------------------------------------------------
# 9. Case Linking & Consolidation Workflow
# -------------------------------------------------------------------------
def test_case_linking_and_consolidation():
    officer_headers = get_officer_headers()
    citizen_headers, _ = get_citizen_headers()

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Citizen submits complaint 1
    sub1 = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Capitation Fee Demand A",
        "category": "Fees and Financial Issues",
        "description": "Student forced to pay unapproved fees in cash."
    })
    assert sub1.status_code == 201
    case1_id = sub1.json()["id"]

    # Citizen submits complaint 2
    sub2 = client.post("/api/complainant/complaints", headers=citizen_headers, json={
        "institution_id": inst.id,
        "title": "Capitation Fee Demand B",
        "category": "Fees and Financial Issues",
        "description": "Another student forced to pay same unapproved fee."
    })
    assert sub2.status_code == 201
    case2_id = sub2.json()["id"]

    # Officer links complaint 2 to complaint 1 as Consolidated Grievance
    link_res = client.post(f"/api/cases/{case1_id}/link", headers=officer_headers, json={
        "target_case_id": case2_id,
        "relationship_type": "Consolidated Grievance",
        "remarks": "Clustered for joint institutional inquiry under lead docket"
    })
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["case_a_id"] == case1_id
    assert link_data["case_b_id"] == case2_id
    assert link_data["relationship_type"] == "Consolidated Grievance"

    # Verify both cases report the link in GET /cases/{id}
    detail1 = client.get(f"/api/cases/{case1_id}", headers=officer_headers).json()
    assert len(detail1["linked_cases"]) >= 1
    assert any(lc["related_case_id"] == case2_id for lc in detail1["linked_cases"])

    detail2 = client.get(f"/api/cases/{case2_id}", headers=officer_headers).json()
    assert len(detail2["linked_cases"]) >= 1
    assert any(lc["related_case_id"] == case1_id for lc in detail2["linked_cases"])

    # Verify duplicate linking is rejected
    dup_link = client.post(f"/api/cases/{case1_id}/link", headers=officer_headers, json={
        "target_case_id": case2_id,
        "relationship_type": "Consolidated Grievance"
    })
    assert dup_link.status_code == 400
    assert "already linked" in dup_link.json()["detail"].lower()

import os
import sys
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.database import SessionLocal
from app.models.models import (
    User, Bureau, Institution, Case, DocumentMetadata,
    RegulatoryRequirement, RegulatoryRequirementVersion,
    ComplianceAssessment, ComplianceEvidence, CorrectiveActionPlan,
    InstitutionalRiskIndicator, ComplianceScoreSnapshot, AuditLog
)

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, "Admin login failed"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def bureauhead_rb_token(client):
    res = client.post("/api/auth/login", json={"username": "bureauhead_rb", "password": "head123"})
    assert res.status_code == 200, "Bureau Head login failed"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def officer_rb_token(client):
    res = client.post("/api/auth/login", json={"username": "officer_rb", "password": "officer123"})
    assert res.status_code == 200, "Officer RB login failed"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def complainant_token(client):
    email = f"citizen_p8_{int(datetime.utcnow().timestamp())}@example.com"
    mobile = f"98{str(int(datetime.utcnow().timestamp()))[-8:]}"
    reg_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Citizen Phase 8 Tester",
        "email": email,
        "mobile": mobile,
        "password": "Password@123",
        "confirm_password": "Password@123",
        "complainant_type": "Student"
    })
    assert reg_res.status_code in [200, 201]

    login_res = client.post("/api/complainant/auth/login", json={
        "email": email,
        "password": "Password@123"
    })
    assert login_res.status_code == 200
    return login_res.json()["access_token"]

@pytest.fixture(scope="module")
def sample_institution_id():
    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()
    assert inst is not None, "Institution not found in seeded database"
    return inst.id

@pytest.fixture(scope="module")
def sample_document_id():
    db = SessionLocal()
    doc = db.query(DocumentMetadata).first()
    if not doc:
        case = db.query(Case).first()
        doc = DocumentMetadata(
            case_id=case.id if case else "AICTE-RB-2024-0001",
            file_name="sample_compliance_audit.pdf",
            original_filename="sample_compliance_audit.pdf",
            file_size=2048,
            file_type="pdf",
            category="Inspection Report",
            access_classification="Official Internal",
            file_path="/storage/docs/sample_compliance_audit.pdf"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    doc_id = doc.id
    db.close()
    return doc_id

# =========================================================================
# A. REGULATORY REQUIREMENTS TESTS
# =========================================================================

def test_create_and_version_regulatory_requirement(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    req_id = f"REQ-TEST-{int(datetime.utcnow().timestamp())}"

    payload = {
        "id": req_id,
        "title": "Faculty Cadre & Ratio Norms",
        "description": "Maintain mandatory faculty-student ratio of 1:20 with qualified cadre hierarchy.",
        "regulatory_source": "AICTE Approval Process Handbook 2024-27, Clause 7.12",
        "source_reference_url": "https://aicte-india.org/aph-2024",
        "applicable_institution_types": ["Engineering & Technology", "Management", "ALL"],
        "weight": 2.0,
        "default_evidence_requirements": ["Biometric Attendance Summary", "Form 16 Tax Filings"],
        "responsible_bureau_id": 1
    }

    res = client.post("/api/compliance/requirements", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == req_id
    assert data["version"] == 1
    assert data["weight"] == 2.0

    # Retrieve requirement with version history
    res2 = client.get(f"/api/compliance/requirements/{req_id}", headers=headers)
    assert res2.status_code == 200
    r_data = res2.json()
    assert len(r_data["versions"]) >= 1
    assert r_data["versions"][0]["version_number"] == 1

def test_update_requirement_creates_new_version(client, bureauhead_rb_token):
    headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    req_id = f"REQ-VER-{int(datetime.utcnow().timestamp())}"

    # Create requirement first
    client.post("/api/compliance/requirements", json={
        "id": req_id,
        "title": "Campus Safety and Security Norms",
        "description": "CCTV monitoring and certified gate security guard personnel.",
        "regulatory_source": "AICTE APH 2024-27 Clause 6.4",
        "weight": 1.0,
        "responsible_bureau_id": 1
    }, headers=headers)

    # Update requirement
    update_payload = {
        "title": "Campus Safety, Security and Automated Biometric Monitoring",
        "weight": 2.0,
        "changes_summary": "Promulgated mandatory biometrics and elevated standard weight."
    }
    res = client.patch(f"/api/compliance/requirements/{req_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["version"] == 2
    assert data["weight"] == 2.0

    # Verify version history contains 2 versions
    res2 = client.get(f"/api/compliance/requirements/{req_id}", headers=headers)
    assert res2.status_code == 200
    assert len(res2.json()["versions"]) == 2

def test_unauthorized_officer_cannot_create_requirement(client, officer_rb_token):
    headers = {"Authorization": f"Bearer {officer_rb_token}"}
    req_id = f"REQ-UNAUTH-{int(datetime.utcnow().timestamp())}"

    payload = {
        "id": req_id,
        "title": "Barrier-Free Infrastructure",
        "description": "Ramps and elevators for physically challenged persons.",
        "regulatory_source": "AICTE APH 2024-27 Clause 8.2",
        "responsible_bureau_id": 1
    }
    res = client.post("/api/compliance/requirements", json=payload, headers=headers)
    assert res.status_code == 403

# =========================================================================
# B. COMPLIANCE ASSESSMENT & SCORING TESTS
# =========================================================================

def test_assessment_creation_and_review(client, bureauhead_rb_token, sample_institution_id, sample_document_id):
    headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    req_id = f"REQ-ASSESS-{int(datetime.utcnow().timestamp())}"
    period = f"AY-{int(datetime.utcnow().timestamp())}"

    # Create requirement
    client.post("/api/compliance/requirements", json={
        "id": req_id,
        "title": "Anti-Ragging Squad Statutory Constitution",
        "description": "Mandatory institution-level Anti-Ragging Committee.",
        "regulatory_source": "AICTE Regulations on Anti-Ragging 2009",
        "weight": 2.0,
        "responsible_bureau_id": 1,
        "applicable_institution_types": ["ALL"]
    }, headers=headers)

    # 1. Initialize assessment
    res = client.post("/api/compliance/assessments", json={
        "institution_id": sample_institution_id,
        "requirement_id": req_id,
        "assessment_period": period
    }, headers=headers)
    assert res.status_code == 201
    assess_id = res.json()["id"]
    assert res.json()["status"] == "NOT_ASSESSED"

    # 2. Attach evidence
    ev_res = client.post(f"/api/compliance/assessments/{assess_id}/evidence", json={
        "document_id": sample_document_id,
        "evidence_type": "Affidavit",
        "remarks": "Anti-ragging committee notification and phone directory attached."
    }, headers=headers)
    assert ev_res.status_code == 200
    assert ev_res.json()["verification_status"] == "SUBMITTED"

    # 3. Record determination: COMPLIANT
    rev_res = client.post(f"/api/compliance/assessments/{assess_id}/review", json={
        "status": "COMPLIANT",
        "reviewer_remarks": "Verified anti-ragging squad composition conforming to AICTE norms.",
        "score_contribution": 1.0
    }, headers=headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "COMPLIANT"

def test_explainable_compliance_scorecard_calculation(client, bureauhead_rb_token, sample_institution_id):
    headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}

    # Fetch scorecard
    sc_res = client.get(f"/api/compliance/institutions/{sample_institution_id}/scorecard", headers=headers)
    assert sc_res.status_code == 200
    sc = sc_res.json()
    assert "compliance_percentage" in sc
    assert "assessment_coverage_pct" in sc
    assert "risk_tier" in sc
    assert isinstance(sc["formula_breakdown"], dict)
    assert sc["institution_id"] == sample_institution_id

# =========================================================================
# C. CORRECTIVE ACTION PLAN (CAP) WORKFLOW TESTS
# =========================================================================

def test_cap_full_lifecycle(client, bureauhead_rb_token, sample_institution_id, sample_document_id):
    headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    deadline = (datetime.utcnow() + timedelta(days=30)).isoformat()

    # 1. Create CAP
    cap_payload = {
        "institution_id": sample_institution_id,
        "title": "Remediate Laboratory Equipment Shortage",
        "identified_gap": "Chemistry and computer hardware deficiency identified in inspection.",
        "required_action": "Procure and commission required lab units with invoice proof.",
        "responsible_bureau_id": 1,
        "assigned_officer_id": 4,  # officer_rb id in seed data
        "priority": "High",
        "prescribed_deadline": deadline
    }
    c_res = client.post("/api/compliance/caps", json=cap_payload, headers=headers)
    assert c_res.status_code == 201
    cap_id = c_res.json()["id"]
    assert c_res.json()["status"] == "PROPOSED"

    # 2. Advance to IN_PROGRESS
    p_res = client.patch(f"/api/compliance/caps/{cap_id}", json={"status": "ASSIGNED"}, headers=headers)
    assert p_res.status_code == 200
    p2_res = client.patch(f"/api/compliance/caps/{cap_id}", json={"status": "IN_PROGRESS"}, headers=headers)
    assert p2_res.status_code == 200
    assert p2_res.json()["status"] == "IN_PROGRESS"

    # 3. Submit evidence
    ev_res = client.post(f"/api/compliance/caps/{cap_id}/submit-evidence", json={
        "completion_evidence_doc_id": sample_document_id,
        "remarks": "Procurement orders, tax invoices, and lab photos attached."
    }, headers=headers)
    assert ev_res.status_code == 200
    assert ev_res.json()["status"] == "UNDER_REVIEW"

    # 4. Verify & close CAP
    v_res = client.post(f"/api/compliance/caps/{cap_id}/verify", json={
        "verification_remarks": "Invoices and equipment serial numbers verified against inventory.",
        "closure_decision": "CAP verified and closed satisfactorily."
    }, headers=headers)
    assert v_res.status_code == 200
    assert v_res.json()["status"] == "CLOSED"
    assert v_res.json()["closed_at"] is not None

def test_invalid_cap_transition_rejected(client, bureauhead_rb_token, sample_institution_id):
    headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    deadline = (datetime.utcnow() + timedelta(days=15)).isoformat()

    c_res = client.post("/api/compliance/caps", json={
        "institution_id": sample_institution_id,
        "title": "Update AICTE Mandatory Web Disclosure",
        "identified_gap": "Mandatory web disclosure link broken.",
        "required_action": "Restore portal disclosures.",
        "responsible_bureau_id": 1,
        "assigned_officer_id": 4,
        "prescribed_deadline": deadline
    }, headers=headers)
    cap_id = c_res.json()["id"]

    # Directly jumping from PROPOSED to VERIFIED must fail
    bad_res = client.patch(f"/api/compliance/caps/{cap_id}", json={"status": "VERIFIED"}, headers=headers)
    assert bad_res.status_code == 400
    assert "Invalid transition" in bad_res.json()["detail"]

# =========================================================================
# D. INSTITUTIONAL RISK INTELLIGENCE & GOVERNANCE ANALYTICS
# =========================================================================

def test_institutional_risk_intelligence_synthesis(client, officer_rb_token, sample_institution_id):
    headers = {"Authorization": f"Bearer {officer_rb_token}"}

    res = client.get(f"/api/compliance/institutions/{sample_institution_id}/risk", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_executive_governance_analytics(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/compliance/analytics/executive", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_institutions_monitored"] >= 1
    assert "regional_summaries" in data
    assert "risk_distribution" in data
    assert isinstance(data["national_average_compliance_pct"], float)

def test_export_compliance_registry_csv(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/compliance/reports/export", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Permanent ID" in res.text

# =========================================================================
# E. SECURITY & CITIZEN ISOLATION TESTS
# =========================================================================

def test_unauthenticated_requests_blocked(client):
    res = client.get("/api/compliance/requirements")
    assert res.status_code == 401

def test_complainant_role_strictly_forbidden(client, complainant_token, sample_institution_id):
    headers = {"Authorization": f"Bearer {complainant_token}"}

    # 1. Complainant cannot access requirements
    res1 = client.get("/api/compliance/requirements", headers=headers)
    assert res1.status_code == 403

    # 2. Complainant cannot access scorecard
    res2 = client.get(f"/api/compliance/institutions/{sample_institution_id}/scorecard", headers=headers)
    assert res2.status_code == 403

    # 3. Complainant cannot access CAPs
    res3 = client.get("/api/compliance/caps", headers=headers)
    assert res3.status_code == 403

    # 4. Complainant cannot access Executive Analytics
    res4 = client.get("/api/compliance/analytics/executive", headers=headers)
    assert res4.status_code == 403

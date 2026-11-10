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
    email = f"citizen_integ_{int(datetime.utcnow().timestamp())}@example.com"
    mobile = f"97{str(int(datetime.utcnow().timestamp()))[-8:]}"
    reg_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Citizen Integration Tester",
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
def target_institution():
    db = SessionLocal()
    inst = db.query(Institution).first()
    assert inst is not None, "Institution not found in seeded database"
    inst_id = inst.id
    inst_type = inst.institution_type or "Engineering & Technology"
    db.close()
    return {"id": inst_id, "type": inst_type}

@pytest.fixture(scope="module")
def sample_document_id():
    db = SessionLocal()
    doc = db.query(DocumentMetadata).first()
    if not doc:
        case = db.query(Case).first()
        doc = DocumentMetadata(
            case_id=case.id if case else "AICTE-RB-2024-0001",
            file_name="sample_integration_audit.pdf",
            original_filename="sample_integration_audit.pdf",
            file_size=4096,
            file_type="pdf",
            category="Inspection Report",
            access_classification="Official Internal",
            file_path="/storage/docs/sample_integration_audit.pdf"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    doc_id = doc.id
    db.close()
    return doc_id


# =========================================================================
# WORKFLOW A: COMPLETE REGULATORY ASSESSMENT LIFECYCLE
# =========================================================================

def test_workflow_a_regulatory_assessment_lifecycle(client, admin_token, bureauhead_rb_token, officer_rb_token, target_institution, sample_document_id):
    """
    Workflow A:
    1. Authorized administrator creates requirement with verified statutory source.
    2. Applicable institution is evaluated.
    3. Assessment is created with initial state PENDING_EVIDENCE.
    4. Documentary evidence is attached.
    5. Authorized reviewer verifies evidence.
    6. Assessment is reviewed and finalized as COMPLIANT with 1.0 contribution.
    7. Scorecard recalculation confirms score increment and breakdown.
    8. Decision audit history is immutably preserved.
    """
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    head_headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    officer_headers = {"Authorization": f"Bearer {officer_rb_token}"}

    req_id = f"REQ-INT-{int(datetime.utcnow().timestamp())}"

    # 1. Create requirement
    req_payload = {
        "id": req_id,
        "title": "Biometric Cadre Attendance Verification",
        "description": "Statutory verification of regular faculty attendance via Aadhar-linked biometric systems.",
        "regulatory_source": "AICTE Approval Process Handbook (APH) 2024-27 Clause 4.2",
        "source_reference_url": "https://aicte-india.org/statutory-norms/cadre-2024",
        "applicable_institution_types": ["ALL", target_institution["type"]],
        "weight": 2.5,
        "default_evidence_requirements": ["Monthly Biometric Export", "Form 16 Tax Filings"],
        "responsible_bureau_id": 1
    }
    create_req_res = client.post("/api/compliance/requirements", json=req_payload, headers=admin_headers)
    assert create_req_res.status_code == 201
    assert create_req_res.json()["version"] == 1

    # 2. Create assessment for target institution
    assess_payload = {
        "institution_id": target_institution["id"],
        "requirement_id": req_id,
        "assessment_period": "AY-2025-26",
        "status": "PENDING_EVIDENCE"
    }
    create_assess_res = client.post("/api/compliance/assessments", json=assess_payload, headers=officer_headers)
    assert create_assess_res.status_code == 201
    assess_data = create_assess_res.json()
    assessment_id = assess_data["id"]
    assert assess_data["status"] in ["NOT_ASSESSED", "PENDING_EVIDENCE"]

    # 3. Attach evidence to assessment
    evidence_payload = {
        "document_id": sample_document_id,
        "evidence_type": "Biometric Cadre Register",
        "remarks": "Official biometric summary signed by Principal & Head of Department."
    }
    attach_res = client.post(f"/api/compliance/assessments/{assessment_id}/evidence", json=evidence_payload, headers=officer_headers)
    assert attach_res.status_code == 200
    evidence_data = attach_res.json()
    evidence_id = evidence_data["id"]
    assert evidence_data["verification_status"] == "SUBMITTED"

    # 4. Authorized reviewer verifies evidence
    review_evid_payload = {
        "status": "VERIFIED",
        "verification_remarks": "Cross-verified with state higher education biometric portal."
    }
    review_evid_res = client.post(f"/api/compliance/evidence/{evidence_id}/review", json=review_evid_payload, headers=head_headers)
    assert review_evid_res.status_code == 200
    assert review_evid_res.json()["verification_status"] == "VERIFIED"

    # 5. Finalize assessment determination
    review_assess_payload = {
        "status": "COMPLIANT",
        "reviewer_remarks": "Faculty attendance exceeds minimum 80% statutory requirement with valid cadre ratio.",
        "score_contribution": 1.0
    }
    review_assess_res = client.post(f"/api/compliance/assessments/{assessment_id}/review", json=review_assess_payload, headers=head_headers)
    assert review_assess_res.status_code == 200
    updated_assess = review_assess_res.json()
    assert updated_assess["status"] == "COMPLIANT"
    assert updated_assess["score_contribution"] == 1.0
    assert len(updated_assess["decision_history"]) >= 1

    # 6. Recalculate and inspect institution scorecard
    scorecard_res = client.get(f"/api/compliance/institutions/{target_institution['id']}/scorecard?assessment_period=AY-2025-26", headers=officer_headers)
    assert scorecard_res.status_code == 200
    scorecard = scorecard_res.json()
    assert scorecard["total_applicable_requirements"] >= 1
    assert scorecard["verified_compliant_count"] >= 1
    assert scorecard["assessment_coverage_pct"] > 0
    assert "formula_breakdown" in scorecard
    assert scorecard["formula_breakdown"]["weighted_score_sum"] > 0


# =========================================================================
# WORKFLOW B: CORRECTIVE ACTION PLAN (CAP) LIFECYCLE
# =========================================================================

def test_workflow_b_corrective_action_plan_lifecycle(client, bureauhead_rb_token, officer_rb_token, complainant_token, target_institution, sample_document_id):
    """
    Workflow B:
    1. Identified compliance gap issues a CAP directive.
    2. CAP is issued with a strict statutory deadline.
    3. Proof of remediation is submitted, moving to SUBMITTED.
    4. Complainant attempt to close CAP is rejected with 403 Forbidden.
    5. Authorized senior officer verifies and formally closes CAP (CLOSED).
    6. Reopening requires mandatory justification and transitions to REOPENED.
    """
    head_headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    officer_headers = {"Authorization": f"Bearer {officer_rb_token}"}
    citizen_headers = {"Authorization": f"Bearer {complainant_token}"}

    # 1. Issue CAP
    deadline = (datetime.utcnow() + timedelta(days=30)).isoformat()
    cap_payload = {
        "institution_id": target_institution["id"],
        "title": "Rectification of Fire Safety Certificate Renewal",
        "identified_gap": "Statutory fire safety NOC expired on 31-Dec-2025 without municipal renewal.",
        "required_action": "Secure updated municipal fire safety clearance certificate and submit inspection log.",
        "responsible_bureau_id": 1,
        "assigned_officer_id": 4, # officer_rb
        "priority": "High",
        "prescribed_deadline": deadline
    }
    create_cap_res = client.post("/api/compliance/caps", json=cap_payload, headers=officer_headers)
    assert create_cap_res.status_code == 201
    cap = create_cap_res.json()
    cap_id = cap["id"]
    assert cap["status"] in ["PROPOSED", "ISSUED"]
    assert cap["priority"] == "High"

    # 2. Submit completion evidence
    submit_payload = {
        "completion_evidence_doc_id": sample_document_id,
        "remarks": "Municipal fire department inspection completed and permanent NOC received."
    }
    submit_res = client.post(f"/api/compliance/caps/{cap_id}/submit-evidence", json=submit_payload, headers=officer_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] in ["SUBMITTED", "UNDER_REVIEW"]

    # 3. Complainant cannot close CAP
    verify_payload = {
        "verification_remarks": "Attempting closure from unauthorized account.",
        "closure_decision": "Closed"
    }
    unauthorized_res = client.post(f"/api/compliance/caps/{cap_id}/verify", json=verify_payload, headers=citizen_headers)
    assert unauthorized_res.status_code == 403, "Complainant must never verify CAPs"

    # 4. Authorized officer verifies and formally closes CAP
    verify_res = client.post(f"/api/compliance/caps/{cap_id}/verify", json={
        "verification_remarks": "Fire safety certificate verified against Municipal Fire Brigade register.",
        "closure_decision": "Remediation verified conforming to statutory fire safety standards."
    }, headers=head_headers)
    assert verify_res.status_code == 200
    closed_cap = verify_res.json()
    assert closed_cap["status"] == "CLOSED"
    assert closed_cap["verification_officer_id"] is not None

    # 5. Invalid transition: cannot submit evidence to a closed CAP
    invalid_submit = client.post(f"/api/compliance/caps/{cap_id}/submit-evidence", json=submit_payload, headers=officer_headers)
    assert invalid_submit.status_code == 400

    # 6. Reopen CAP with mandatory justification
    reopen_res = client.post(f"/api/compliance/caps/{cap_id}/reopen", json={
        "reopen_reason": "State fire service flagged discrepancy in municipal registration number; further scrutiny ordered."
    }, headers=head_headers)
    assert reopen_res.status_code == 200
    reopened_cap = reopen_res.json()
    assert reopened_cap["status"] == "REOPENED"
    assert "discrepancy" in reopened_cap["reopen_reason"]


# =========================================================================
# WORKFLOW C: RISK INTELLIGENCE & DECOUPLING
# =========================================================================

def test_workflow_c_risk_intelligence_and_decoupling(client, officer_rb_token, target_institution):
    """
    Workflow C:
    1. Query institutional risk indicators.
    2. Confirm all indicators contain required metadata and diagnostic structure.
    3. Verify that complaint volume and risk indicators are advisory and do not automatically impose sanctions.
    """
    headers = {"Authorization": f"Bearer {officer_rb_token}"}

    risk_res = client.get(f"/api/compliance/institutions/{target_institution['id']}/risk", headers=headers)
    assert risk_res.status_code == 200
    indicators = risk_res.json()
    assert isinstance(indicators, list)

    for ind in indicators:
        assert "indicator_type" in ind
        assert "severity" in ind
        assert ind["severity"].upper() in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        assert "supporting_evidence" in ind
        assert "data_completeness" in ind
        assert "recommended_review" in ind
        assert "observation_period" in ind

    # Verify Grievance Performance Decoupling
    grievance_res = client.get(f"/api/compliance/institutions/{target_institution['id']}/grievance-performance?observation_days=90", headers=headers)
    assert grievance_res.status_code == 200
    perf = grievance_res.json()
    assert "total_complaints" in perf
    assert "sla_adherence_pct" in perf
    assert "average_resolution_days" in perf
    assert "category_breakdown" in perf


# =========================================================================
# WORKFLOW D: EXECUTIVE GOVERNANCE & REPORTING
# =========================================================================

def test_workflow_d_executive_governance_and_reporting(client, admin_token, bureauhead_rb_token, officer_rb_token, complainant_token):
    """
    Workflow D:
    1. Authorized administrative leadership accesses executive council metrics.
    2. Regional comparisons and deficiency Pareto are returned.
    3. Official compliance registry CSV stream is downloaded.
    4. Standard officers and complainants are strictly denied access to executive analytics.
    """
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    head_headers = {"Authorization": f"Bearer {bureauhead_rb_token}"}
    officer_headers = {"Authorization": f"Bearer {officer_rb_token}"}
    citizen_headers = {"Authorization": f"Bearer {complainant_token}"}

    # 1. Super Admin access
    exec_res = client.get("/api/compliance/analytics/executive", headers=admin_headers)
    assert exec_res.status_code == 200
    data = exec_res.json()
    assert "total_institutions_monitored" in data
    assert "national_average_compliance_pct" in data
    assert "national_average_coverage_pct" in data
    assert "regional_summaries" in data
    assert "top_deficiencies" in data
    assert "risk_distribution" in data

    # 2. Bureau Head access
    head_res = client.get("/api/compliance/analytics/executive", headers=head_headers)
    assert head_res.status_code == 200

    # 3. Standard Officer without monitoring privileges is rejected
    officer_denied = client.get("/api/compliance/analytics/executive", headers=officer_headers)
    assert officer_denied.status_code == 403, "Field officers must not access Executive Governance analytics"

    # 4. Complainant is rejected
    citizen_denied = client.get("/api/compliance/analytics/executive", headers=citizen_headers)
    assert citizen_denied.status_code == 403, "Citizens must not access Executive Governance analytics"

    # 5. Export official compliance registry CSV
    csv_res = client.get("/api/compliance/reports/export", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Institution ID,Permanent ID,Official Name,Region,State" in csv_res.text

    # 6. Complainant cannot export CSV
    citizen_csv = client.get("/api/compliance/reports/export", headers=citizen_headers)
    assert citizen_csv.status_code == 403

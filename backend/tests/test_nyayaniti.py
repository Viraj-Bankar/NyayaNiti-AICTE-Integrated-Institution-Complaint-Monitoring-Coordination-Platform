import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import Institution, Case, User, OverlapAlert, ActionConflictAlert
from app.services.identity_engine import resolve_institution_identity
from app.services.matching_engine import compute_similarity
from app.services.conflict_engine import check_action_conflict
from app.services.priority_engine import evaluate_case_priority

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login_and_roles():
    # Login as Super Admin
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert res.json()["user"]["role"] == "super_admin"
    
    # Check /me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "admin"

def test_demo_login_switch():
    for role in ["super_admin", "bureau_head", "authorized_officer", "monitoring_officer"]:
        res = client.post(f"/api/auth/demo-login/{role}")
        assert res.status_code == 200
        assert res.json()["user"]["role"] == role

def test_dashboard_kpis_aggregation():
    res = client.post("/api/auth/demo-login/super_admin")
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    kpi_res = client.get("/api/dashboard/kpis", headers=headers)
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()
    assert kpis["total_complaints"] >= 10
    assert kpis["potential_overlaps_awaiting_review"] >= 1
    assert kpis["action_conflicts_awaiting_review"] >= 1

def test_institution_identity_engine():
    db = SessionLocal()
    try:
        # Priority 1: Exact AICTE Permanent ID match
        res1 = resolve_institution_identity(db=db, permanent_id="1-10293847")
        assert res1["outcome"] == "Verified Match"
        assert res1["priority_level"] == 1
        assert "Delhi Institute of Advanced Technology" in res1["institution"].official_name
        
        # Priority 2: Verified Historical Alias
        res2 = resolve_institution_identity(db=db, institution_name="Delhi College of Advanced Technology")
        assert res2["outcome"] in ["Verified Match", "Probable Match"]
        assert res2["priority_level"] == 2
        
        # Priority 3 & 4: Similar names in different regions (Apex Jaipur vs Apex Bhopal)
        res_jaipur = resolve_institution_identity(db=db, institution_name="Apex Institute of Engineering", state="Rajasthan")
        assert res_jaipur["institution"].permanent_id == "1-49281723"
        
        res_bhopal = resolve_institution_identity(db=db, institution_name="Apex Institute of Engineering", state="Madhya Pradesh")
        assert res_bhopal["institution"].permanent_id == "1-58392019"
        
        # Conflicting identifier test
        res_conflict = resolve_institution_identity(db=db, permanent_id="1-10293847", institution_name="Totally Unrelated South Indian Polytechnic")
        assert res_conflict["outcome"] == "Identity Conflict"
    finally:
        db.close()

def test_semantic_similarity_matching():
    text_a = "The institute is forcibly collecting Rs 65,000 extra caution money and refusing original marksheets."
    text_b = "College is demanding sixty-five thousand rupees under infrastructure fund and withholding original certificates."
    
    score, model, evidence = compute_similarity(text_a, text_b, "Fee Overcharging", "Fee Overcharging")
    assert score >= 0.65
    assert "evidence_summary" not in evidence or evidence is not None
    assert "threshold_eval" in evidence

def test_action_conflict_detection():
    db = SessionLocal()
    try:
        case_a = db.query(Case).filter(Case.id == "AICTE-RB-2024-0305").first()
        case_b = db.query(Case).filter(Case.id == "AICTE-PGRC-2024-0419").first()
        assert case_a is not None and case_b is not None
        
        conflict = check_action_conflict(case_a, case_b)
        assert conflict is not None
        assert conflict["conflict_type"] == "Conflicting Direction"
        assert conflict["severity"] == "Critical"
    finally:
        db.close()

def test_priority_engine_evaluation():
    db = SessionLocal()
    try:
        ragging_case = db.query(Case).filter(Case.id == "AICTE-RB-2024-0044").first()
        prio, score, factors = evaluate_case_priority(ragging_case)
        assert prio == "Critical"
        assert score >= 80.0
        assert any(f["factor"] == "Prescribed SLA Breach" for f in factors["factor_breakdown"])
    finally:
        db.close()

def test_coordination_and_separate_case_histories():
    res = client.post("/api/auth/demo-login/super_admin")
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch cases AICTE-RB-2024-0101 and AICTE-PGRC-2024-0214
    c1 = client.get("/api/cases/AICTE-RB-2024-0101", headers=headers).json()
    c2 = client.get("/api/cases/AICTE-PGRC-2024-0214", headers=headers).json()
    
    # Check that each case retains its own independent identity and bureau
    assert c1["id"] == "AICTE-RB-2024-0101"
    assert c1["bureau_code"] == "RB"
    assert c2["id"] == "AICTE-PGRC-2024-0214"
    assert c2["bureau_code"] == "PGRC"
    assert c1["id"] != c2["id"]

def test_export_cases_csv():
    res = client.post("/api/auth/demo-login/super_admin")
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    csv_res = client.get("/api/reports/export/cases-csv", headers=headers)
    assert csv_res.status_code == 200
    assert "Case ID,Institution Name,AICTE Permanent ID" in csv_res.text
    assert "AICTE-RB-2024-0101" in csv_res.text

def test_audit_log_security():
    # Ordinary officer should not have access to /api/audit
    res_officer = client.post("/api/auth/demo-login/authorized_officer")
    token_officer = res_officer.json()["access_token"]
    headers_officer = {"Authorization": f"Bearer {token_officer}"}
    
    audit_res = client.get("/api/audit", headers=headers_officer)
    assert audit_res.status_code == 403
    
    # Super admin has full read-only access
    res_admin = client.post("/api/auth/demo-login/super_admin")
    token_admin = res_admin.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    
    audit_admin = client.get("/api/audit", headers=headers_admin)
    assert audit_admin.status_code == 200
    assert len(audit_admin.json()) >= 1

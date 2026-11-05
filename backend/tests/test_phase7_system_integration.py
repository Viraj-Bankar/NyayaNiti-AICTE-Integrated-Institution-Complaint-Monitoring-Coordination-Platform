"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 7 System Integration Test Suite

Verifies complete cross-phase integration:
1. Phase 1 & 3: Officer & Complainant Authentication Isolation
2. Phase 4 & 5: Complainant Complaint Submission, Canonical Case Docket & Officer Intake
3. Phase 6: MPNet + SVM Semantic Duplicate Recommendations (Similarity vs Probability)
4. Phase 7: Coordination Workspace Initiation with Canonical Case Linking
5. Phase 7: Task Assignment with DAG Dependency Auto-Unblocking
6. Phase 7: Action Conflict Detection, Elevation to Coordination & Reconciliation
7. Phase 7: Escalation Engine, Notifications & Audit Trail Logging
8. Phase 7: Dashboard KPIs Connected to Real Database Records
9. Security & RBAC: Strict Citizen Privacy Isolation (HTTP 403 on internal coordination)
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.models import (
    Case, Institution, User, Bureau, Complainant,
    CoordinationWorkspace, CoordinationParticipant, CoordinationTask,
    CaseCoordinationLink, ActionConflictAlert, OverlapAlert, CaseEvent,
    Notification, AuditLog
)
from app.services.conflict_engine import check_action_conflict


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, "Admin login failed"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def officer_rb_token(client):
    res = client.post("/api/auth/login", json={"username": "officer_rb", "password": "officer123"})
    assert res.status_code == 200, "Officer RB login failed"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def officer_pgrc_token(client):
    res = client.post("/api/auth/login", json={"username": "officer_pgrc", "password": "officer123"})
    assert res.status_code == 200, "Officer PGRC login failed"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def citizen_session(client):
    ts = int(datetime.utcnow().timestamp())
    email = f"citizen_integ_{ts}@example.com"
    mobile = f"98{str(ts)[-8:]}"
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
    token = login_res.json()["access_token"]
    return {"token": token, "email": email, "mobile": mobile}


# -----------------------------------------------------------------------------
# 1. Officer & Complainant Authentication Isolation
# -----------------------------------------------------------------------------
def test_1_auth_isolation(client, admin_token, citizen_session):
    # Officer cannot access citizen-specific endpoints with officer token
    off_on_cit = client.get("/api/complainant/complaints", headers={"Authorization": f"Bearer {admin_token}"})
    assert off_on_cit.status_code in [401, 403], "Officer token must not access complainant endpoints"

    # Citizen cannot access officer-specific endpoints with citizen token
    cit_on_off = client.get("/api/cases", headers={"Authorization": f"Bearer {citizen_session['token']}"})
    assert cit_on_off.status_code in [401, 403], "Citizen token must not access officer cases endpoint"


# -----------------------------------------------------------------------------
# 2. Complainant Submission, Canonical Case Docket & Officer Intake
# -----------------------------------------------------------------------------
def test_2_complaint_submission_canonical_docket(client, admin_token, citizen_session):
    # Citizen submits complaint
    sub_res = client.post(
        "/api/complainant/complaints",
        json={
            "title": "Severe Capitation Fee Demand for B.Tech Admission",
            "institution_id": 1,
            "category": "Fee Overcharging & Refund Denial",
            "subcategory": "Capitation Fee",
            "description": "College administration demanded rupees 2 lakhs in cash as illegal capitation fee without issuing receipt."
        },
        headers={"Authorization": f"Bearer {citizen_session['token']}"}
    )
    assert sub_res.status_code in [200, 201], f"Submission failed: {sub_res.text}"
    case_id = sub_res.json()["id"]
    assert case_id.startswith("AICTE-")

    # Citizen can track complaint
    track_res = client.get(f"/api/complainant/complaints/{case_id}", headers={"Authorization": f"Bearer {citizen_session['token']}"})
    assert track_res.status_code == 200
    assert track_res.json()["id"] == case_id
    assert track_res.json()["status"] == "Submitted"

    # Officer inspects the exact same canonical case docket
    off_res = client.get(f"/api/officer/complaints/{case_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert off_res.status_code == 200
    assert off_res.json()["id"] == case_id
    assert off_res.json()["category"] == "Fee Overcharging & Refund Denial"


# -----------------------------------------------------------------------------
# 3. MPNet + SVM Duplicate Recommendations Inspection
# -----------------------------------------------------------------------------
def test_3_mpnet_svm_recommendations_inspection(client, admin_token):
    db = SessionLocal()
    case = db.query(Case).filter(Case.institution_id == 1).first()
    assert case is not None
    case_id = case.id
    db.close()

    # Query duplicate candidates summary via Phase 6 AI endpoints
    res = client.get(f"/api/ai/duplicates/{case_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "complaint_id" in data
    assert "total_candidates_analyzed" in data

    # Query duplicate candidates list
    cand_res = client.get(f"/api/ai/duplicates/{case_id}/candidates", headers={"Authorization": f"Bearer {admin_token}"})
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    assert isinstance(candidates, list)

    # If candidates exist, verify distinct metrics: similarity_score vs duplicate_probability
    if len(candidates) > 0:
        first_cand = candidates[0]
        assert "similarity_score" in first_cand
        assert "duplicate_probability" in first_cand
        assert isinstance(first_cand["similarity_score"], (int, float))
        assert isinstance(first_cand["duplicate_probability"], (int, float))


# -----------------------------------------------------------------------------
# 4. Coordination Workspace Initiation with Linked Cases
# -----------------------------------------------------------------------------
def test_4_coordination_workspace_initiation(client, admin_token, citizen_session):
    db = SessionLocal()
    cases = db.query(Case).filter(Case.institution_id == 1).limit(2).all()
    assert len(cases) >= 2
    c1_id = cases[0].id
    c2_id = cases[1].id
    db.close()

    # Create coordination workspace
    unique_title = f"System Integration Joint Inquiry {int(datetime.utcnow().timestamp())}"
    create_res = client.post(
        "/api/coordination",
        json={
            "title": unique_title,
            "institution_id": 1,
            "primary_bureau_id": 1,
            "secondary_bureau_id": 2,
            "justification": "Joint regulatory inquiry required between Regulation Bureau and PGRC on infrastructural norms and fee extortion.",
            "linked_case_ids": [c1_id, c2_id]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 200, f"Failed to create workspace: {create_res.text}"
    ws = create_res.json()
    ws_id = ws["id"]
    assert ws["status"] == "In Coordination"

    # Verify both cases linked
    ws_detail = client.get(f"/api/coordination/{ws_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    linked_ids = ws_detail.get("linked_case_ids", [])
    assert c1_id in linked_ids
    assert c2_id in linked_ids

    # Verify confidential case event created with is_public=False
    db = SessionLocal()
    ev1 = db.query(CaseEvent).filter(CaseEvent.case_id == c1_id, CaseEvent.event_type == "COORDINATION_INITIATED").first()
    assert ev1 is not None
    assert ev1.is_public == False, "Coordination event must be strictly confidential (is_public=False)"
    db.close()

    # Citizen tracking must NOT reveal internal coordination events
    cit_track = client.get(f"/api/complainant/complaints/{c1_id}", headers={"Authorization": f"Bearer {citizen_session['token']}"})
    if cit_track.status_code == 200:
        events = cit_track.json().get("milestones", [])
        event_types = [e.get("event_type") for e in events]
        assert "COORDINATION_INITIATED" not in event_types, "Internal coordination must never leak to citizen milestones"


# -----------------------------------------------------------------------------
# 5. Task Assignment with DAG Dependency Auto-Unblocking
# -----------------------------------------------------------------------------
def test_5_task_dag_dependency_unblocking(client, admin_token):
    # Fetch active workspace
    ws_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"}).json()
    assert len(ws_res) > 0
    ws_id = ws_res[0]["id"]

    # 1. Create Prerequisite Task (Task A)
    task_a_res = client.post(
        f"/api/coordination/{ws_id}/tasks",
        json={
            "title": "On-Site Laboratory Infrastructure Inspection",
            "bureau_id": 1,
            "assigned_to_id": 4,
            "priority": "High",
            "due_date": (datetime.utcnow() + timedelta(days=5)).isoformat()
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert task_a_res.status_code == 200
    task_a_id = task_a_res.json()["id"]

    # 2. Create Dependent Task (Task B, depends on Task A)
    task_b_res = client.post(
        f"/api/coordination/{ws_id}/tasks",
        json={
            "title": "Formulate Joint Remediation & Penalty Order",
            "bureau_id": 2,
            "assigned_to_id": 5,
            "priority": "Critical",
            "due_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
            "depends_on_task_id": task_a_id
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert task_b_res.status_code == 200
    task_b = task_b_res.json()
    assert task_b["status"] == "Blocked", "Task B must be Blocked while Task A is incomplete"
    task_b_id = task_b["id"]

    # 3. Complete Task A -> Task B should auto-unblock
    complete_res = client.patch(
        f"/api/coordination/tasks/{task_a_id}?status=Completed&remarks=Physical%20inspection%20concluded%20with%20favorable%20report",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert complete_res.status_code == 200

    # 4. Check Task B status
    ws_updated = client.get(f"/api/coordination/{ws_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    updated_b = next((t for t in ws_updated.get("tasks", []) if t["id"] == task_b_id), None)
    assert updated_b is not None
    assert updated_b["status"] == "Pending", "Task B must be automatically unblocked to Pending upon Task A completion"


# -----------------------------------------------------------------------------
# 6. Action Conflict Detection & Elevation to Coordination
# -----------------------------------------------------------------------------
def test_6_action_conflict_elevation(client, admin_token):
    db = SessionLocal()
    cases = db.query(Case).filter(Case.institution_id == 1).limit(2).all()
    assert len(cases) >= 2
    c1 = cases[0]
    c2 = cases[1]
    
    # Establish contradictory directives
    c1.last_action = "Compliance verified and clean chit issued"
    c2.last_action = "Show cause notice and punitive inspection ordered"
    db.commit()

    # Verify conflict engine rule
    conflict_eval = check_action_conflict(c1, c2)
    assert conflict_eval is not None
    assert conflict_eval["conflict_type"] == "Conflicting Direction"

    # Create alert if none exists
    alert = db.query(ActionConflictAlert).filter(
        ActionConflictAlert.case_a_id == c1.id,
        ActionConflictAlert.case_b_id == c2.id
    ).first()
    if not alert:
        alert = ActionConflictAlert(
            case_a_id=c1.id,
            case_b_id=c2.id,
            institution_id=1,
            conflict_type=conflict_eval["conflict_type"],
            rule_triggered=conflict_eval["rule_triggered"],
            severity=conflict_eval["severity"],
            evidence=conflict_eval["evidence"],
            status="Pending Review"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
    alert_id = alert.id
    db.close()

    # Officer reviews with COORDINATE decision
    rev_res = client.post(
        f"/api/action-conflicts/{alert_id}/review",
        json={
            "decision": "COORDINATE",
            "resolution_notes": "Convene joint Standing Coordination meeting to reconcile opposing orders.",
            "coordination_title": "Directive Reconciliation Joint Workspace"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert rev_res.status_code == 200
    res_data = rev_res.json()
    assert res_data["coordination_workspace_id"] is not None

    # Verify alert updated
    db = SessionLocal()
    updated_alert = db.query(ActionConflictAlert).filter(ActionConflictAlert.id == alert_id).first()
    assert updated_alert.status == "In Coordination"
    db.close()


# -----------------------------------------------------------------------------
# 7. Escalation Engine, Notifications & Audit Trail Logging
# -----------------------------------------------------------------------------
def test_7_escalations_notifications_audit(client, admin_token):
    # Trigger escalation scan
    esc_res = client.post("/api/coordination/escalations/scan", headers={"Authorization": f"Bearer {admin_token}"})
    assert esc_res.status_code == 200
    assert "results" in esc_res.json()

    # Check escalation summary
    sum_res = client.get("/api/coordination/escalations/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert "overdue_tasks" in summary
    assert "stalled_workspaces_14d" in summary

    # Verify audit logs record coordination events
    db = SessionLocal()
    coord_audits = db.query(AuditLog).filter(
        AuditLog.event_type.in_([
            "COORDINATION_WORKSPACE_CREATE",
            "COORDINATION_TASK_CREATED",
            "COORDINATION_TASK_STATUS_UPDATED",
            "ACTION_CONFLICT_DECISION"
        ])
    ).all()
    assert len(coord_audits) > 0, "Coordination actions must appear in AuditLog"
    db.close()


# -----------------------------------------------------------------------------
# 8. Dashboard KPIs Connected to Real Database Records
# -----------------------------------------------------------------------------
def test_8_dashboard_kpis_real_metrics(client, admin_token):
    res = client.get("/api/dashboard/kpis", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    kpis = res.json()

    assert "total_complaints" in kpis
    assert "active_coordination_workspaces" in kpis
    assert "coordination_tasks_pending" in kpis
    assert isinstance(kpis["active_coordination_workspaces"], int)
    assert isinstance(kpis["coordination_tasks_pending"], int)
    assert kpis["active_coordination_workspaces"] >= 1, "At least one active workspace must be counted in live KPIs"


# -----------------------------------------------------------------------------
# 9. Security & Citizen Privacy Fencing
# -----------------------------------------------------------------------------
def test_9_citizen_privacy_fencing(client, citizen_session):
    token = citizen_session["token"]

    # 1. Complainant forbidden from listing coordination workspaces
    c_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {token}"})
    assert c_res.status_code == 403, "Citizens must receive HTTP 403 on /coordination"

    # 2. Complainant forbidden from action conflicts
    ac_res = client.get("/api/action-conflicts", headers={"Authorization": f"Bearer {token}"})
    assert ac_res.status_code == 403, "Citizens must receive HTTP 403 on /action-conflicts"

    # 3. Complainant forbidden from overlaps center
    ov_res = client.get("/api/overlaps", headers={"Authorization": f"Bearer {token}"})
    assert ov_res.status_code in [403, 404]

    # 4. Unauthenticated caller gets 401
    unauth_res = client.get("/api/coordination")
    assert unauth_res.status_code == 401

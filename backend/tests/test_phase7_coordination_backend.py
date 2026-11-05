"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 7: Cross-Bureau Coordination & Action Conflict Intelligence Backend Test Suite

Tests:
1. Workspace Lifecycle: manual creation, duplicate prevention, retrieval, metadata updates.
2. Participant Management: add participant, duplicate prevention, removal, lead owner protection.
3. Case Linking: attach case, detach case, non-public CaseEvent audit.
4. Task DAG Dependency Engine: dependency creation, blocked initial status, circular dependency rejection, self-dependency rejection.
5. Task Status & RBAC: unauthorized update rejection (HTTP 403), status completion, automatic unblocking of dependent tasks.
6. Joint Meeting Records: log meeting proceedings and attendees.
7. Workspace Resolution & Reopening: consensus recording, case sync, authorized reopen.
8. Action Conflict Detection: contradictory orders, duplicate inspections, status mismatch, incompatible deadlines.
9. Action Conflict Review: COORDINATE decision launches coordination workspace and links cases.
10. System Scans: Action conflicts scan-all and Deterministic responsibility overlaps scan.
11. Escalation Engine: overdue detection, approaching deadlines, notification de-duplication.
12. Security & Citizen Isolation: Complainant rejection (HTTP 403), unauthenticated rejection (HTTP 401), confidentiality fence (is_public=False).
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.models import (
    Case, Institution, User, Bureau, CoordinationWorkspace,
    CoordinationParticipant, CoordinationTask, CaseCoordinationLink,
    ActionConflictAlert, OverlapAlert, CaseEvent, Notification, AuditLog
)
from app.services.conflict_engine import check_action_conflict
from app.services.overlap_engine import classify_responsibility_relationship


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
def complainant_token(client):
    email = f"citizen_p7_{int(datetime.utcnow().timestamp())}@example.com"
    mobile = f"97{str(int(datetime.utcnow().timestamp()))[-8:]}"
    reg_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Citizen Phase 7 Tester",
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
def test_cases():
    db = SessionLocal()
    cases = db.query(Case).filter(Case.institution_id == 1).limit(2).all()
    assert len(cases) >= 2, "Need at least 2 cases for Institution 1"
    c_ids = [cases[0].id, cases[1].id]
    db.close()
    return c_ids


# -----------------------------------------------------------------------------
# Test 1: Workspace Creation & Duplicate Prevention
# -----------------------------------------------------------------------------
def test_1_workspace_creation_and_deduplication(client, admin_token, test_cases):
    ts = int(datetime.utcnow().timestamp())
    title = f"Phase 7 Joint Inquiry {ts}"
    
    # 1. Create Workspace
    payload = {
        "title": title,
        "institution_id": 1,
        "primary_bureau_id": 1,
        "secondary_bureau_id": 2,
        "justification": "Joint regulatory inquiry into infrastructure deficiencies and student fee grievances.",
        "linked_case_ids": [test_cases[0]],
        "participant_ids": [4, 5]  # officer_rb, officer_pgrc
    }
    res = client.post("/api/coordination", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == title
    assert data["status"] == "In Coordination"
    assert test_cases[0] in data["linked_case_ids"]
    assert len(data["participants"]) >= 2
    ws_id = data["id"]

    # Verify non-public CaseEvent was logged
    db = SessionLocal()
    event = db.query(CaseEvent).filter(
        CaseEvent.case_id == test_cases[0],
        CaseEvent.event_type == "COORDINATION_INITIATED"
    ).first()
    assert event is not None
    assert event.is_public == False, "Internal coordination events must not be public"
    db.close()

    # 2. Duplicate Prevention: Attempt creating identical workspace
    dup_res = client.post("/api/coordination", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]


# -----------------------------------------------------------------------------
# Test 2: Workspace Detail & Metadata Update
# -----------------------------------------------------------------------------
def test_2_workspace_detail_and_update(client, admin_token):
    # Fetch list
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_res.status_code == 200
    workspaces = list_res.json()
    assert len(workspaces) > 0
    ws = workspaces[0]

    # Fetch detail
    detail_res = client.get(f"/api/coordination/{ws['id']}", headers={"Authorization": f"Bearer {admin_token}"})
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == ws["id"]
    assert "tasks" in detail
    assert "participants" in detail

    # Update metadata
    update_res = client.patch(
        f"/api/coordination/{ws['id']}",
        json={"justification": "Updated statutory justification for coordinated action."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200
    assert "Updated statutory justification" in update_res.json()["justification"]


# -----------------------------------------------------------------------------
# Test 3: Participant Management & RBAC Protection
# -----------------------------------------------------------------------------
def test_3_participant_management_and_rbac(client, admin_token):
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    ws_id = list_res.json()[0]["id"]

    # 1. Add new participant (officer 6 / monitor)
    add_res = client.post(
        f"/api/coordination/{ws_id}/participants",
        json={"officer_id": 6, "bureau_id": 4, "role": "Observer"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert add_res.status_code in [200, 400]  # 400 if already participant

    # 2. Duplicate participant prevention
    dup_res = client.post(
        f"/api/coordination/{ws_id}/participants",
        json={"officer_id": 6, "bureau_id": 4, "role": "Observer"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert dup_res.status_code == 400

    # 3. Protect workspace lead owner from removal
    db = SessionLocal()
    ws_owner_id = db.query(CoordinationWorkspace.coordination_owner_id).filter(CoordinationWorkspace.id == ws_id).scalar()
    db.close()
    
    owner_rem_res = client.delete(
        f"/api/coordination/{ws_id}/participants/{ws_owner_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert owner_rem_res.status_code == 400
    assert "Cannot remove the workspace lead" in owner_rem_res.json()["detail"]

    # 4. Remove observer participant
    rem_res = client.delete(
        f"/api/coordination/{ws_id}/participants/6",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert rem_res.status_code == 200


# -----------------------------------------------------------------------------
# Test 4: Case Linking & Detaching
# -----------------------------------------------------------------------------
def test_4_case_linking_and_detaching(client, admin_token, test_cases):
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    ws_id = list_res.json()[0]["id"]
    target_case = test_cases[1]

    # Link case
    link_res = client.post(
        f"/api/coordination/{ws_id}/cases",
        json={"case_id": target_case},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert link_res.status_code in [200, 400]

    # Detach case
    detach_res = client.delete(
        f"/api/coordination/{ws_id}/cases/{target_case}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert detach_res.status_code == 200

    # Verify audit and confidential case event
    db = SessionLocal()
    evt = db.query(CaseEvent).filter(
        CaseEvent.case_id == target_case,
        CaseEvent.event_type == "COORDINATION_CASE_DETACHED"
    ).first()
    assert evt is not None
    assert evt.is_public == False
    db.close()


# -----------------------------------------------------------------------------
# Test 5: Task DAG Dependencies & Circular Prevention
# -----------------------------------------------------------------------------
def test_5_task_dag_dependencies_and_circular_prevention(client, admin_token, officer_rb_token):
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    ws_id = list_res.json()[0]["id"]
    due = (datetime.utcnow() + timedelta(days=5)).isoformat()

    # 1. Create Parent Task (Task A)
    task_a_res = client.post(
        f"/api/coordination/{ws_id}/tasks",
        json={
            "title": "Task A: Campus Inspection Report",
            "description": "Conduct preliminary verification of laboratories.",
            "assigned_to_id": 4,  # officer_rb
            "bureau_id": 1,
            "due_date": due,
            "priority": "High"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert task_a_res.status_code == 200
    task_a = task_a_res.json()
    assert task_a["status"] == "Pending"

    # 2. Create Child Task (Task B depends on Task A)
    task_b_res = client.post(
        f"/api/coordination/{ws_id}/tasks",
        json={
            "title": "Task B: Grievance Evaluation Hearing",
            "description": "Evaluate findings after Task A inspection is submitted.",
            "assigned_to_id": 5,  # officer_pgrc
            "bureau_id": 2,
            "due_date": due,
            "priority": "High",
            "depends_on_task_id": task_a["id"]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert task_b_res.status_code == 200
    task_b = task_b_res.json()
    assert task_b["status"] == "Blocked", "Task B must start in Blocked status until Task A completes"

    # 3. Prevent Self-Dependency (Task A depends on Task A)
    self_dep_res = client.patch(
        f"/api/coordination/tasks/{task_a['id']}",
        json={"depends_on_task_id": task_a["id"]},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert self_dep_res.status_code == 400
    assert "cannot depend on itself" in self_dep_res.json()["detail"]

    # 4. Prevent Circular Dependency (Task A depends on Task B while Task B depends on Task A)
    cycle_res = client.patch(
        f"/api/coordination/tasks/{task_a['id']}",
        json={"depends_on_task_id": task_b["id"]},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert cycle_res.status_code == 400
    assert "Circular dependency detected" in cycle_res.json()["detail"]


# -----------------------------------------------------------------------------
# Test 6: Task RBAC Security & Auto-Unlock on Completion
# -----------------------------------------------------------------------------
def test_6_task_rbac_security_and_auto_unlock(client, admin_token, officer_rb_token, officer_pgrc_token):
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    ws_id = list_res.json()[0]["id"]
    ws_detail = client.get(f"/api/coordination/{ws_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    
    tasks = ws_detail["tasks"]
    task_a = next((t for t in tasks if t["title"] == "Task A: Campus Inspection Report"), None)
    task_b = next((t for t in tasks if t["title"] == "Task B: Grievance Evaluation Hearing"), None)
    assert task_a and task_b

    # 1. RBAC Guard: officer_pgrc cannot update Task A assigned to officer_rb
    unauth_res = client.patch(
        f"/api/coordination/tasks/{task_a['id']}",
        json={"status": "Completed"},
        headers={"Authorization": f"Bearer {officer_pgrc_token}"}
    )
    assert unauth_res.status_code == 403, "Unassigned officer must not be permitted to update task"

    # 2. Authorized Assignee (officer_rb) completes Task A
    complete_res = client.patch(
        f"/api/coordination/tasks/{task_a['id']}",
        json={"status": "Completed", "remarks": "Inspection complete and lab reports verified."},
        headers={"Authorization": f"Bearer {officer_rb_token}"}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "Completed"
    assert complete_res.json()["unlocked_tasks"] >= 1

    # 3. Verify Task B is automatically unblocked from 'Blocked' to 'Pending'
    updated_ws = client.get(f"/api/coordination/{ws_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    updated_task_b = next(t for t in updated_ws["tasks"] if t["id"] == task_b["id"])
    assert updated_task_b["status"] == "Pending", "Task B should have transitioned from Blocked to Pending"


# -----------------------------------------------------------------------------
# Test 7: Joint Meeting Records
# -----------------------------------------------------------------------------
def test_7_joint_meeting_recording(client, admin_token):
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    ws_id = list_res.json()[0]["id"]

    meeting_payload = {
        "meeting_date": datetime.utcnow().isoformat(),
        "chair_name": "Standing Coordination Committee Chair",
        "attendee_ids": [1, 4, 5],
        "discussion_summary": "Standing committee reviewed preliminary laboratory audit findings.",
        "action_items": [
            "Regional Bureau to finalize physical inspection affidavit by Friday",
            "PGRC to conduct final hearing on student fee refunds next Monday"
        ]
    }
    res = client.post(
        f"/api/coordination/{ws_id}/meetings",
        json=meeting_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert "meeting" in res.json()
    assert res.json()["meeting"]["chair_name"] == "Standing Coordination Committee Chair"


# -----------------------------------------------------------------------------
# Test 8: Workspace Resolution & Reopening
# -----------------------------------------------------------------------------
def test_8_workspace_resolution_and_reopen(client, admin_token):
    list_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {admin_token}"})
    ws_id = list_res.json()[0]["id"]

    # 1. Resolve Workspace
    resolve_payload = {
        "resolution_status": "Completed",
        "consensus_decisions": "Joint Committee directed full refund of unauthorized fees and verified laboratory infrastructure.",
        "apply_to_cases": True
    }
    resolve_res = client.post(
        f"/api/coordination/{ws_id}/resolve",
        json=resolve_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resolve_res.status_code == 200

    detail = client.get(f"/api/coordination/{ws_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    assert detail["status"] == "Completed"
    assert "directed full refund" in detail["decisions"]

    # 2. Reopen Workspace
    reopen_res = client.post(
        f"/api/coordination/{ws_id}/reopen?justification=New%20contempt%20allegations%20received%20requiring%20inter-bureau%20verification.",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "In Coordination"


# -----------------------------------------------------------------------------
# Test 9: Action Conflict Detection Engine Rules
# -----------------------------------------------------------------------------
def test_9_action_conflict_detection_engine_rules():
    """Unit test for statutory action conflict rule evaluation."""
    db = SessionLocal()
    cases = db.query(Case).filter(Case.institution_id == 1).limit(2).all()
    if len(cases) >= 2:
        c1, c2 = cases[0], cases[1]
        
        # Test Opposing Directives
        c1.last_action = "Compliance verified and clean chit issued"
        c2.last_action = "Show cause notice and punitive inspection ordered"
        conflict = check_action_conflict(c1, c2)
        assert conflict is not None
        assert conflict["conflict_type"] == "Conflicting Direction"
        assert conflict["severity"] == "Critical"

        # Test Duplicate Inspection
        c1.last_action = "Surprise inspection by expert visit committee ordered"
        c2.last_action = "Physical inspection by expert committee scheduled"
        dup_conflict = check_action_conflict(c1, c2)
        assert dup_conflict is not None
        assert dup_conflict["conflict_type"] == "Duplicate Action"
    db.close()


# -----------------------------------------------------------------------------
# Test 10: Action Conflict Review with COORDINATE Decision
# -----------------------------------------------------------------------------
def test_10_action_conflict_coordinate_decision(client, admin_token, test_cases):
    db = SessionLocal()
    # Ensure an alert exists
    alert = db.query(ActionConflictAlert).first()
    if not alert:
        alert = ActionConflictAlert(
            case_a_id=test_cases[0],
            case_b_id=test_cases[1],
            institution_id=1,
            conflict_type="Conflicting Direction",
            rule_triggered="Contradictory Regulatory Directive",
            severity="Critical",
            evidence={"explanation": "Direct contradiction between compliance and punitive action"},
            status="Pending Review"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
    alert_id = alert.id
    db.close()

    # Review with COORDINATE
    res = client.post(
        f"/api/action-conflicts/{alert_id}/review",
        json={
            "decision": "COORDINATE",
            "resolution_notes": "Convene joint Standing Coordination meeting to harmonize official Council stance.",
            "coordination_title": "Inter-Bureau Directive Harmonization Workspace"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["coordination_workspace_id"] is not None

    # Verify alert updated in database
    db = SessionLocal()
    updated_cf = db.query(ActionConflictAlert).filter(ActionConflictAlert.id == alert_id).first()
    assert updated_cf.status == "In Coordination"
    assert updated_cf.coordination_workspace_id is not None
    db.close()


# -----------------------------------------------------------------------------
# Test 11: System-Wide Scans
# -----------------------------------------------------------------------------
def test_11_system_wide_scans(client, admin_token):
    # Action Conflict Scan
    cf_res = client.post("/api/action-conflicts/scan-all", headers={"Authorization": f"Bearer {admin_token}"})
    assert cf_res.status_code == 200
    assert "results" in cf_res.json()
    assert "pairs_evaluated" in cf_res.json()["results"]

    # Deterministic Overlap Scan
    ov_res = client.post("/api/overlaps/scan-responsibility", headers={"Authorization": f"Bearer {admin_token}"})
    assert ov_res.status_code == 200
    assert "results" in ov_res.json()
    assert "pairs_evaluated" in ov_res.json()["results"]


# -----------------------------------------------------------------------------
# Test 12: Escalation Engine & Notification De-Duplication
# -----------------------------------------------------------------------------
def test_12_escalation_engine_and_deduplication(client, admin_token):
    # 1. Trigger escalation scan
    res_1 = client.post("/api/coordination/escalations/scan", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_1.status_code == 200
    assert "results" in res_1.json()

    # 2. Trigger scan again immediately (Notification de-duplication must prevent spam)
    res_2 = client.post("/api/coordination/escalations/scan", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_2.status_code == 200
    # Notifications dispatched on immediate re-scan should be 0 because unread alerts already exist
    assert res_2.json()["results"]["notifications_dispatched"] == 0

    # 3. Escalations summary endpoint
    sum_res = client.get("/api/coordination/escalations/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert "overdue_tasks" in summary
    assert "approaching_deadlines" in summary
    assert "unresolved_conflicts_72h" in summary
    assert "stalled_workspaces_14d" in summary


# -----------------------------------------------------------------------------
# Test 13: Security & Citizen Privacy Isolation
# -----------------------------------------------------------------------------
def test_13_security_and_citizen_isolation(client, complainant_token):
    # 1. Citizen cannot access coordination workspaces
    c_res = client.get("/api/coordination", headers={"Authorization": f"Bearer {complainant_token}"})
    assert c_res.status_code == 403, "Complainants must be denied access to internal coordination APIs"

    # 2. Citizen cannot access action conflicts
    ac_res = client.get("/api/action-conflicts", headers={"Authorization": f"Bearer {complainant_token}"})
    assert ac_res.status_code == 403, "Complainants must be denied access to action conflict APIs"

    # 3. Unauthenticated access blocked
    unauth_res = client.get("/api/coordination")
    assert unauth_res.status_code == 401

    # 4. Verify all case events created by coordination are internal (is_public=False)
    db = SessionLocal()
    coord_events = db.query(CaseEvent).filter(
        CaseEvent.event_type.in_([
            "COORDINATION_INITIATED", "COORDINATION_RESOLVED",
            "COORDINATION_CASE_ATTACHED", "COORDINATION_CASE_DETACHED"
        ])
    ).all()
    for ev in coord_events:
        assert ev.is_public == False, f"Event {ev.id} ({ev.event_type}) was marked public!"
    db.close()


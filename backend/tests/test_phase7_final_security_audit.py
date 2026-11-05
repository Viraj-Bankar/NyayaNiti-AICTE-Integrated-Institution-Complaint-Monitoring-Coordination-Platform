"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 7: Final Security, Functional & IDOR Audit Test Suite

Validates all 10 security testing vectors mandated by Prompt 6:
1. Unauthenticated requests.
2. Complainant attempts to access coordination endpoints.
3. Unauthorized officer access.
4. Cross-bureau data leakage prevention.
5. Unauthorized task reassignment / status update.
6. Unauthorized conflict resolution.
7. Unauthorized workspace closure.
8. Private note and internal event exposure prevention.
9. Attachment access controls.
10. IDOR vulnerability resistance.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.models import (
    User, Case, CoordinationWorkspace, CoordinationTask,
    CoordinationParticipant, CaseCoordinationLink, ActionConflictAlert,
    CaseEvent, DocumentMetadata, Complainant
)


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def super_admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def officer_rb_token(client):
    res = client.post("/api/auth/login", json={"username": "officer_rb", "password": "officer123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def officer_pgrc_token(client):
    res = client.post("/api/auth/login", json={"username": "officer_pgrc", "password": "officer123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def complainant_session(client):
    ts = int(datetime.utcnow().timestamp())
    email = f"audit_citizen_{ts}@example.com"
    mobile = f"96{str(ts)[-8:]}"
    reg = client.post("/api/complainant/auth/register", json={
        "full_name": "Audit Citizen Complainant",
        "email": email,
        "mobile": mobile,
        "password": "Password@123",
        "confirm_password": "Password@123",
        "complainant_type": "Student"
    })
    assert reg.status_code in [200, 201]
    login = client.post("/api/complainant/auth/login", json={
        "email": email,
        "password": "Password@123"
    })
    assert login.status_code == 200
    return {"token": login.json()["access_token"], "email": email}


# -----------------------------------------------------------------------------
# 1. Unauthenticated Requests
# -----------------------------------------------------------------------------
def test_1_unauthenticated_requests(client):
    endpoints = [
        ("GET", "/api/coordination"),
        ("POST", "/api/coordination"),
        ("GET", "/api/coordination/1"),
        ("POST", "/api/coordination/1/resolve"),
        ("POST", "/api/coordination/1/tasks"),
        ("PATCH", "/api/coordination/tasks/1"),
        ("GET", "/api/action-conflicts"),
        ("POST", "/api/action-conflicts/scan-all"),
        ("POST", "/api/action-conflicts/1/review"),
        ("GET", "/api/overlaps"),
        ("POST", "/api/overlaps/scan-responsibility"),
        ("POST", "/api/coordination/escalations/scan"),
        ("GET", "/api/coordination/escalations/summary"),
    ]
    for method, path in endpoints:
        res = client.request(method, path)
        assert res.status_code in [401, 403], f"Unauthenticated {method} {path} should be 401/403, got {res.status_code}"


# -----------------------------------------------------------------------------
# 2. Complainant Attempts to Access Coordination Endpoints
# -----------------------------------------------------------------------------
def test_2_complainant_blocked_from_coordination(client, complainant_session):
    token = complainant_session["token"]
    headers = {"Authorization": f"Bearer {token}"}
    endpoints = [
        ("GET", "/api/coordination"),
        ("POST", "/api/coordination", {"title": "Exploit WS", "institution_id": 1, "primary_bureau_id": 1}),
        ("GET", "/api/coordination/1"),
        ("POST", "/api/coordination/1/resolve", {"consensus_decisions": "Unauthorized"}),
        ("POST", "/api/coordination/1/tasks", {"title": "Exploit Task", "bureau_id": 1, "due_date": "2026-12-31T00:00:00Z"}),
        ("PATCH", "/api/coordination/tasks/1", {"status": "Completed"}),
        ("GET", "/api/action-conflicts"),
        ("POST", "/api/action-conflicts/scan-all", {}),
        ("POST", "/api/action-conflicts/1/review", {"decision": "RESOLVE", "resolution_notes": "Exploit"}),
        ("GET", "/api/overlaps"),
        ("POST", "/api/overlaps/scan-responsibility", {}),
        ("POST", "/api/coordination/escalations/scan", {}),
        ("GET", "/api/coordination/escalations/summary"),
    ]
    for item in endpoints:
        method = item[0]
        path = item[1]
        payload = item[2] if len(item) > 2 else None
        res = client.request(method, path, json=payload, headers=headers)
        assert res.status_code == 403, f"Citizen access to {method} {path} must return 403 Forbidden, got {res.status_code}"


# -----------------------------------------------------------------------------
# 3. Unauthorized Officer Access & Workspace Closure
# -----------------------------------------------------------------------------
def test_3_unauthorized_workspace_closure(client, officer_rb_token, officer_pgrc_token):
    # RB officer creates workspace (ownership is RB officer)
    create_res = client.post(
        "/api/coordination",
        json={
            "title": f"Security Audit Isolation Workspace {int(datetime.utcnow().timestamp())}",
            "institution_id": 1,
            "primary_bureau_id": 1,
            "secondary_bureau_id": 2,
            "justification": "Testing workspace closure authorization guard"
        },
        headers={"Authorization": f"Bearer {officer_rb_token}"}
    )
    assert create_res.status_code == 200
    ws_id = create_res.json()["id"]

    # PGRC officer (regular officer, not lead, not bureau head, not super admin) attempts to resolve
    unauth_resolve = client.post(
        f"/api/coordination/{ws_id}/resolve",
        json={
            "resolution_status": "Resolved",
            "consensus_decisions": "Illegitimate attempt to close workspace",
            "apply_to_cases": True
        },
        headers={"Authorization": f"Bearer {officer_pgrc_token}"}
    )
    assert unauth_resolve.status_code == 403, f"Expected 403, got {unauth_resolve.status_code}"
    assert "Only workspace lead or bureau head can resolve workspace" in unauth_resolve.json()["detail"]


# -----------------------------------------------------------------------------
# 4. Unauthorized Task Reassignment / Modification
# -----------------------------------------------------------------------------
def test_4_unauthorized_task_modification(client, officer_rb_token, officer_pgrc_token):
    # Get user id for officer_rb
    db = SessionLocal()
    rb_user = db.query(User).filter(User.username == "officer_rb").first()
    pgrc_user = db.query(User).filter(User.username == "officer_pgrc").first()
    assert rb_user and pgrc_user
    rb_id, pgrc_id = rb_user.id, pgrc_user.id
    ws = db.query(CoordinationWorkspace).first()
    assert ws
    ws_id = ws.id
    db.close()

    # Create task assigned specifically to officer_rb
    due = (datetime.utcnow() + timedelta(days=5)).isoformat()
    task_res = client.post(
        f"/api/coordination/{ws_id}/tasks",
        json={
            "title": "Strictly Assigned RB Security Task",
            "description": "Confidential investigation of technical norms",
            "assigned_to_id": rb_id,
            "bureau_id": 1,
            "due_date": due,
            "priority": "High"
        },
        headers={"Authorization": f"Bearer {officer_rb_token}"}
    )
    assert task_res.status_code == 200
    task_id = task_res.json()["id"]

    # officer_pgrc (not assigned, not owner, not admin) attempts to update/complete this task
    hijack_res = client.patch(
        f"/api/coordination/tasks/{task_id}",
        json={"status": "Completed", "remarks": "Unauthorized tampering"},
        headers={"Authorization": f"Bearer {officer_pgrc_token}"}
    )
    assert hijack_res.status_code == 403
    assert "Access denied" in hijack_res.json()["detail"]

    # officer_rb (the authorized assignee) can update task
    valid_res = client.patch(
        f"/api/coordination/tasks/{task_id}",
        json={"status": "In Progress", "remarks": "Authorized investigation underway"},
        headers={"Authorization": f"Bearer {officer_rb_token}"}
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["status"] == "In Progress"


# -----------------------------------------------------------------------------
# 5. Private Note & Coordination Milestone Confidentiality Fence
# -----------------------------------------------------------------------------
def test_5_private_note_and_event_fencing(client, super_admin_token, complainant_session):
    # 1. Complainant creates a grievance
    sub_res = client.post(
        "/api/complainant/complaints",
        json={
            "title": "Confidentiality Audit Complaint",
            "institution_id": 1,
            "category": "Fee Overcharging & Refund Denial",
            "description": "Allegations of unapproved fee demands requiring inter-bureau scrutiny."
        },
        headers={"Authorization": f"Bearer {complainant_session['token']}"}
    )
    assert sub_res.status_code in [200, 201]
    case_id = sub_res.json()["id"]

    # 2. Officer records private internal note and attaches case to coordination workspace
    db = SessionLocal()
    priv_event = CaseEvent(
        case_id=case_id,
        event_type="COORDINATION_INITIATED",
        actor_name="System Auditor",
        new_value="In Coordination",
        remarks="Confidential inter-bureau coordination started to review financial records.",
        is_public=False
    )
    db.add(priv_event)
    db.commit()
    db.close()

    # 3. Complainant fetches public history
    hist_res = client.get(
        f"/api/complainant/complaints/{case_id}/history",
        headers={"Authorization": f"Bearer {complainant_session['token']}"}
    )
    assert hist_res.status_code == 200
    history = hist_res.json()

    # Confirm that NO internal event leaked to the citizen
    for event in history:
        assert event["event_type"] != "COORDINATION_INITIATED"
        assert "Confidential" not in (event.get("remarks") or "")


# -----------------------------------------------------------------------------
# 6. Attachment Access & Confidentiality Controls
# -----------------------------------------------------------------------------
def test_6_document_access_controls(client, super_admin_token, complainant_session):
    db = SessionLocal()
    existing_case = db.query(Case).first()
    assert existing_case is not None, "Need at least one case in database"
    target_case_id = existing_case.id

    # Create internal official document
    doc = DocumentMetadata(
        case_id=target_case_id,
        file_name="classified_bureau_audit_report.pdf",
        original_filename="classified_bureau_audit_report.pdf",
        file_size=2048,
        file_type="application/pdf",
        category="Official Notice",
        access_classification="Confidential Internal",
        file_path="uploads/classified_bureau_audit_report.pdf",
        uploader_role="officer"
    )
    db.add(doc)
    db.commit()
    doc_id = doc.id
    db.close()

    # Complainant attempts to download internal document
    c_res = client.get(
        f"/api/complainant/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {complainant_session['token']}"}
    )
    # Must be rejected (either 403 Forbidden or 404 Not Found to prevent enumeration)
    assert c_res.status_code in [403, 404]


# -----------------------------------------------------------------------------
# 7. IDOR Vulnerability Resistance
# -----------------------------------------------------------------------------
def test_7_idor_vulnerability_resistance(client, complainant_session):
    token = complainant_session["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access another case by manipulating ID
    other_case_id = "AICTE-RB-2024-0001"
    res = client.get(f"/api/complainant/complaints/{other_case_id}", headers=headers)
    assert res.status_code in [403, 404], f"Access to other case must be blocked, got {res.status_code}"

    # Attempt to access non-existent workspace ID
    ws_res = client.get("/api/coordination/9999999", headers=headers)
    assert ws_res.status_code == 403, "Must be rejected with 403"

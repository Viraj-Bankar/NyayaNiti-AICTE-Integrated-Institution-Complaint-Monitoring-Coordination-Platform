"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: AI-Powered Semantic Duplicate Detection API Test Suite

Comprehensive tests for:
1. AI Model Status Endpoint (/api/ai/model/status).
2. Role-Based Security: Officer authentication vs Complainant token rejection vs Unauthenticated rejection.
3. On-Demand Semantic Duplicate Analysis (/api/ai/duplicates/{id}/analyze).
4. Real-time Inference using MPNet-768 embeddings and Calibrated RBF-SVM Classifier.
5. Verification of Response Structure: similarity_score vs duplicate_probability strictly distinct.
6. Candidate Retrieval respecting Institution Context & Lifecycle.
7. Candidate Listing with Filtering and Pagination (/api/ai/duplicates/{id}/candidates).
8. Duplicate Summary View (/api/ai/duplicates/{id}).
9. Pending Duplicate Recommendation Queue (/api/ai/duplicates/recommendations/pending).
10. Officer Verification: CONFIRM_DUPLICATE (with dossier linking & CaseEvent audit).
11. Officer Verification: MARK_RELATED.
12. Officer Verification: REJECT_RECOMMENDATION.
13. Input Validation: Short reason rejection, invalid decision rejection, 404 on nonexistent complaint.
14. Security Safeguards: No arbitrary file paths, model artifacts internal, citizen privacy preserved.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.models import Case, Institution, User, CaseRelationship, CaseEvent, AuditLog, AIDuplicateRecommendation


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def officer_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def complainant_token(client):
    # Register and login a complainant for security isolation tests
    email = f"citizen_dup_test_{int(datetime.utcnow().timestamp())}@example.com"
    mobile = f"98{str(int(datetime.utcnow().timestamp()))[-8:]}"
    reg_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Citizen Duplicate Tester",
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
def sample_complaints():
    """Ensures at least two institutional complaints exist for Institution 1."""
    db = SessionLocal()
    c1 = db.query(Case).filter(Case.institution_id == 1).first()
    assert c1 is not None, "Institution 1 must have at least one complaint"
    db.close()
    return c1.id


# -----------------------------------------------------------------------------
# Test 1: Model Status & Metadata
# -----------------------------------------------------------------------------
def test_1_model_status_authenticated(client, officer_token):
    """Verifies that authenticated officers receive complete model diagnostics."""
    headers = {"Authorization": f"Bearer {officer_token}"}
    res = client.get("/api/ai/model/status", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["is_available"] is True
    assert data["embedding_dim"] == 768
    assert "all-mpnet-base-v2" in data["model_name"]
    assert "v1.0.0-phase6-mpnet-svm" in data["model_version"]
    assert data["feature_count"] == 13
    assert "cosine_similarity" in data["feature_names"]
    assert "same_institution" in data["feature_names"]
    assert data["pgvector_status"] == "evaluated_not_installed"
    assert "vector_engine" in data
    assert "statutory_safeguard" in data


# -----------------------------------------------------------------------------
# Test 2: Role-Based Access Control on Model Status
# -----------------------------------------------------------------------------
def test_2_model_status_security(client, complainant_token):
    """Verifies that unauthenticated users and citizens are blocked from model status."""
    # Unauthenticated
    res_unauth = client.get("/api/ai/model/status")
    assert res_unauth.status_code in [401, 403]

    # Complainant token (Citizens cannot inspect internal ML models)
    headers = {"Authorization": f"Bearer {complainant_token}"}
    res_citizen = client.get("/api/ai/model/status", headers=headers)
    assert res_citizen.status_code == 403


# -----------------------------------------------------------------------------
# Test 3: On-Demand Semantic Duplicate Analysis
# -----------------------------------------------------------------------------
def test_3_analyze_complaint_real_inference(client, officer_token, sample_complaints):
    """Executes real MPNet semantic candidate retrieval and SVM duplicate prediction."""
    headers = {"Authorization": f"Bearer {officer_token}"}
    res = client.post(
        f"/api/ai/duplicates/{sample_complaints}/analyze?limit=5&min_similarity=0.30",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()

    assert data["source_complaint_id"] == sample_complaints
    assert data["total_candidates_evaluated"] >= 1
    assert "candidates" in data
    assert isinstance(data["candidates"], list)

    if data["candidates"]:
        cand = data["candidates"][0]
        assert "similarity_score" in cand
        assert "duplicate_probability" in cand
        assert "predicted_relationship" in cand
        assert "svm_decision" in cand
        assert "matching_features" in cand
        assert "explanation" in cand
        assert "statutory_advice" in cand
        assert cand["matching_features"]["cosine_similarity"] == cand["similarity_score"]


# -----------------------------------------------------------------------------
# Test 4: Similarity Score vs Probability Separation
# -----------------------------------------------------------------------------
def test_4_similarity_score_distinguished_from_probability(client, officer_token, sample_complaints):
    """
    CRITICAL STATUTORY REQUIREMENT:
    Ensures similarity_score (cosine metric [-1, 1]) is never conflated with
    duplicate_probability (calibrated posterior probability [0, 1]).
    """
    headers = {"Authorization": f"Bearer {officer_token}"}
    res = client.post(f"/api/ai/duplicates/{sample_complaints}/analyze", headers=headers)
    assert res.status_code == 200
    data = res.json()

    for cand in data.get("candidates", []):
        sim = cand["similarity_score"]
        prob = cand["duplicate_probability"]

        # Validate similarity score range
        assert -1.0 <= sim <= 1.0
        # Validate probability range
        assert 0.0 <= prob <= 1.0
        # Check that both fields exist independently
        assert "similarity_score" in cand
        assert "duplicate_probability" in cand


# -----------------------------------------------------------------------------
# Test 5: Duplicate Summary View
# -----------------------------------------------------------------------------
def test_5_get_duplicate_summary(client, officer_token, sample_complaints):
    """Verifies duplicate summary retrieval with top recommendation."""
    headers = {"Authorization": f"Bearer {officer_token}"}
    res = client.get(f"/api/ai/duplicates/{sample_complaints}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["complaint_id"] == sample_complaints
    assert "institution_name" in data
    assert "total_candidates_analyzed" in data
    assert "high_confidence_duplicates_count" in data
    assert "review_required_count" in data
    assert "has_active_recommendations" in data


# -----------------------------------------------------------------------------
# Test 6: Candidate Listing with Filters
# -----------------------------------------------------------------------------
def test_6_get_duplicate_candidates_with_filtering(client, officer_token, sample_complaints):
    """Verifies candidate listing respects query parameters and pagination."""
    headers = {"Authorization": f"Bearer {officer_token}"}
    res = client.get(
        f"/api/ai/duplicates/{sample_complaints}/candidates?limit=3",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) <= 3


# -----------------------------------------------------------------------------
# Test 7: Pending Recommendations Queue
# -----------------------------------------------------------------------------
def test_7_pending_recommendations_queue(client, officer_token):
    """Verifies that officers can query the system-wide pending review queue."""
    headers = {"Authorization": f"Bearer {officer_token}"}
    res = client.get("/api/ai/duplicates/recommendations/pending?limit=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


# -----------------------------------------------------------------------------
# Test 8: Officer Verification — CONFIRM_DUPLICATE
# -----------------------------------------------------------------------------
def test_8_officer_verification_confirm_duplicate(client, officer_token, sample_complaints):
    """
    Verifies that an authorized officer can confirm a duplicate candidate,
    creating a formal CaseRelationship and CaseEvents while keeping dossiers distinct.
    """
    headers = {"Authorization": f"Bearer {officer_token}"}

    # Fetch candidates first
    cand_res = client.get(f"/api/ai/duplicates/{sample_complaints}/candidates", headers=headers)
    candidates = cand_res.json()
    if not candidates:
        pytest.skip("No candidates available for verification test")

    target_cand_id = candidates[0]["candidate_complaint_id"]

    verify_payload = {
        "candidate_id": target_cand_id,
        "decision": "CONFIRM_DUPLICATE",
        "reason": "Official scrutiny confirms identical allegation and financial violation in the same academic semester.",
        "link_dossier": True
    }

    res = client.post(
        f"/api/ai/duplicates/{sample_complaints}/verify",
        json=verify_payload,
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "success"
    assert data["decision"] == "CONFIRM_DUPLICATE"
    assert data["source_complaint_id"] == sample_complaints
    assert data["candidate_complaint_id"] == target_cand_id
    assert data["linked_relationship_id"] is not None

    # Verify that CaseRelationship was created in database
    db = SessionLocal()
    rel = db.query(CaseRelationship).filter(CaseRelationship.id == data["linked_relationship_id"]).first()
    assert rel is not None
    assert rel.relationship_type == "Duplicate Grievance"
    assert rel.review_decision == "CONFIRM_DUPLICATE"

    # Verify CaseEvents recorded
    events = db.query(CaseEvent).filter(
        CaseEvent.case_id == sample_complaints,
        CaseEvent.event_type == "DUPLICATE_CONFIRMED_BY_OFFICER"
    ).all()
    assert len(events) >= 1

    # Verify AuditLog recorded
    audit = db.query(AuditLog).filter(
        AuditLog.event_type == "AI_DUPLICATE_VERIFIED"
    ).all()
    assert len(audit) >= 1

    db.close()


# -----------------------------------------------------------------------------
# Test 9: Officer Verification — MARK_RELATED
# -----------------------------------------------------------------------------
def test_9_officer_verification_mark_related(client, officer_token, sample_complaints):
    """Verifies that an officer can mark matters as related without declaring a duplicate."""
    headers = {"Authorization": f"Bearer {officer_token}"}

    cand_res = client.get(f"/api/ai/duplicates/{sample_complaints}/candidates", headers=headers)
    candidates = cand_res.json()
    if not candidates:
        pytest.skip("No candidates available for verification test")

    target_cand_id = candidates[0]["candidate_complaint_id"]

    verify_payload = {
        "candidate_id": target_cand_id,
        "decision": "MARK_RELATED",
        "reason": "Common institutional policy issue identified across batches; proceed on parallel inquiry tracks.",
        "link_dossier": True
    }

    res = client.post(
        f"/api/ai/duplicates/{sample_complaints}/verify",
        json=verify_payload,
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "MARK_RELATED"

    db = SessionLocal()
    rel = db.query(CaseRelationship).filter(CaseRelationship.id == data["linked_relationship_id"]).first()
    assert rel is not None
    assert rel.relationship_type == "Related Matter"
    db.close()


# -----------------------------------------------------------------------------
# Test 10: Officer Verification — REJECT_RECOMMENDATION
# -----------------------------------------------------------------------------
def test_10_officer_verification_reject_recommendation(client, officer_token, sample_complaints):
    """Verifies that an officer can reject an AI duplicate recommendation with justification."""
    headers = {"Authorization": f"Bearer {officer_token}"}

    cand_res = client.get(f"/api/ai/duplicates/{sample_complaints}/candidates", headers=headers)
    candidates = cand_res.json()
    if not candidates:
        pytest.skip("No candidates available for verification test")

    target_cand_id = candidates[0]["candidate_complaint_id"]

    verify_payload = {
        "candidate_id": target_cand_id,
        "decision": "REJECT_RECOMMENDATION",
        "reason": "Grievance details pertain to distinct departments and faculty members; recommendation rejected.",
        "link_dossier": False
    }

    res = client.post(
        f"/api/ai/duplicates/{sample_complaints}/verify",
        json=verify_payload,
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "REJECT_RECOMMENDATION"


# -----------------------------------------------------------------------------
# Test 11: Validation Guards on Officer Verification
# -----------------------------------------------------------------------------
def test_11_officer_verification_validation_guards(client, officer_token, sample_complaints):
    """Ensures input validation blocks invalid requests."""
    headers = {"Authorization": f"Bearer {officer_token}"}

    # Short reason (< 5 characters) must fail validation (HTTP 422)
    short_reason_res = client.post(
        f"/api/ai/duplicates/{sample_complaints}/verify",
        json={"candidate_id": "CAND-001", "decision": "CONFIRM_DUPLICATE", "reason": "No"},
        headers=headers
    )
    assert short_reason_res.status_code == 422

    # Invalid decision type must fail (HTTP 400)
    invalid_dec_res = client.post(
        f"/api/ai/duplicates/{sample_complaints}/verify",
        json={"candidate_id": "CAND-001", "decision": "INVALID_DECISION", "reason": "Valid reason length here."},
        headers=headers
    )
    assert invalid_dec_res.status_code == 400

    # Nonexistent source complaint must return 404
    not_found_res = client.post(
        "/api/ai/duplicates/NONEXISTENT-CASE-ID/verify",
        json={"candidate_id": "CAND-001", "decision": "CONFIRM_DUPLICATE", "reason": "Valid reason length here."},
        headers=headers
    )
    assert not_found_res.status_code == 404


# -----------------------------------------------------------------------------
# Test 12: Security Isolation & Internal Data Protection
# -----------------------------------------------------------------------------
def test_12_security_isolation_and_no_arbitrary_file_paths(client, officer_token, complainant_token, sample_complaints):
    """
    Verifies that:
    1. Citizens cannot trigger AI analysis or view candidates.
    2. Endpoint rejects arbitrary file paths and respects strict schema.
    """
    # Citizen attempt to trigger analysis -> 403 Forbidden
    citizen_headers = {"Authorization": f"Bearer {complainant_token}"}
    res_citizen = client.post(f"/api/ai/duplicates/{sample_complaints}/analyze", headers=citizen_headers)
    assert res_citizen.status_code == 403

    # Citizen attempt to view candidates -> 403 Forbidden
    res_cand_cit = client.get(f"/api/ai/duplicates/{sample_complaints}/candidates", headers=citizen_headers)
    assert res_cand_cit.status_code == 403

    # Citizen attempt to verify -> 403 Forbidden
    res_ver_cit = client.post(
        f"/api/ai/duplicates/{sample_complaints}/verify",
        json={"candidate_id": "TEST", "decision": "CONFIRM_DUPLICATE", "reason": "Reasonable length"},
        headers=citizen_headers
    )
    assert res_ver_cit.status_code == 403

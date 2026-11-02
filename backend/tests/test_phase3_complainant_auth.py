import pytest
import uuid
from fastapi.testclient import TestClient
import jwt
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.models import Institution
from app.seed_data import seed_complainants

client = TestClient(app)

# Ensure demo student is seeded for demo login tests
_db = SessionLocal()
try:
    seed_complainants(_db)
finally:
    _db.close()

# Session-unique credentials for test isolation without fragile DB cascading deletes
RUN_ID = uuid.uuid4().hex[:6]
TEST_EMAIL = f"citizen.{RUN_ID}@test.in"
TEST_MOBILE = f"98{uuid.uuid4().int % 100000000:08d}"
TEST_PASSWORD = "SecretPassword123"

TEST_B_EMAIL = f"citizen.b.{RUN_ID}@test.in"
TEST_B_MOBILE = f"97{uuid.uuid4().int % 100000000:08d}"
TEST_B_PASSWORD = "PasswordB123"


def test_phase3_complainant_registration_validation():
    # 1. Reject invalid 10-digit mobile number
    bad_mobile_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Test Citizen",
        "email": "invalid.mobile@example.com",
        "mobile": "12345",  # Invalid format
        "password": "Password123!",
        "confirm_password": "Password123!",
        "complainant_type": "Student"
    })
    assert bad_mobile_res.status_code == 400
    assert "valid 10-digit" in bad_mobile_res.json()["detail"]

    # 2. Reject password mismatch
    mismatch_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Test Citizen",
        "email": "mismatch@example.com",
        "mobile": "9876543210",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
        "complainant_type": "Student"
    })
    assert mismatch_res.status_code == 400
    assert "do not match" in mismatch_res.json()["detail"]

    # 3. Successful registration with valid data
    reg_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Pooja Sharma",
        "email": TEST_EMAIL,
        "mobile": TEST_MOBILE,
        "password": TEST_PASSWORD,
        "confirm_password": TEST_PASSWORD,
        "complainant_type": "Student"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["full_name"] == "Pooja Sharma"
    assert reg_data["email"] == TEST_EMAIL
    assert reg_data["mobile"] == TEST_MOBILE
    assert reg_data["complainant_type"] == "Student"

    # 4. Reject duplicate registration (same email / mobile)
    dup_res = client.post("/api/complainant/auth/register", json={
        "full_name": "Pooja Sharma Duplicate",
        "email": TEST_EMAIL,
        "mobile": TEST_MOBILE,
        "password": TEST_PASSWORD,
        "confirm_password": TEST_PASSWORD,
        "complainant_type": "Student"
    })
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]


def test_phase3_complainant_login_and_token_claims():
    # 1. Login as registered complainant
    login_res = client.post("/api/complainant/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    token = login_data["access_token"]
    assert login_data["token_type"] == "bearer"
    assert login_data["complainant"]["email"] == TEST_EMAIL

    # 2. Decode and verify token claims strictly
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    assert payload["sub"] == TEST_EMAIL
    assert payload["role"] == "complainant"
    assert payload["aud"] == "nyayaniti-complainant"
    assert payload["token_type"] == "complainant_access"

    # 3. Check /complainant/auth/me returns complainant identity
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/complainant/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == TEST_EMAIL


def test_phase3_demo_complainant_login():
    # Verify pre-seeded demo complainant login works
    demo_res = client.post("/api/complainant/auth/demo-login")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert "access_token" in demo_data
    assert demo_data["complainant"]["email"] == "student.demo@nyayaniti.gov.in"

    payload = jwt.decode(demo_data["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    assert payload["aud"] == "nyayaniti-complainant"
    assert payload["role"] == "complainant"


def test_phase3_token_isolation_complainant_blocked_from_officer_apis():
    # Acquire complainant token
    login_res = client.post("/api/complainant/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert login_res.status_code == 200
    comp_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {comp_token}"}

    # Attempt to call internal officer endpoints with complainant token
    cases_res = client.get("/api/cases", headers=headers)
    assert cases_res.status_code in [401, 403], "Complainant token MUST be blocked from /api/cases"

    overlaps_res = client.get("/api/overlaps", headers=headers)
    assert overlaps_res.status_code in [401, 403], "Complainant token MUST be blocked from /api/overlaps"

    settings_res = client.get("/api/settings/users", headers=headers)
    assert settings_res.status_code in [401, 403], "Complainant token MUST be blocked from /api/settings/users"


def test_phase3_token_isolation_officer_blocked_from_complainant_apis():
    # Acquire officer token
    off_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert off_res.status_code == 200
    officer_token = off_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {officer_token}"}

    # Attempt to call complainant endpoints with officer token
    comp_cases_res = client.get("/api/complainant/cases", headers=headers)
    assert comp_cases_res.status_code in [401, 403], "Officer token MUST be blocked from /api/complainant/cases"


def test_phase3_complainant_grievance_filing_and_ownership_scoping():
    # Login as citizen A
    comp_login = client.post("/api/complainant/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    comp_token = comp_login.json()["access_token"]
    comp_headers = {"Authorization": f"Bearer {comp_token}"}

    # Find a valid institution
    db = SessionLocal()
    try:
        inst = db.query(Institution).first()
        inst_id = inst.id
    finally:
        db.close()

    # File a new grievance as Citizen A
    file_res = client.post("/api/complainant/cases", headers=comp_headers, json={
        "institution_id": inst_id,
        "category": "Fee Overcharging & Refund Denial",
        "description": "Institution demanding unapproved excess lab deposits and refusing fee refund upon student admission cancellation."
    })
    assert file_res.status_code == 201
    case_data = file_res.json()
    case_id = case_data["id"]
    assert case_id.startswith("AICTE-PGRC-")
    assert case_data["status"] == "Pending"

    # Verify Citizen A can view their case detail with milestones
    detail_res = client.get(f"/api/complainant/cases/{case_id}", headers=comp_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == case_id
    assert len(detail_data["events"]) >= 1
    assert "priority_score" not in detail_data, "Internal priority score must NOT leak to complainant"

    # Register Citizen B
    reg_b = client.post("/api/complainant/auth/register", json={
        "full_name": "Citizen B",
        "email": TEST_B_EMAIL,
        "mobile": TEST_B_MOBILE,
        "password": TEST_B_PASSWORD,
        "confirm_password": TEST_B_PASSWORD,
        "complainant_type": "Student"
    })
    assert reg_b.status_code == 201

    b_login = client.post("/api/complainant/auth/login", json={
        "email": TEST_B_EMAIL,
        "password": TEST_B_PASSWORD
    })
    b_token = b_login.json()["access_token"]
    b_headers = {"Authorization": f"Bearer {b_token}"}

    # ANTI-IDOR VERIFICATION: Citizen B attempts to access Citizen A's case
    b_access_res = client.get(f"/api/complainant/cases/{case_id}", headers=b_headers)
    assert b_access_res.status_code == 404, "Cross-complainant case access MUST return 404 Not Found"

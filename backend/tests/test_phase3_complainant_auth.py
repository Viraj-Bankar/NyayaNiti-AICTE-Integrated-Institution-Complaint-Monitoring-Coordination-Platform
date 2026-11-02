import pytest
import uuid
from fastapi.testclient import TestClient
import jwt
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.models import Institution, Complainant
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
    bad_mobile_res = client.post("/api/complainant/register", json={
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
    mismatch_res = client.post("/api/complainant/register", json={
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
    reg_res = client.post("/api/complainant/register", json={
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
    dup_res = client.post("/api/complainant/register", json={
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
    login_res = client.post("/api/complainant/login", json={
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

    # 3. Check /complainant/me returns complainant identity
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/complainant/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == TEST_EMAIL


def test_phase3_demo_complainant_login():
    # Verify pre-seeded demo complainant login works
    demo_res = client.post("/api/complainant/demo-login")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert "access_token" in demo_data
    assert demo_data["complainant"]["email"] == "student.demo@nyayaniti.gov.in"

    payload = jwt.decode(demo_data["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    assert payload["aud"] == "nyayaniti-complainant"
    assert payload["role"] == "complainant"


def test_phase3_inactive_complainant_handling():
    # Register an account to deactivate
    inactive_email = f"inactive.{uuid.uuid4().hex[:6]}@test.in"
    inactive_mobile = f"96{uuid.uuid4().int % 100000000:08d}"
    reg_res = client.post("/api/complainant/register", json={
        "full_name": "Suspended Citizen",
        "email": inactive_email,
        "mobile": inactive_mobile,
        "password": "Password123!",
        "confirm_password": "Password123!",
        "complainant_type": "Citizen"
    })
    assert reg_res.status_code == 201

    # Login to acquire token while active
    login_res = client.post("/api/complainant/login", json={
        "email": inactive_email,
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Deactivate account in database
    db = SessionLocal()
    try:
        comp = db.query(Complainant).filter(Complainant.email == inactive_email).first()
        comp.is_active = False
        db.commit()
    finally:
        db.close()

    # 1. Login attempt must return HTTP 403 Forbidden
    blocked_login = client.post("/api/complainant/login", json={
        "email": inactive_email,
        "password": "Password123!"
    })
    assert blocked_login.status_code == 403
    assert "suspended or deactivated" in blocked_login.json()["detail"].lower()

    # 2. Existing token on /me must be rejected with HTTP 403 Forbidden
    blocked_me = client.get("/api/complainant/me", headers=headers)
    assert blocked_me.status_code == 403
    assert "suspended or deactivated" in blocked_me.json()["detail"].lower()


def test_phase3_token_isolation_complainant_blocked_from_officer_apis():
    # Acquire complainant token
    login_res = client.post("/api/complainant/login", json={
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
    comp_me_res = client.get("/api/complainant/me", headers=headers)
    assert comp_me_res.status_code in [401, 403], "Officer token MUST be blocked from /api/complainant/me"

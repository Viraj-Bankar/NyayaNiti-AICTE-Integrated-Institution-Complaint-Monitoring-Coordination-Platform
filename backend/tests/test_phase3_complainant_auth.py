import pytest
import uuid
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import jwt
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.models import Complainant, User
from app.seed_data import seed_complainants

client = TestClient(app)

# Ensure seed data exists
_db = SessionLocal()
try:
    seed_complainants(_db)
finally:
    _db.close()


import random

def generate_unique_citizen_payload(prefix="citizen"):
    uid = uuid.uuid4().hex[:6]
    mobile_num = f"9{random.randint(100000000, 999999999)}"
    return {
        "full_name": f"Citizen {prefix.title()} {uid}",
        "email": f"{prefix}.{uid}@test.in",
        "mobile": mobile_num,
        "password": "StrongPassword123!",
        "confirm_password": "StrongPassword123!",
        "complainant_type": "Student"
    }


# -------------------------------------------------------------------------
# 1. Successful Registration
# -------------------------------------------------------------------------
def test_successful_registration():
    payload = generate_unique_citizen_payload("success")
    res = client.post("/api/complainant/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["full_name"] == payload["full_name"]
    assert data["email"] == payload["email"]
    assert data["mobile"] == payload["mobile"]
    assert data["is_active"] is True
    assert data["complainant_type"] == "Student"
    
    # SECURITY: Password hash must NEVER be exposed in response
    assert "hashed_password" not in data
    assert "password" not in data


# -------------------------------------------------------------------------
# 2. Duplicate Email Rejection
# -------------------------------------------------------------------------
def test_duplicate_email_rejection():
    payload = generate_unique_citizen_payload("dupemail")
    res1 = client.post("/api/complainant/register", json=payload)
    assert res1.status_code == 201

    # Attempt registration with identical email but different mobile
    dup_payload = generate_unique_citizen_payload("different")
    dup_payload["email"] = payload["email"]
    
    res2 = client.post("/api/complainant/register", json=dup_payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()
    assert "email" in res2.json()["detail"].lower()


# -------------------------------------------------------------------------
# 3. Duplicate Mobile Rejection
# -------------------------------------------------------------------------
def test_duplicate_mobile_rejection():
    payload = generate_unique_citizen_payload("dupmobile")
    res1 = client.post("/api/complainant/register", json=payload)
    assert res1.status_code == 201

    # Attempt registration with identical mobile but different email
    dup_payload = generate_unique_citizen_payload("different")
    dup_payload["mobile"] = payload["mobile"]

    res2 = client.post("/api/complainant/register", json=dup_payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()
    assert "mobile" in res2.json()["detail"].lower()


# -------------------------------------------------------------------------
# 4. Invalid Registration Data Validation
# -------------------------------------------------------------------------
def test_invalid_registration_data():
    base = generate_unique_citizen_payload("invalid")

    # A. Invalid Email format
    bad_email = dict(base, email="not-an-email")
    res_bad_email = client.post("/api/complainant/register", json=bad_email)
    assert res_bad_email.status_code in [400, 422]

    # B. Short password (< 8 chars)
    short_pw = dict(base, password="Short1!", confirm_password="Short1!")
    res_short = client.post("/api/complainant/register", json=short_pw)
    assert res_short.status_code == 400
    assert "8" in res_short.json()["detail"]

    # C. Weak password (no uppercase or digits)
    weak_pw = dict(base, password="weakpassword", confirm_password="weakpassword")
    res_weak = client.post("/api/complainant/register", json=weak_pw)
    assert res_weak.status_code == 400
    assert "uppercase" in res_weak.json()["detail"].lower()

    # D. Password mismatch
    mismatch = dict(base, password="Password123!", confirm_password="Different123!")
    res_mismatch = client.post("/api/complainant/register", json=mismatch)
    assert res_mismatch.status_code == 400
    assert "do not match" in res_mismatch.json()["detail"].lower()

    # E. Invalid Indian mobile format (must be 10 digits starting with 6,7,8,9)
    bad_mobile_len = dict(base, mobile="12345")
    res_bad_mobile = client.post("/api/complainant/register", json=bad_mobile_len)
    assert res_bad_mobile.status_code == 400
    assert "10-digit" in res_bad_mobile.json()["detail"]

    bad_mobile_prefix = dict(base, mobile="1234567890")
    res_bad_prefix = client.post("/api/complainant/register", json=bad_mobile_prefix)
    assert res_bad_prefix.status_code == 400
    assert "10-digit" in res_bad_prefix.json()["detail"]


# -------------------------------------------------------------------------
# 5. Successful Login (via email & mobile)
# -------------------------------------------------------------------------
def test_successful_login():
    payload = generate_unique_citizen_payload("login")
    reg_res = client.post("/api/complainant/register", json=payload)
    assert reg_res.status_code == 201

    # Login with email
    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["complainant"]["email"] == payload["email"]

    # Decode and verify token claims strictly
    token = data["access_token"]
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    assert decoded["sub"] == payload["email"]
    assert decoded["role"] == "complainant"
    assert decoded["aud"] == "nyayaniti-complainant"
    assert decoded["token_type"] == "complainant_access"

    # Login with mobile number
    login_mobile_res = client.post("/api/complainant/login", json={
        "email": payload["mobile"],
        "password": payload["password"]
    })
    assert login_mobile_res.status_code == 200
    assert "access_token" in login_mobile_res.json()


# -------------------------------------------------------------------------
# 6. Incorrect Password Rejection
# -------------------------------------------------------------------------
def test_incorrect_password():
    payload = generate_unique_citizen_payload("wrongpw")
    client.post("/api/complainant/register", json=payload)

    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": "WrongPassword999!"
    })
    assert login_res.status_code == 401
    assert "incorrect" in login_res.json()["detail"].lower()


# -------------------------------------------------------------------------
# 7. Inactive Account Status Handling
# -------------------------------------------------------------------------
def test_inactive_account_handling():
    payload = generate_unique_citizen_payload("inactive")
    client.post("/api/complainant/register", json=payload)

    # Login to acquire token while active
    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Deactivate account directly in database
    db = SessionLocal()
    try:
        comp = db.query(Complainant).filter(Complainant.email == payload["email"]).first()
        comp.is_active = False
        db.commit()
    finally:
        db.close()

    # 1. Login attempt must return HTTP 403 Forbidden
    login_blocked = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_blocked.status_code == 403
    assert "suspended or deactivated" in login_blocked.json()["detail"].lower()

    # 2. Existing valid token calling /me must also return HTTP 403 Forbidden
    me_blocked = client.get("/api/complainant/me", headers=headers)
    assert me_blocked.status_code == 403
    assert "suspended or deactivated" in me_blocked.json()["detail"].lower()


# -------------------------------------------------------------------------
# 8. Invalid and Expired JWT Validation
# -------------------------------------------------------------------------
def test_invalid_and_expired_jwt():
    # A. Malformed token
    bad_header = {"Authorization": "Bearer malformed.token.gibberish"}
    res_bad = client.get("/api/complainant/me", headers=bad_header)
    assert res_bad.status_code == 401

    # B. Token signed with wrong secret key
    tampered_token = jwt.encode(
        {"sub": "fake@test.in", "role": "complainant", "aud": "nyayaniti-complainant", "token_type": "complainant_access"},
        "wrong-secret-key-12345678901234567890",
        algorithm=settings.ALGORITHM
    )
    res_tampered = client.get("/api/complainant/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res_tampered.status_code == 401

    # C. Expired token (exp in past)
    expired_token = jwt.encode(
        {
            "sub": "expired@test.in",
            "role": "complainant",
            "aud": "nyayaniti-complainant",
            "token_type": "complainant_access",
            "exp": datetime.utcnow() - timedelta(hours=1)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    res_expired = client.get("/api/complainant/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401
    assert "expired" in res_expired.json()["detail"].lower()


# -------------------------------------------------------------------------
# 9. Complainant Token Rejected by Officer APIs
# -------------------------------------------------------------------------
def test_complainant_token_rejected_by_officer_apis():
    payload = generate_unique_citizen_payload("isolation")
    client.post("/api/complainant/register", json=payload)

    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    comp_token = login_res.json()["access_token"]
    comp_headers = {"Authorization": f"Bearer {comp_token}"}

    # Internal officer endpoints MUST reject complainant tokens with HTTP 403
    cases_res = client.get("/api/cases", headers=comp_headers)
    assert cases_res.status_code in [401, 403]

    overlaps_res = client.get("/api/overlaps", headers=comp_headers)
    assert overlaps_res.status_code in [401, 403]

    settings_res = client.get("/api/settings/users", headers=comp_headers)
    assert settings_res.status_code in [401, 403]

    auth_me_res = client.get("/api/auth/me", headers=comp_headers)
    assert auth_me_res.status_code in [401, 403]


# -------------------------------------------------------------------------
# 10. Officer Token Rejected by Complainant-Only APIs
# -------------------------------------------------------------------------
def test_officer_token_rejected_by_complainant_only_apis():
    # Login as administrative officer
    off_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert off_login.status_code == 200
    officer_token = off_login.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # Calling complainant profile endpoint MUST return HTTP 403 Forbidden
    res = client.get("/api/complainant/me", headers=officer_headers)
    assert res.status_code == 403
    assert "restricted to registered citizens" in res.json()["detail"].lower()


# -------------------------------------------------------------------------
# 11. Attempted Role Escalation Prevention
# -------------------------------------------------------------------------
def test_attempted_role_escalation():
    payload = generate_unique_citizen_payload("escalate")
    # Malicious client sends administrative role in registration request
    payload["role"] = "super_admin"
    payload["is_admin"] = True
    payload["bureau_id"] = 1

    reg_res = client.post("/api/complainant/register", json=payload)
    assert reg_res.status_code == 201

    # Login and verify token claims
    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})

    # The role MUST strictly remain 'complainant'
    assert decoded["role"] == "complainant"
    assert decoded["aud"] == "nyayaniti-complainant"
    assert "super_admin" not in decoded.values()

    # Token cannot access administrative endpoints
    admin_check = client.get("/api/settings/users", headers={"Authorization": f"Bearer {token}"})
    assert admin_check.status_code in [401, 403]


# -------------------------------------------------------------------------
# 12. Profile Access Isolation (Anti-IDOR / Identity from JWT only)
# -------------------------------------------------------------------------
def test_profile_access_isolation():
    citizen_x = generate_unique_citizen_payload("citizen_x")
    citizen_y = generate_unique_citizen_payload("citizen_y")

    reg_x = client.post("/api/complainant/register", json=citizen_x)
    assert reg_x.status_code == 201
    reg_y = client.post("/api/complainant/register", json=citizen_y)
    assert reg_y.status_code == 201

    # Login X
    res_x = client.post("/api/complainant/login", json={"email": citizen_x["email"], "password": citizen_x["password"]})
    token_x = res_x.json()["access_token"]

    # Login Y
    res_y = client.post("/api/complainant/login", json={"email": citizen_y["email"], "password": citizen_y["password"]})
    token_y = res_y.json()["access_token"]

    # Token X fetches profile -> must return citizen_x exclusively
    me_x = client.get("/api/complainant/me", headers={"Authorization": f"Bearer {token_x}"})
    assert me_x.status_code == 200
    data_x = me_x.json()
    assert data_x["email"] == citizen_x["email"]
    assert data_x["full_name"] == citizen_x["full_name"]

    # Token Y fetches profile -> must return citizen_y exclusively
    me_y = client.get("/api/complainant/me", headers={"Authorization": f"Bearer {token_y}"})
    assert me_y.status_code == 200
    data_y = me_y.json()
    assert data_y["email"] == citizen_y["email"]
    assert data_y["full_name"] == citizen_y["full_name"]

    # Verify ID difference and complete isolation
    assert data_x["id"] != data_y["id"]

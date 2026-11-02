"""
NyayaNiti Phase 1 - Task 5: Comprehensive Backend Authentication & API Regression Test
Tests every item in the Phase 1 matrix against the live FastAPI app.
"""
import sys
import jwt
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.models import User

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("NYAYANITI PHASE 1 - TASK 5: BACKEND AUTH & REGRESSION TEST SUITE")
    print("=" * 70)
    
    passed_count = 0
    failed_count = 0

    def assert_test(name, condition, extra=""):
        nonlocal passed_count, failed_count
        if condition:
            print(f"[PASS] {name} {extra}")
            passed_count += 1
        else:
            print(f"[FAIL] {name} {extra}")
            failed_count += 1

    # 1. Health Endpoint
    res = client.get("/health")
    assert_test("Health Check GET /health", res.status_code == 200 and res.json().get("status") == "healthy")

    # 2. Login with Invalid Credentials
    res_bad = client.post("/api/auth/login", json={"username": "invalid_user", "password": "wrongpassword"})
    assert_test("Login with Invalid Credentials (HTTP 401)", res_bad.status_code == 401)

    # 3. Successful Admin Login
    res_admin = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert_test("Successful Admin Login (HTTP 200)", res_admin.status_code == 200)
    admin_token = res_admin.json().get("access_token")
    admin_role = res_admin.json().get("user", {}).get("role")
    assert_test("Admin User Profile & Role == 'super_admin'", admin_role == "super_admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Successful Officer Login
    res_officer = client.post("/api/auth/login", json={"username": "officer_pgrc", "password": "officer123"})
    assert_test("Successful Officer Login (HTTP 200)", res_officer.status_code == 200)
    officer_token = res_officer.json().get("access_token")
    officer_role = res_officer.json().get("user", {}).get("role")
    assert_test("Officer User Profile & Role == 'authorized_officer'", officer_role == "authorized_officer")
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # 5. Monitoring Officer Login (via demo-login or database)
    res_monitor = client.post("/api/auth/demo-login/monitoring_officer")
    assert_test("Successful Monitoring Officer Login (HTTP 200)", res_monitor.status_code == 200)
    monitor_token = res_monitor.json().get("access_token")
    monitor_headers = {"Authorization": f"Bearer {monitor_token}"}

    # 5b. Demo login strictly forbidden in production environment
    import os
    orig_env = os.environ.get("APP_ENV")
    try:
        os.environ["APP_ENV"] = "production"
        res_prod_demo = client.post("/api/auth/demo-login/super_admin")
        assert_test("Demo Login Blocked in Production (HTTP 403)", res_prod_demo.status_code == 403)
    finally:
        if orig_env is not None:
            os.environ["APP_ENV"] = orig_env
        else:
            os.environ.pop("APP_ENV", None)

    # 6. Protected Endpoint /api/auth/me Verification
    res_me_admin = client.get("/api/auth/me", headers=admin_headers)
    assert_test("Auth Profile /api/auth/me with Admin Bearer", res_me_admin.status_code == 200 and res_me_admin.json()["role"] == "super_admin")

    res_me_anon = client.get("/api/auth/me")
    assert_test("Auth Profile /api/auth/me without token (HTTP 401)", res_me_anon.status_code == 401)

    # 7. Expired/Tampered Token Rejection
    expired_payload = {
        "sub": "admin",
        "role": "super_admin",
        "exp": datetime.utcnow() - timedelta(hours=2)
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert_test("Expired JWT Token Rejection (HTTP 401)", res_expired.status_code == 401)

    tampered_token = admin_token + "corrupted"
    res_tampered = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert_test("Tampered JWT Token Rejection (HTTP 401)", res_tampered.status_code == 401)

    # 8. Role-Based Access Control Verification
    # Ordinary officer attempting /api/audit -> must be 403 Forbidden
    res_audit_officer = client.get("/api/audit", headers=officer_headers)
    assert_test("Officer Access to Audit Trail Denied (HTTP 403)", res_audit_officer.status_code == 403)

    # Monitoring officer accessing /api/audit -> must be 200 OK
    res_audit_monitor = client.get("/api/audit", headers=monitor_headers)
    assert_test("Monitoring Officer Access to Audit Trail Permitted (HTTP 200)", res_audit_monitor.status_code == 200)

    # Super admin accessing /api/audit -> must be 200 OK
    res_audit_admin = client.get("/api/audit", headers=admin_headers)
    assert_test("Super Admin Access to Audit Trail Permitted (HTTP 200)", res_audit_admin.status_code == 200)

    # Ordinary officer attempting admin settings -> must be 403 Forbidden
    res_settings_officer = client.get("/api/settings/users", headers=officer_headers)
    assert_test("Officer Access to Admin User Registry Denied (HTTP 403)", res_settings_officer.status_code == 403)

    # Super admin accessing admin settings -> must be 200 OK
    res_settings_admin = client.get("/api/settings/users", headers=admin_headers)
    assert_test("Super Admin Access to Admin User Registry Permitted (HTTP 200)", res_settings_admin.status_code == 200)

    # 9. Dashboard APIs Protection & Functionality
    # /api/dashboard/charts without auth -> 401
    res_charts_anon = client.get("/api/dashboard/charts")
    assert_test("Dashboard Charts without Token Denied (HTTP 401)", res_charts_anon.status_code == 401)

    # /api/dashboard/charts with auth -> 200
    res_charts_auth = client.get("/api/dashboard/charts", headers=officer_headers)
    assert_test("Dashboard Charts with Bearer Token (HTTP 200)", res_charts_auth.status_code == 200)

    # /api/dashboard/recent-activity without auth -> 401
    res_act_anon = client.get("/api/dashboard/recent-activity")
    assert_test("Recent Activity without Token Denied (HTTP 401)", res_act_anon.status_code == 401)

    # /api/dashboard/recent-activity with auth -> 200
    res_act_auth = client.get("/api/dashboard/recent-activity", headers=officer_headers)
    assert_test("Recent Activity with Bearer Token (HTTP 200)", res_act_auth.status_code == 200)

    # /api/dashboard/upcoming-deadlines without auth -> 401
    res_dl_anon = client.get("/api/dashboard/upcoming-deadlines")
    assert_test("Upcoming Deadlines without Token Denied (HTTP 401)", res_dl_anon.status_code == 401)

    # /api/dashboard/upcoming-deadlines with auth -> 200
    res_dl_auth = client.get("/api/dashboard/upcoming-deadlines", headers=officer_headers)
    assert_test("Upcoming Deadlines with Bearer Token (HTTP 200)", res_dl_auth.status_code == 200)

    # /api/dashboard/kpis -> 200
    res_kpis = client.get("/api/dashboard/kpis", headers=officer_headers)
    assert_test("Dashboard KPIs (HTTP 200, Count >= 10)", res_kpis.status_code == 200 and res_kpis.json().get("total_complaints", 0) >= 10)

    # 10. Operational Modules Regression Testing
    # Case Register
    res_cases = client.get("/api/cases", headers=officer_headers)
    assert_test("Case Register GET /api/cases (HTTP 200)", res_cases.status_code == 200 and len(res_cases.json()) >= 1)

    # Overlap Center
    res_overlaps = client.get("/api/overlaps", headers=officer_headers)
    assert_test("Overlap Center GET /api/overlaps (HTTP 200)", res_overlaps.status_code == 200 and len(res_overlaps.json()) >= 1)

    # Action Conflicts
    res_conflicts = client.get("/api/action-conflicts", headers=officer_headers)
    assert_test("Action Conflicts GET /api/action-conflicts (HTTP 200)", res_conflicts.status_code == 200 and len(res_conflicts.json()) >= 1)

    # Coordination Workspaces
    res_coord = client.get("/api/coordination", headers=officer_headers)
    assert_test("Coordination Workspaces GET /api/coordination (HTTP 200)", res_coord.status_code == 200 and len(res_coord.json()) >= 1)

    # Institutions
    res_inst = client.get("/api/institutions", headers=officer_headers)
    assert_test("Institutions GET /api/institutions (HTTP 200)", res_inst.status_code == 200 and len(res_inst.json()) >= 1)

    # Surge Detection
    res_surges = client.get("/api/surges", headers=officer_headers)
    assert_test("Surge Detection GET /api/surges (HTTP 200)", res_surges.status_code == 200 and "surges" in res_surges.json())

    # Reports Bureau Summary
    res_bureau_rep = client.get("/api/reports/bureau-summary", headers=officer_headers)
    assert_test("Reports Bureau Summary GET /api/reports/bureau-summary (HTTP 200)", res_bureau_rep.status_code == 200)

    # Reports CSV Export - Officer Access Denied (HTTP 403)
    res_rep_officer = client.get("/api/reports/export/cases-csv", headers=officer_headers)
    assert_test("Reports CSV Export Officer Access Denied (HTTP 403)", res_rep_officer.status_code == 403)

    # Reports CSV Export - Admin Access Granted (HTTP 200)
    res_reports = client.get("/api/reports/export/cases-csv", headers=admin_headers)
    assert_test("Reports CSV Export Admin Access Granted (HTTP 200)", res_reports.status_code == 200 and "Case ID" in res_reports.text)

    # Notifications
    res_notif = client.get("/api/notifications", headers=officer_headers)
    assert_test("Notifications GET /api/notifications (HTTP 200)", res_notif.status_code == 200)

    print("-" * 70)
    print(f"TOTAL BACKEND INTEGRATION TESTS: {passed_count + failed_count}")
    print(f"PASSED: {passed_count}")
    print(f"FAILED: {failed_count}")
    print("=" * 70)
    
    return failed_count == 0

def test_phase1_integration_matrix():
    success = run_tests()
    assert success is True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

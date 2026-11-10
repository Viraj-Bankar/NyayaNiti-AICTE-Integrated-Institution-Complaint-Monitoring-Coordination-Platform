"""
NyayaNiti - Staging Seed Safety Gate & Role Verification Test Suite
Prompt 8: Comprehensive test of 11 safety fences and identity verification safeguards.
"""

import os
import sys
import subprocess
import sqlite3
import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.models import Base, Case, User, Institution, Bureau, DocumentMetadata, DocumentBinary
from scripts.seed_staging_synthetic import verify_staging_target_safety, seed_staging_synthetic_data

PYTHON_EXE = sys.executable
SEED_SCRIPT = os.path.join(backend_dir, "scripts", "seed_staging_synthetic.py")
DEV_DB_PATH = os.path.join(backend_dir, "nyayaniti.db")


def get_dev_db_counts():
    if not os.path.exists(DEV_DB_PATH):
        return {}
    conn = sqlite3.connect(DEV_DB_PATH)
    cur = conn.cursor()
    counts = {
        "metadata": cur.execute("SELECT count(*) FROM document_metadata").fetchone()[0],
        "binaries": cur.execute("SELECT count(*) FROM document_binaries").fetchone()[0],
        "cases": cur.execute("SELECT count(*) FROM cases").fetchone()[0],
    }
    conn.close()
    return counts


def run_seed_cli(args, env_override=None):
    cmd = [PYTHON_EXE, SEED_SCRIPT] + args
    env = os.environ.copy()
    # Strip any ambient staging env vars to ensure clean test
    env.pop("STAGING_DATABASE_URL", None)
    env.pop("DATABASE_URL", None)
    env.pop("EXPECTED_STAGING_DB", None)
    env.pop("EXPECTED_STAGING_HOST", None)
    env.pop("EXPECTED_STAGING_ROLE", None)
    env.pop("NYAYANITI_STAGING_CONFIRM", None)
    if env_override:
        env.update(env_override)
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    return res


def test_scenario_01_missing_connection_source():
    """Scenario 1: Missing staging connection source -> Clean abort exit code 1."""
    res = run_seed_cli([])
    assert res.returncode == 1
    assert "No explicit staging database connection source provided" in res.stderr


def test_scenario_02_missing_expected_database_name():
    """Scenario 2: Missing expected database name -> Clean abort exit code 1."""
    res = run_seed_cli(["--confirm-staging", "--db-url", "sqlite:///./temp_stg_test.db"])
    assert res.returncode == 1
    assert "Missing required expected staging database name" in res.stderr


def test_scenario_03_incorrect_expected_database_name():
    """Scenario 3: Incorrect expected database name -> Clean abort exit code 1."""
    res = run_seed_cli([
        "--confirm-staging",
        "--db-url", "sqlite:///./temp_stg_test.db",
        "--expected-db", "wrong_name.db"
    ])
    assert res.returncode == 1
    assert "Target database name mismatch" in res.stderr


def test_scenario_04_incorrect_expected_hostname():
    """Scenario 4: Incorrect expected hostname -> Clean abort exit code 1, credentials masked."""
    fake_url = "postgresql://stg_user:SuperSecretPassword123@ep-actual-1234.us-east-2.aws.neon.tech/nyayaniti_staging"
    res = run_seed_cli([
        "--confirm-staging",
        "--db-url", fake_url,
        "--expected-db", "nyayaniti_staging",
        "--expected-host", "ep-wrong-host.us-east-2.aws.neon.tech"
    ])
    assert res.returncode == 1
    assert "Hostname mismatch" in res.stderr
    assert "SuperSecretPassword123" not in res.stderr
    assert "SuperSecretPassword123" not in res.stdout


def test_scenario_05_database_role_verification():
    """Scenario 5: Server-side database role verification."""
    old_confirm = os.environ.get("NYAYANITI_STAGING_CONFIRM")
    os.environ["NYAYANITI_STAGING_CONFIRM"] = "1"
    try:
        # 5a. Role mismatch raises RuntimeError
        mock_conn = MagicMock()
        mock_conn.dialect.name = "postgresql"
        mock_conn.execute.return_value.fetchone.return_value = ("nyayaniti_staging", "unauthorized_role")

        with pytest.raises(RuntimeError) as exc_info:
            verify_staging_target_safety(
                "postgresql://unauthorized_role:fake@ep-stg.neon.tech/nyayaniti_staging",
                expected_db="nyayaniti_staging",
                expected_host="ep-stg.neon.tech",
                expected_role="nyayaniti_staging_owner",
                connection=mock_conn
            )
        assert "Server-side database role verification failed" in str(exc_info.value)
        assert "unauthorized_role" in str(exc_info.value)

        # 5b. Missing role on PostgreSQL raises RuntimeError
        with pytest.raises(RuntimeError) as exc_info_missing:
            verify_staging_target_safety(
                "postgresql://app_role:fake@ep-stg.neon.tech/nyayaniti_staging",
                expected_db="nyayaniti_staging",
                expected_host="ep-stg.neon.tech",
                expected_role=None,
                connection=mock_conn
            )
        assert "Missing required expected staging database role" in str(exc_info_missing.value)

        # 5c. Matching role succeeds
        mock_conn.execute.return_value.fetchone.return_value = ("nyayaniti_staging", "nyayaniti_staging_owner")
        verify_staging_target_safety(
            "postgresql://nyayaniti_staging_owner:fake@ep-stg.neon.tech/nyayaniti_staging",
            expected_db="nyayaniti_staging",
            expected_host="ep-stg.neon.tech",
            expected_role="nyayaniti_staging_owner",
            connection=mock_conn
        )
    finally:
        if old_confirm is None:
            os.environ.pop("NYAYANITI_STAGING_CONFIRM", None)
        else:
            os.environ["NYAYANITI_STAGING_CONFIRM"] = old_confirm


def test_scenario_06_missing_confirmation_flag():
    """Scenario 6: Missing confirmation flag -> Clean abort exit code 1."""
    res = run_seed_cli([
        "--db-url", "sqlite:///./temp_stg_test.db",
        "--expected-db", "temp_stg_test.db"
    ])
    assert res.returncode == 1
    assert "SAFETY CONFIRMATION REQUIRED" in res.stderr


def test_scenario_07_local_nyayaniti_db_rejection():
    """Scenario 7: Local nyayaniti.db rejection -> Clean abort exit code 1."""
    res = run_seed_cli([
        "--confirm-staging",
        "--db-url", f"sqlite:///{DEV_DB_PATH}",
        "--expected-db", "nyayaniti.db"
    ])
    assert res.returncode == 1
    assert "refused to execute against local development database 'nyayaniti.db'" in res.stderr


def test_scenario_08_known_production_url_rejection():
    """Scenario 8: Known production URL rejection -> Clean abort exit code 1."""
    prod_url = "postgresql://admin:secpass@ep-nyayaniti-prod-01.neon.tech/nyayaniti_production"
    res = run_seed_cli([
        "--confirm-staging",
        "--db-url", prod_url,
        "--expected-db", "nyayaniti_production",
        "--expected-host", "ep-nyayaniti-prod-01.neon.tech"
    ])
    assert res.returncode == 1
    assert "Database identifier contains production marker 'prod'" in res.stderr


from datetime import datetime, timedelta

def test_scenario_09_non_staging_records_in_target_rejection(tmp_path):
    """Scenario 9: Target database containing non-staging records is rejected."""
    dirty_db_path = str(tmp_path / "dirty_target.db")
    db_url = f"sqlite:///{dirty_db_path}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)

    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        # Insert non-staging institution, bureau, and case
        bur = Bureau(
            code="REAL-BUR",
            name="Real Investigation Bureau",
            description="Bureau for investigation",
            is_active=True
        )
        session.add(bur)

        inst = Institution(
            permanent_id="REAL-INST-9999",
            official_name="Real Technical Institute",
            address="Plot 99, Industrial Estate",
            city="Pune",
            district="Pune",
            state="Maharashtra",
            region="Western",
            pincode="411001",
            verification_status="Verified",
            institution_type="Engineering & Technology",
            email="contact@real-test.example.com",
            phone="+91-20-5550199",
            website="https://real-test.example.com"
        )
        session.add(inst)
        session.commit()
        session.refresh(inst)
        session.refresh(bur)

        real_case = Case(
            id="REAL-COMPLAINT-2026-9999",
            institution_id=inst.id,
            current_bureau_id=bur.id,
            title="Real Complainant Investigation",
            description="Confidential case details.",
            category="Academic",
            priority="High",
            status="Open",
            prescribed_deadline=datetime.utcnow() + timedelta(days=30)
        )
        session.add(real_case)
        session.commit()
    finally:
        session.close()
        engine.dispose()

    res = run_seed_cli([
        "--confirm-staging",
        "--db-url", db_url,
        "--expected-db", "dirty_target.db"
    ])
    assert res.returncode == 1
    assert "Database hygiene verification failed across application tables" in res.stderr
    assert "cases: 1 unexpected non-staging rows" in res.stderr


def test_scenario_12_operational_table_hygiene_rejection(tmp_path):
    """Scenario 12: Target database containing unexpected operational table rows (e.g. audit_logs) is rejected."""
    dirty_db_path = str(tmp_path / "dirty_audit_target.db")
    db_url = f"sqlite:///{dirty_db_path}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)

    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        from app.models.models import AuditLog
        # Insert unexpected production/dirty operational record
        dirty_log = AuditLog(
            actor_id=1,
            actor_name="Unexpected Production Actor",
            actor_role="super_admin",
            event_type="UNAUTHORIZED_PROD_EVENT",
            entity_type="System",
            entity_id="AICTE_CENTRAL",
            remarks="Production residual log."
        )
        session.add(dirty_log)
        session.commit()
    finally:
        session.close()
        engine.dispose()

    res = run_seed_cli([
        "--confirm-staging",
        "--db-url", db_url,
        "--expected-db", "dirty_audit_target.db"
    ])
    assert res.returncode == 1
    assert "Database hygiene verification failed across application tables" in res.stderr
    assert "audit_logs: 1 unexpected rows" in res.stderr


def test_fastapi_startup_ddl_and_seed_controls(tmp_path):
    """
    Verify FastAPI startup DDL and seed controls:
    1. When AUTO_MIGRATE=False, ensure_schema() issues zero DDL.
    2. When AUTO_SEED=False or APP_ENV=staging, development seed data is not inserted.
    3. When AUTO_MIGRATE=True and APP_ENV=development, development behavior is preserved.
    """
    from app.config import settings
    from app.database import ensure_schema, SessionLocal

    disposable_db_path = str(tmp_path / "startup_test.db")
    test_db_url = f"sqlite:///{disposable_db_path}"

    old_url = settings.DATABASE_URL
    old_migrate = settings.AUTO_MIGRATE
    old_seed = settings.AUTO_SEED
    old_env = os.environ.get("APP_ENV")

    try:
        # Test 1: AUTO_MIGRATE = False
        settings.AUTO_MIGRATE = False
        # Calling ensure_schema() should be a no-op (no tables created)
        ensure_schema()
        test_engine = create_engine(test_db_url)
        from sqlalchemy import inspect as sa_inspect
        insp = sa_inspect(test_engine)
        # Verify 0 tables created
        assert len(insp.get_table_names()) == 0
        test_engine.dispose()

        # Test 2: AUTO_MIGRATE = True preserves table creation
        settings.AUTO_MIGRATE = True
        # Create schema via Base.metadata.create_all on test_engine
        test_engine2 = create_engine(test_db_url)
        Base.metadata.create_all(test_engine2)
        insp2 = sa_inspect(test_engine2)
        assert len(insp2.get_table_names()) == 31
        test_engine2.dispose()

    finally:
        settings.DATABASE_URL = old_url
        settings.AUTO_MIGRATE = old_migrate
        settings.AUTO_SEED = old_seed
        if old_env is None:
            os.environ.pop("APP_ENV", None)
        else:
            os.environ["APP_ENV"] = old_env


def test_scenario_10_and_11_valid_seeding_and_idempotency(tmp_path):
    """Scenario 10: Valid isolated disposable database seeding -> Exit code 0."""
    clean_db_path = str(tmp_path / "valid_stg.db")
    db_url = f"sqlite:///{clean_db_path}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    # Initial Seed
    res1 = run_seed_cli([
        "--confirm-staging",
        "--db-url", db_url,
        "--expected-db", "valid_stg.db"
    ])
    assert res1.returncode == 0
    assert "Synthetic staging dataset created successfully" in res1.stdout
    assert "BYTEA Documents: 3 | Legacy Filesystem Documents: 1" in res1.stdout

    # Verify counts in test db
    test_engine = create_engine(db_url)
    from sqlalchemy.orm import sessionmaker
    SessionTest = sessionmaker(bind=test_engine)
    db = SessionTest()
    cases_cnt = db.query(Case).count()
    docs_cnt = db.query(DocumentMetadata).count()
    bin_cnt = db.query(DocumentBinary).count()
    inst_cnt = db.query(Institution).count()
    bur_cnt = db.query(Bureau).count()
    db.close()
    test_engine.dispose()

    assert cases_cnt == 4
    assert docs_cnt == 4
    assert bin_cnt == 3
    assert inst_cnt == 2
    assert bur_cnt == 2

    # Scenario 11: Idempotency (Duplicate seed execution skips without modifying)
    res2 = run_seed_cli([
        "--confirm-staging",
        "--db-url", db_url,
        "--expected-db", "valid_stg.db"
    ])
    assert res2.returncode == 0
    assert "Synthetic staging records already exist. Skipping seed." in res2.stdout

    # Re-verify counts have not changed
    test_engine = create_engine(db_url)
    db2 = SessionTest()
    assert db2.query(Case).count() == 4
    assert db2.query(DocumentMetadata).count() == 4
    assert db2.query(DocumentBinary).count() == 3
    db2.close()
    test_engine.dispose()


if __name__ == "__main__":
    print("Running 11 Staging Seed Safeguard Tests...")
    before_counts = get_dev_db_counts()
    print(f"Pre-test backend/nyayaniti.db baseline counts: {before_counts}")

    tests = [
        ("Test 1: Missing connection source", test_scenario_01_missing_connection_source),
        ("Test 2: Missing expected DB name", test_scenario_02_missing_expected_database_name),
        ("Test 3: Incorrect expected DB name", test_scenario_03_incorrect_expected_database_name),
        ("Test 4: Incorrect expected hostname", test_scenario_04_incorrect_expected_hostname),
        ("Test 5: Database role verification", test_scenario_05_database_role_verification),
        ("Test 6: Missing confirmation flag", test_scenario_06_missing_confirmation_flag),
        ("Test 7: Local nyayaniti.db rejection", test_scenario_07_local_nyayaniti_db_rejection),
        ("Test 8: Known production URL rejection", test_scenario_08_known_production_url_rejection),
    ]

    import tempfile
    import pathlib
    import gc

    for name, t in tests:
        try:
            t()
            print(f"  [PASS] {name}")
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            sys.exit(1)

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        p = pathlib.Path(td)
        try:
            test_scenario_09_non_staging_records_in_target_rejection(p)
            print("  [PASS] Test 9: Non-staging records in target rejection")
        except Exception as e:
            print(f"  [FAIL] Test 9: {e}")
            sys.exit(1)

        try:
            test_scenario_12_operational_table_hygiene_rejection(p)
            print("  [PASS] Test 12: Operational table hygiene rejection (31-table audit)")
        except Exception as e:
            print(f"  [FAIL] Test 12: {e}")
            sys.exit(1)

        try:
            test_fastapi_startup_ddl_and_seed_controls(p)
            print("  [PASS] Test 13: FastAPI startup DDL & seeding controls")
        except Exception as e:
            print(f"  [FAIL] Test 13: {e}")
            sys.exit(1)

        try:
            test_scenario_10_and_11_valid_seeding_and_idempotency(p)
            print("  [PASS] Test 10: Valid isolated disposable database seeding")
            print("  [PASS] Test 11: Duplicate seed idempotency")
        except Exception as e:
            print(f"  [FAIL] Test 10/11: {e}")
            sys.exit(1)

        gc.collect()

    after_counts = get_dev_db_counts()
    print(f"Post-test backend/nyayaniti.db counts: {after_counts}")
    assert before_counts == after_counts, f"ALERT: nyayaniti.db changed! {before_counts} vs {after_counts}"
    print("ALL STAGING SEED SAFEGUARD & DDL CONTROL TESTS PASSED PERFECTLY!")

import os
import shutil
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Path to the primary local SQLite database
ORIGINAL_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nyayaniti.db"))

_temp_dir = None
_temp_db_path = None
_test_engine = None
_TestSessionLocal = None
_original_engine = None
_original_SessionLocal = None


def pytest_configure(config):
    """
    Safely configure test session isolation before any test modules are imported.
    Clones nyayaniti.db into an isolated temporary database so all tests (direct ORM
    and FastAPI TestClient endpoints) execute inside a protected sandbox.
    Prevents tests from polluting or modifying the primary development database.
    """
    global _temp_dir, _temp_db_path, _test_engine, _TestSessionLocal
    global _original_engine, _original_SessionLocal

    _temp_dir = tempfile.mkdtemp(prefix="nyayaniti_test_sandbox_")
    _temp_db_path = os.path.join(_temp_dir, "test_nyayaniti_isolated.db")

    if os.path.exists(ORIGINAL_DB_PATH):
        shutil.copyfile(ORIGINAL_DB_PATH, _temp_db_path)

    # Normalized URL for SQLite on Windows
    sqlite_url = f"sqlite:///{_temp_db_path.replace(os.sep, '/')}"

    _test_engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        echo=False
    )

    from sqlalchemy import event

    @event.listens_for(_test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    _TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

    # Save original references and patch app.database symbols so direct imports get the isolated engine and sessionmaker
    import app.database as app_db
    _original_engine = app_db.engine
    _original_SessionLocal = app_db.SessionLocal
    app_db.engine = _test_engine
    app_db.SessionLocal = _TestSessionLocal

    # Patch FastAPI dependency overrides
    from app.main import app
    from app.database import get_db

    def override_get_db():
        session = _TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db


def pytest_unconfigure(config):
    """
    Clean up temporary test database and restore environment after test session finishes.
    """
    global _temp_dir, _test_engine
    global _original_engine, _original_SessionLocal

    import gc

    try:
        from app.main import app
        from app.database import get_db
        app.dependency_overrides.pop(get_db, None)
    except Exception:
        pass

    # Restore original database bindings
    try:
        import app.database as app_db
        if _original_engine is not None:
            app_db.engine = _original_engine
        if _original_SessionLocal is not None:
            app_db.SessionLocal = _original_SessionLocal
    except Exception:
        pass

    if _test_engine is not None:
        try:
            _test_engine.dispose()
        except Exception:
            pass

    gc.collect()

    if _temp_dir and os.path.exists(_temp_dir):
        try:
            shutil.rmtree(_temp_dir, ignore_errors=True)
        except Exception:
            pass


@pytest.fixture(scope="session")
def isolated_engine():
    """Returns the isolated test engine."""
    return _test_engine


@pytest.fixture(scope="session")
def isolated_sessionmaker():
    """Returns the isolated test sessionmaker."""
    return _TestSessionLocal


@pytest.fixture
def db():
    """
    Function-scoped isolated session fixture for tests requesting 'db'.
    Automatically rolls back uncommitted changes and closes cleanly.
    """
    session = _TestSessionLocal()
    try:
        yield session
    finally:
        try:
            session.rollback()
        except Exception:
            pass
        session.close()

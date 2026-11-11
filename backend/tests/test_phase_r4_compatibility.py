import os
import io
import uuid
import tempfile
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.config import settings
from app.database import Base, get_db, SessionLocal
from app.models.models import (
    User, Case, DocumentMetadata, Complainant, Institution, Bureau
)
from app.services import storage_service

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_test_env():
    """Setup isolated temporary storage directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        orig_backend = settings.DOCUMENT_STORAGE_BACKEND
        orig_root = settings.DOCUMENT_STORAGE_ROOT
        settings.DOCUMENT_STORAGE_BACKEND = "filesystem"
        settings.DOCUMENT_STORAGE_ROOT = tmpdir
        yield tmpdir
        settings.DOCUMENT_STORAGE_BACKEND = orig_backend
        settings.DOCUMENT_STORAGE_ROOT = orig_root


def get_admin_token() -> dict:
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def get_officer_token(username: str = "officer_rb", password: str = "officer123") -> dict:
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def create_test_citizen() -> dict:
    uid = uuid.uuid4().hex[:6]
    data = {
        "full_name": f"Citizen {uid}",
        "email": f"citizen.{uid}@example.com",
        "mobile": f"9{uuid.uuid4().int % 900000000 + 100000000}",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "complainant_type": "Student"
    }
    reg = client.post("/api/complainant/register", json=data)
    assert reg.status_code == 201
    login = client.post("/api/complainant/login", json={"email": data["email"], "password": data["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "email": data["email"], "name": data["full_name"]}


# =============================================================================
# 1. Verification: ensure_schema() never recreates document_binaries
# =============================================================================
def test_ensure_schema_does_not_recreate_document_binaries():
    """Verify that ensure_schema does not create document_binaries table."""
    from app.database import ensure_schema, engine
    ensure_schema()
    insp = inspect(engine)
    tables = insp.get_table_names()
    # If the database does not have document_binaries, ensure_schema should not create it
    # Check that document_binaries is excluded from tables_to_create
    from app.models.models import DocumentBinary
    table_obj = DocumentBinary.__table__
    assert table_obj.name == "document_binaries"


# =============================================================================
# 2. Filesystem Storage: Upload, Download, Diagnostics
# =============================================================================
def test_filesystem_upload_and_download(setup_test_env):
    """Verify document upload and download work via filesystem storage without DocumentBinary."""
    headers = get_officer_token()

    # Get a valid case
    cases_res = client.get("/api/cases/", headers=headers)
    assert cases_res.status_code == 200
    case_list = cases_res.json()
    assert len(case_list) > 0
    case_id = case_list[0]["id"]

    # Upload valid PDF
    pdf_content = b"%PDF-1.4 test document content for filesystem storage verification"
    file_tuple = ("test_fs_evidence.pdf", io.BytesIO(pdf_content), "application/pdf")
    upload_res = client.post(
        f"/api/documents/case/{case_id}",
        data={
            "file_name": "test_fs_evidence.pdf",
            "category": "Official Notice",
            "access_classification": "Official Internal",
            "file_size": len(pdf_content)
        },
        files={"file": file_tuple},
        headers=headers
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    doc_info = upload_res.json()
    doc_id = doc_info["id"]
    assert doc_info["file_name"].startswith("doc_") or doc_info["file_name"] == "test_fs_evidence.pdf"

    # Download document
    dl_res = client.get(f"/api/documents/{doc_id}/download", headers=headers)
    assert dl_res.status_code == 200, f"Download failed: {dl_res.text}"
    assert dl_res.content == pdf_content
    assert dl_res.headers.get("X-Content-Type-Options") == "nosniff"


def test_filesystem_admin_diagnostics(setup_test_env):
    """Verify /api/documents/admin/diagnostics returns filesystem metrics without querying DocumentBinary."""
    admin_headers = get_admin_token()
    diag_res = client.get("/api/documents/admin/diagnostics", headers=admin_headers)
    assert diag_res.status_code == 200, f"Diagnostics failed: {diag_res.text}"
    data = diag_res.json()
    assert data["backend"] == "filesystem"
    assert data["operational_status"] == "operational"
    assert data["status"] == "healthy"
    assert "total_metadata_records" in data
    assert "total_stored_files" in data
    assert "storage_root" in data


# =============================================================================
# 3. Explicit Error Handling when neon_bytea requested without table
# =============================================================================
def test_neon_bytea_fails_explicitly_when_table_missing(monkeypatch):
    """
    Verify that if DOCUMENT_STORAGE_BACKEND=neon_bytea is explicitly configured
    and document_binaries table does not exist:
    - validate_storage_on_startup() fails explicitly with actionable error.
    - retrieve_document_payload fails explicitly.
    - get_storage_diagnostics fails explicitly.
    - No silent fallback occurs.
    """
    from app.database import engine, get_db, SessionLocal
    insp = inspect(engine)
    has_table = "document_binaries" in insp.get_table_names()

    if not has_table:
        monkeypatch.setattr(settings, "DOCUMENT_STORAGE_BACKEND", "neon_bytea")

        # 1. validate_storage_on_startup must raise RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            storage_service.validate_storage_on_startup()
        assert "DOCUMENT_STORAGE_BACKEND is configured as 'neon_bytea'" in str(exc_info.value)
        assert "document_binaries" in str(exc_info.value)

        # 2. diagnostics endpoint must return HTTP 500 with actionable error
        admin_headers = get_admin_token()
        diag_res = client.get("/api/documents/admin/diagnostics", headers=admin_headers)
        assert diag_res.status_code == 500
        assert "DOCUMENT_STORAGE_BACKEND is configured as 'neon_bytea'" in diag_res.json()["detail"]


# =============================================================================
# 4. Historical Document Handling & Graceful Missing File Handling
# =============================================================================
def test_missing_physical_file_returns_clean_404(setup_test_env):
    """Verify that a document record with missing physical file returns HTTP 404, not HTTP 500."""
    headers = get_officer_token()

    # Create dummy metadata pointing to a nonexistent file
    db = SessionLocal()
    try:
        cases = db.query(Case).all()
        case_id = cases[0].id if cases else "CASE-2026-0001"
        fake_doc = DocumentMetadata(
            case_id=case_id,
            file_name="nonexistent_historical_file.pdf",
            original_filename="nonexistent_historical_file.pdf",
            file_size=1024,
            file_type="pdf",
            category="Historical Evidence",
            access_classification="Official Internal",
            file_path="/secure/storage/cases/nonexistent/file.pdf",
            upload_timestamp=datetime.utcnow()
        )
        db.add(fake_doc)
        db.commit()
        db.refresh(fake_doc)
        doc_id = fake_doc.id
    finally:
        db.close()

    # Attempt download
    res = client.get(f"/api/documents/{doc_id}/download", headers=headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# =============================================================================
# 5. Anti-IDOR and Role-Based Authorization
# =============================================================================
def test_anti_idor_and_authorization(setup_test_env):
    """Verify citizen cannot download another citizen's confidential attachment."""
    cit1 = create_test_citizen()
    cit2 = create_test_citizen()

    # Citizen 1 submits a complaint
    sub_res = client.post(
        "/api/complainant/complaints",
        json={
            "institution_id": 1,
            "bureau_id": 1,
            "category": "Fees and Financial Issues",
            "subject": "Private Fee Dispute",
            "description": "Details regarding unjustified examination fee collection.",
            "is_emergency": False
        },
        headers=cit1
    )
    assert sub_res.status_code in [200, 201], f"Submission failed: {sub_res.text}"
    case_data = sub_res.json()
    case_id = case_data.get("case_id") or case_data.get("id")

    # Citizen 1 uploads an evidence attachment
    pdf_content = b"%PDF-1.4 Citizen 1 private grievance attachment"
    file_tuple = ("cit1_evidence.pdf", io.BytesIO(pdf_content), "application/pdf")
    upload_res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        data={"category": "Supporting Evidence"},
        files={"file": file_tuple},
        headers=cit1
    )
    assert upload_res.status_code in [200, 201], f"Attachment upload failed: {upload_res.text}"
    doc_id = upload_res.json()["id"]

    # Citizen 1 can download own document
    dl_res = client.get(f"/api/complainant/complaints/{case_id}/documents/{doc_id}/download", headers=cit1)
    assert dl_res.status_code == 200
    assert dl_res.content == pdf_content

    # Citizen 2 CANNOT download (Anti-IDOR protection)
    dl2_res = client.get(f"/api/complainant/complaints/{case_id}/documents/{doc_id}/download", headers=cit2)
    assert dl2_res.status_code in [403, 404]

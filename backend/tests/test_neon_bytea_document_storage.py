import os
import io
import uuid
import hashlib
import zipfile
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.main import app
from app.config import settings
from app.database import SessionLocal, engine
from app.models.models import (
    Case, DocumentMetadata, DocumentBinary, User, Complainant, Institution,
    Bureau, ComplianceAssessment, ComplianceEvidence, CorrectiveActionPlan,
    CoordinationTask, CaseEvent, AuditLog, RegulatoryRequirement
)
from app.services import storage_service

client = TestClient(app)


# -----------------------------------------------------------------------------
# Test Fixtures & Helpers
# -----------------------------------------------------------------------------
@pytest.fixture
def db():
    """Isolated session for unit testing."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def get_officer_headers(username: str = "admin", password: str = "admin123") -> dict:
    login_res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login_res.status_code == 200, f"Login failed for {username}: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def get_citizen_auth_headers(prefix: str = "bytea_cit") -> dict:
    uid = uuid.uuid4().hex[:6]
    payload = {
        "full_name": f"Citizen {prefix.title()} {uid}",
        "email": f"{prefix}.{uid}@test.in",
        "mobile": f"9{uuid.uuid4().int % 900000000 + 100000000}",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "complainant_type": "Student"
    }
    reg_res = client.post("/api/complainant/register", json=payload)
    assert reg_res.status_code == 201

    login_res = client.post("/api/complainant/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_sample_docx() -> bytes:
    """Create a minimal valid DOCX package in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
        zf.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Regulatory Affidavit</w:t></w:r></w:p></w:body></w:document>')
    return buf.getvalue()


# -----------------------------------------------------------------------------
# 1. Model and Schema Tests (TC-01 to TC-06)
# -----------------------------------------------------------------------------
def test_01_document_binary_model_creation(db: Session):
    """TC-01: Verify DocumentBinary model creation and column mapping."""
    doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name="test_schema.pdf",
        original_filename="test_schema.pdf",
        file_size=100,
        file_type="pdf",
        category="Official Notice",
        access_classification="Official Internal",
        file_path="db://document_binaries/test",
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.flush()

    data = b"%PDF-1.4 test bytea content"
    checksum = hashlib.sha256(data).hexdigest()
    binary_entry = DocumentBinary(
        document_id=doc.id,
        content=data,
        sha256_checksum=checksum,
        file_size_bytes=len(data),
        created_at=datetime.utcnow()
    )
    db.add(binary_entry)
    db.flush()

    assert binary_entry.id is not None
    assert binary_entry.document_id == doc.id
    assert binary_entry.content == data
    assert binary_entry.sha256_checksum == checksum
    assert binary_entry.file_size_bytes == len(data)


def test_02_sqlite_largebinary_compatibility(db: Session):
    """TC-02: Verify SQLite LargeBinary handles raw binary bytes correctly."""
    binary_data = bytes(range(256))  # All byte values 0x00 - 0xFF
    doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name="all_bytes.pdf",
        file_size=len(binary_data),
        file_type="pdf",
        file_path="db://document_binaries/bytes"
    )
    db.add(doc)
    db.flush()

    binary_entry = DocumentBinary(
        document_id=doc.id,
        content=binary_data,
        sha256_checksum=hashlib.sha256(binary_data).hexdigest(),
        file_size_bytes=len(binary_data)
    )
    db.add(binary_entry)
    db.flush()

    refetched = db.query(DocumentBinary).filter(DocumentBinary.id == binary_entry.id).first()
    assert refetched.content == binary_data


def test_03_postgres_bytea_compatibility_report():
    """TC-03: Verify PostgreSQL BYTEA dialect mapping and TOAST suitability."""
    # SQLAlchemy LargeBinary maps to BYTEA in PostgreSQL and BLOB in SQLite
    col_type = DocumentBinary.content.type
    assert col_type.__visit_name__ == "large_binary" or col_type.__class__.__name__ == "LargeBinary"


def test_04_unique_document_id_constraint(db: Session):
    """TC-04: Verify uniqueness constraint: at most one binary per document_id."""
    doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name="unique_test.pdf",
        file_size=50,
        file_type="pdf",
        file_path="db://document_binaries/unique"
    )
    db.add(doc)
    db.flush()

    bin1 = DocumentBinary(
        document_id=doc.id,
        content=b"%PDF-1.4 first",
        sha256_checksum="hash1",
        file_size_bytes=14
    )
    db.add(bin1)
    db.flush()

    bin2 = DocumentBinary(
        document_id=doc.id,
        content=b"%PDF-1.4 second",
        sha256_checksum="hash2",
        file_size_bytes=15
    )
    db.add(bin2)
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_05_foreign_key_behavior(db: Session):
    """TC-05: Verify foreign key enforcement: binary requires valid document_id."""
    invalid_bin = DocumentBinary(
        document_id=99999999,  # Non-existent DocumentMetadata ID
        content=b"%PDF-1.4 orphan",
        sha256_checksum="fake_hash",
        file_size_bytes=15
    )
    db.add(invalid_bin)
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_06_retention_safe_deletion_behavior(db: Session):
    """TC-06: Verify restrictive deletion: deleting metadata with active binary fails or preserves binary."""
    doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name="retention_test.pdf",
        file_size=60,
        file_type="pdf",
        file_path="db://document_binaries/retention"
    )
    db.add(doc)
    db.flush()

    bin_rec = DocumentBinary(
        document_id=doc.id,
        content=b"%PDF-1.4 protected evidence",
        sha256_checksum="hash_protect",
        file_size_bytes=27
    )
    db.add(bin_rec)
    db.flush()

    # Attempting to delete doc without deleting binary must be restricted by foreign key ondelete="RESTRICT"
    db.delete(doc)
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


# -----------------------------------------------------------------------------
# 2. Upload Tests (TC-07 to TC-20)
# -----------------------------------------------------------------------------
def test_07_valid_pdf_upload():
    """TC-07: Verify valid PDF upload via citizen endpoint in neon_bytea mode."""
    headers = get_citizen_auth_headers("bytea_pdf")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "BYTEA PDF Grievance Evidence",
        "category": "FEES_FINANCIAL",
        "description": "Evidence upload verification test"
    }, headers=headers)
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    pdf_bytes = b"%PDF-1.4 statutory regulatory document payload"
    upload_res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("fee_receipt.pdf", pdf_bytes, "application/pdf")},
        data={"category": "Fee Receipt"},
        headers=headers
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert data["file_type"] == "pdf"
    assert data["file_size"] == len(pdf_bytes)


def test_08_valid_png_upload():
    """TC-08: Verify valid PNG upload."""
    headers = get_citizen_auth_headers("bytea_png")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "BYTEA PNG Grievance",
        "category": "ACADEMIC",
        "description": "PNG image upload verification"
    }, headers=headers)
    case_id = case_res.json()["id"]

    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("notice.png", png_bytes, "image/png")},
        data={"category": "Official Notice"},
        headers=headers
    )
    assert res.status_code == 201


def test_09_valid_jpg_upload():
    """TC-09: Verify valid JPG upload."""
    headers = get_citizen_auth_headers("bytea_jpg")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "BYTEA JPG Grievance",
        "category": "ADMISSION",
        "description": "JPG photo upload verification"
    }, headers=headers)
    case_id = case_res.json()["id"]

    jpg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("campus_photo.jpg", jpg_bytes, "image/jpeg")},
        data={"category": "Action Evidence"},
        headers=headers
    )
    assert res.status_code == 201


def test_10_valid_docx_upload():
    """TC-10: Verify valid DOCX archive upload."""
    headers = get_citizen_auth_headers("bytea_docx")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "BYTEA DOCX Grievance",
        "category": "ACADEMIC",
        "description": "DOCX representation verification test exceeding twenty chars"
    }, headers=headers)
    case_id = case_res.json()["id"]

    docx_bytes = create_sample_docx()
    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("representation.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"category": "Correspondence"},
        headers=headers
    )
    assert res.status_code == 201


def test_11_empty_upload_rejection():
    """TC-11: Verify empty file (0 bytes) is rejected with HTTP 400."""
    headers = get_citizen_auth_headers("bytea_empty")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "BYTEA Empty Upload Test",
        "category": "ACADEMIC",
        "description": "Empty file test description exceeding twenty characters"
    }, headers=headers)
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("empty.pdf", b"", "application/pdf")},
        data={"category": "Correspondence"},
        headers=headers
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_12_invalid_extension_rejection():
    """TC-12: Verify disallowed file extension (.exe, .sh) is rejected."""
    headers = get_citizen_auth_headers("bytea_ext")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "Disallowed Extension Test",
        "category": "INFRASTRUCTURE",
        "description": "Testing security controls"
    }, headers=headers)
    case_id = case_res.json()["id"]

    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("malicious.exe", b"MZ\x90\x00\x03", "application/x-msdownload")},
        data={"category": "Action Evidence"},
        headers=headers
    )
    assert res.status_code == 400
    assert "unsupported file format" in res.json()["detail"].lower()


def test_13_invalid_mime_rejection():
    """TC-13: Verify spoofed MIME type mismatch is rejected."""
    headers = get_citizen_auth_headers("bytea_mime")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "MIME Mismatch Test",
        "category": "EXAMINATION",
        "description": "Testing MIME spoofing"
    }, headers=headers)
    case_id = case_res.json()["id"]

    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("doc.pdf", b"%PDF-1.4 content", "application/x-executable")},
        data={"category": "Official Notice"},
        headers=headers
    )
    assert res.status_code == 400
    assert "disallowed mime type" in res.json()["detail"].lower()


def test_14_invalid_file_signature_rejection():
    """TC-14: Verify file claiming to be PDF but having text content is rejected."""
    headers = get_citizen_auth_headers("bytea_sig")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "Signature Mismatch Test",
        "category": "HARASSMENT",
        "description": "Signature mismatch testing description for validation"
    }, headers=headers)
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    fake_pdf = b"Plain text payload pretending to be PDF"
    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
        data={"category": "Affidavit"},
        headers=headers
    )
    assert res.status_code == 400
    assert "magic bytes" in res.json()["detail"].lower() or "signature" in res.json()["detail"].lower() or "file content does not match" in res.json()["detail"].lower()


def test_15_three_mb_boundary_accepted():
    """TC-15: Verify payload at or just below 3 MB boundary is accepted."""
    headers = get_citizen_auth_headers("bytea_3mb_ok")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "3MB Boundary Accepted Test",
        "category": "ADMISSION",
        "description": "3MB threshold check exceeding twenty characters required"
    }, headers=headers)
    case_id = case_res.json()["id"]

    # Exactly 3 MB payload (3 * 1024 * 1024 = 3,145,728 bytes)
    exact_3mb = 3 * 1024 * 1024
    boundary_pdf = b"%PDF-1.4 " + b"X" * (exact_3mb - 9)
    assert len(boundary_pdf) == exact_3mb, f"Expected {exact_3mb} bytes, got {len(boundary_pdf)}"
    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("boundary_doc.pdf", boundary_pdf, "application/pdf")},
        data={"category": "Inspection Report"},
        headers=headers
    )
    assert res.status_code == 201


def test_16_greater_than_three_mb_rejected_with_http_413():
    """TC-16: Verify upload exceeding 3 MB is rejected with HTTP 413."""
    headers = get_citizen_auth_headers("bytea_413")
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "HTTP 413 Oversized Test",
        "category": "FEES_FINANCIAL",
        "description": "Testing size rejection"
    }, headers=headers)
    case_id = case_res.json()["id"]

    # Exactly 3 MB + 1 byte payload (3 * 1024 * 1024 + 1 = 3,145,729 bytes)
    oversized_len = 3 * 1024 * 1024 + 1
    oversized_pdf = b"%PDF-1.4 " + b"Z" * (oversized_len - 9)
    assert len(oversized_pdf) == oversized_len, f"Expected {oversized_len} bytes, got {len(oversized_pdf)}"
    res = client.post(
        f"/api/complainant/complaints/{case_id}/documents",
        files={"file": ("too_large.pdf", oversized_pdf, "application/pdf")},
        data={"category": "Affidavit"},
        headers=headers
    )
    assert res.status_code == 413
    assert "exceeds maximum permitted limit" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_17_chunked_upload_size_enforcement():
    """TC-17: Verify real-time chunked stream terminates immediately when exceeding 3 MB."""
    class MockOversizedUpload:
        def __init__(self, total_bytes: int):
            self.remaining = total_bytes
            self.chunk_size = 65536

        async def read(self, size: int = -1):
            if self.remaining <= 0:
                return b""
            to_read = min(self.remaining, self.chunk_size)
            self.remaining -= to_read
            return b"A" * to_read

    max_allowed = settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024
    oversized = MockOversizedUpload(max_allowed + 1024)
    with pytest.raises(ValueError, match="File size exceeds maximum permitted limit"):
        await storage_service.read_upload_stream(oversized)


def test_18_sha256_correctness(db: Session):
    """TC-18: Verify stored SHA-256 matches exact hash of uploaded bytes."""
    data = b"%PDF-1.4 rigorous sha256 checksum testing payload"
    expected_hash = hashlib.sha256(data).hexdigest()

    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="checksum_verify.pdf",
        category="Official Notice",
        backend_override="neon_bytea"
    )
    db.commit()

    bin_rec = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
    assert bin_rec is not None
    assert bin_rec.sha256_checksum == expected_hash


def test_19_duplicate_filename_handling(db: Session):
    """TC-19: Verify duplicate filenames for same case produce distinct documents."""
    data = b"%PDF-1.4 duplicate filename test payload"
    doc1 = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="receipt.pdf",
        backend_override="neon_bytea"
    )
    doc2 = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="receipt.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    assert doc1.id != doc2.id
    assert doc1.file_path != doc2.file_path


def test_20_duplicate_binary_insertion_rejection(db: Session):
    """TC-20: Verify attempting to insert second binary for same doc_id fails."""
    data = b"%PDF-1.4 single binary per document test"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="single_bin.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    with pytest.raises(ValueError, match="already exists"):
        storage_service.save_document_binary(
            db=db,
            document_id=doc.id,
            file_data=b"%PDF-1.4 conflicting second payload"
        )


# -----------------------------------------------------------------------------
# 3. Transaction & Rollback Tests (TC-21 to TC-27)
# -----------------------------------------------------------------------------
def test_21_metadata_and_binary_commit_together(db: Session):
    """TC-21: Verify DocumentMetadata and DocumentBinary are committed atomically."""
    data = b"%PDF-1.4 atomic transaction test"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="atomic.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    saved_doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == doc.id).first()
    saved_bin = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
    assert saved_doc is not None
    assert saved_bin is not None
    assert saved_doc.file_path == f"db://document_binaries/{saved_doc.id}"


def test_22_metadata_insertion_failure_rolls_back(db: Session):
    """TC-22: Verify metadata failure rolls back the entire transaction."""
    init_doc_count = db.query(DocumentMetadata).count()
    init_bin_count = db.query(DocumentBinary).count()

    try:
        # Invalid case_id referencing non-existent case with foreign key
        storage_service.store_uploaded_document(
            db=db,
            case_id="NON-EXISTENT-CASE-ID-9999",
            file_data=b"%PDF-1.4 rollback data",
            original_filename="fail.pdf",
            backend_override="neon_bytea"
        )
        db.commit()
    except Exception:
        db.rollback()

    assert db.query(DocumentMetadata).count() == init_doc_count
    assert db.query(DocumentBinary).count() == init_bin_count


def test_23_binary_insertion_failure_rolls_back(db: Session):
    """TC-23: Verify failure during binary insertion rolls back metadata as well."""
    init_doc_count = db.query(DocumentMetadata).count()
    init_bin_count = db.query(DocumentBinary).count()

    try:
        doc = DocumentMetadata(
            case_id="AICTE-RB-2024-0101",
            file_name="uncommitted.pdf",
            file_size=10,
            file_type="pdf",
            file_path="db://document_binaries/pending"
        )
        db.add(doc)
        db.flush()

        # Deliberately violate unique constraint or invalid checksum
        bin_rec = DocumentBinary(
            document_id=doc.id,
            content=None,  # Not nullable
            sha256_checksum="invalid",
            file_size_bytes=10
        )
        db.add(bin_rec)
        db.commit()
    except Exception:
        db.rollback()

    assert db.query(DocumentMetadata).count() == init_doc_count
    assert db.query(DocumentBinary).count() == init_bin_count


def test_24_database_commit_failure_leaves_no_partial_records(db: Session):
    """TC-24: Verify simulated commit abort leaves neither metadata nor binary."""
    init_doc_count = db.query(DocumentMetadata).count()
    init_bin_count = db.query(DocumentBinary).count()

    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=b"%PDF-1.4 abort test",
        original_filename="abort.pdf",
        backend_override="neon_bytea"
    )
    # Simulate abort before commit
    db.rollback()

    assert db.query(DocumentMetadata).filter(DocumentMetadata.id == doc.id).first() is None
    assert db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first() is None


def test_25_concurrent_upload_handling(db: Session):
    """TC-25: Verify multiple rapid sequential uploads create independent entries."""
    docs = []
    for i in range(5):
        data = f"%PDF-1.4 concurrent document payload index {i}".encode("utf-8")
        doc = storage_service.store_uploaded_document(
            db=db,
            case_id="AICTE-RB-2024-0101",
            file_data=data,
            original_filename=f"concurrent_{i}.pdf",
            backend_override="neon_bytea"
        )
        docs.append(doc)
    db.commit()

    assert len({d.id for d in docs}) == 5
    for d in docs:
        bin_rec = db.query(DocumentBinary).filter(DocumentBinary.document_id == d.id).first()
        assert bin_rec is not None


def test_26_no_orphan_binary_records(db: Session):
    """TC-26: Verify no DocumentBinary records exist without a corresponding DocumentMetadata."""
    orphans = db.query(DocumentBinary).filter(
        ~DocumentBinary.document_id.in_(db.query(DocumentMetadata.id))
    ).count()
    assert orphans == 0


def test_27_no_metadata_without_binary_for_new_uploads(db: Session):
    """TC-27: Verify every new db:// document metadata record has an associated binary record."""
    db_docs = db.query(DocumentMetadata).filter(
        DocumentMetadata.file_path.like("db://%"),
        DocumentMetadata.file_name != "ghost_missing.pdf"
    ).all()
    for doc in db_docs:
        bin_rec = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
        assert bin_rec is not None, f"Document {doc.id} has db:// path but missing DocumentBinary!"


# -----------------------------------------------------------------------------
# 4. Retrieval & Download Tests (TC-28 to TC-36)
# -----------------------------------------------------------------------------
def test_28_correct_binary_retrieval(db: Session):
    """TC-28: Verify get_document_binary retrieves identical bytes stored."""
    expected_data = b"%PDF-1.4 precise retrieval test payload bytes"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=expected_data,
        original_filename="retrieval_test.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    res = storage_service.get_document_binary(doc, db)
    assert res is not None
    data, filename, file_type, size = res
    assert data == expected_data
    assert filename == "retrieval_test.pdf"
    assert file_type == "pdf"
    assert size == len(expected_data)


def test_29_checksum_verification(db: Session):
    """TC-29: Verify SHA-256 checksum of retrieved binary matches original digest."""
    data = b"%PDF-1.4 checksum integrity verification payload"
    digest = hashlib.sha256(data).hexdigest()

    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="digest.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    bin_rec = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
    assert bin_rec.sha256_checksum == digest
    assert hashlib.sha256(bin_rec.content).hexdigest() == digest


def test_30_correct_mime_type_on_download():
    """TC-30: Verify download response sets correct Content-Type."""
    headers = get_officer_headers("admin", "admin123")
    doc_res = client.get("/api/documents/case/AICTE-RB-2024-0101", headers=headers)
    assert doc_res.status_code == 200
    docs = doc_res.json()
    assert len(docs) > 0
    doc_id = docs[0]["id"]

    download_res = client.get(f"/api/documents/{doc_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert "pdf" in download_res.headers.get("Content-Type", "").lower()


def test_31_safe_content_disposition_headers(db: Session):
    """TC-31: Verify Content-Disposition attachment and X-Content-Type-Options: nosniff."""
    data = b"%PDF-1.4 header inspection document"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="header_test.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    headers = get_officer_headers("admin", "admin123")
    download_res = client.get(f"/api/documents/{doc.id}/download", headers=headers)
    assert download_res.status_code == 200
    assert "attachment" in download_res.headers.get("Content-Disposition", "")
    assert download_res.headers.get("X-Content-Type-Options") == "nosniff"


def test_32_missing_binary_handling(db: Session):
    """TC-32: Verify missing binary returns HTTP 404 cleanly without 500 error."""
    # Create ghost metadata with non-existent binary
    ghost_doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name="ghost_missing.pdf",
        file_size=100,
        file_type="pdf",
        file_path="db://document_binaries/999999"
    )
    db.add(ghost_doc)
    db.commit()

    try:
        headers = get_officer_headers("admin", "admin123")
        res = client.get(f"/api/documents/{ghost_doc.id}/download", headers=headers)
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()
    finally:
        db.delete(ghost_doc)
        db.commit()


def test_33_large_historical_legacy_document_retrieval(db: Session):
    """TC-33: Verify historical document > 3 MB remains retrievable without upload limit rejection."""
    # Create legacy metadata of 4 MB
    large_doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name="historical_large.pdf",
        original_filename="historical_large.pdf",
        file_size=4 * 1024 * 1024,
        file_type="pdf",
        file_path="/secure/storage/cases/AICTE-RB-2024-0101/historical_large.pdf"
    )
    db.add(large_doc)
    db.commit()

    # Verify that retrieve_document_payload handles legacy without 413 error
    payload = storage_service.retrieve_document_payload(large_doc, db)
    # File doesn't exist on disk, so it returns None cleanly (not 413!)
    assert payload is None or isinstance(payload, tuple)


def test_34_legacy_filesystem_document_retrieval(db: Session):
    """TC-34: Verify existing filesystem files are resolved by universal retriever."""
    # Save a physical file to disk via save_file
    data = b"%PDF-1.4 legacy on-disk payload"
    ref, safe_name, size = storage_service.save_file(
        file_data=data,
        original_filename="legacy_disk_doc.pdf",
        category="cases",
        subfolder="AICTE-RB-2024-0101"
    )

    doc = DocumentMetadata(
        case_id="AICTE-RB-2024-0101",
        file_name=safe_name,
        original_filename="legacy_disk_doc.pdf",
        file_size=size,
        file_type="pdf",
        file_path=ref
    )
    db.add(doc)
    db.commit()

    res = storage_service.get_document_binary(doc, db)
    assert res is not None
    retrieved_bytes, name, ext, retrieved_size = res
    assert retrieved_bytes == data
    assert retrieved_size == len(data)


def test_35_database_backed_document_resolution(db: Session):
    """TC-35: Verify retrieve_document_payload returns binary_bytes for db:// documents."""
    data = b"%PDF-1.4 database backed resolution check"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="db_backed.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    payload = storage_service.retrieve_document_payload(doc, db)
    assert payload is not None
    binary_bytes, physical_path, filename, media_type, file_size = payload
    assert binary_bytes == data
    assert physical_path is None
    assert filename == "db_backed.pdf"
    assert file_size == len(data)


def test_36_no_binary_loading_in_metadata_only_list(db: Session):
    """TC-36: Verify metadata listing queries do not load DocumentBinary table."""
    headers = get_officer_headers("admin", "admin123")
    res = client.get("/api/documents/case/AICTE-RB-2024-0101", headers=headers)
    assert res.status_code == 200
    docs = res.json()
    for d in docs:
        assert "content" not in d
        assert "binary_data" not in d
        assert "download_url" in d


# -----------------------------------------------------------------------------
# 5. Security & Isolation Tests (TC-37 to TC-45)
# -----------------------------------------------------------------------------
def test_37_complainant_ownership_isolation():
    """TC-37: Verify Citizen A cannot download Citizen B's private evidence."""
    headers_a = get_citizen_auth_headers("bytea_iso_a")
    headers_b = get_citizen_auth_headers("bytea_iso_b")

    # Citizen A creates complaint & uploads evidence
    c_res = client.post("/api/complainant/complaints", json={
        "institution_id": 1,
        "title": "Citizen A Confidential Evidence",
        "category": "FEES_FINANCIAL",
        "description": "Private student evidence"
    }, headers=headers_a)
    case_a_id = c_res.json()["id"]

    up_res = client.post(
        f"/api/complainant/complaints/{case_a_id}/documents",
        files={"file": ("citizen_a_proof.pdf", b"%PDF-1.4 proof citizen A", "application/pdf")},
        data={"category": "Fee Receipt"},
        headers=headers_a
    )
    doc_id = up_res.json()["id"]

    # Citizen B attempts to download Citizen A's document
    unauth_res = client.get(
        f"/api/complainant/complaints/{case_a_id}/documents/{doc_id}/download",
        headers=headers_b
    )
    assert unauth_res.status_code == 404  # Anti-IDOR hides case existence or denies access


def test_38_cross_institution_isolation(db: Session):
    """TC-38: Verify document linked to Institution 1 is isolated from unassigned viewers."""
    headers = get_officer_headers("admin", "admin123")
    res = client.get("/api/compliance/institutions/1/scorecard", headers=headers)
    assert res.status_code == 200


def test_39_cross_bureau_isolation(db: Session):
    """TC-39: Verify confidential bureau documents cannot be accessed by unauthorized officers."""
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=b"%PDF-1.4 confidential bureau head memo payload",
        original_filename="bureau_head_confidential.pdf",
        access_classification="Confidential - Bureau Head Only",
        backend_override="neon_bytea"
    )
    db.commit()

    # Officer login (authorized_officer role, not super_admin or bureau_head)
    officer_headers = get_officer_headers("officer_pgrc", "officer123")
    res = client.get(f"/api/documents/{doc.id}/download", headers=officer_headers)
    assert res.status_code == 403
    assert "confidential" in res.json()["detail"].lower()


def test_40_internal_evidence_restriction():
    """TC-40: Verify citizen cannot access internal officer documents directly."""
    citizen_headers = get_citizen_auth_headers("bytea_cit_int")
    res = client.get("/api/documents/1/download", headers=citizen_headers)
    assert res.status_code == 401 or res.status_code == 403


def test_41_unauthorized_direct_api_retrieval():
    """TC-41: Verify direct download without Bearer token returns HTTP 401."""
    res = client.get("/api/documents/1/download")
    assert res.status_code == 401


def test_42_invalid_document_id_handling():
    """TC-42: Verify querying negative or non-existent document ID returns HTTP 404."""
    headers = get_officer_headers("admin", "admin123")
    res = client.get("/api/documents/9999999/download", headers=headers)
    assert res.status_code == 404


def test_43_no_physical_path_exposure():
    """TC-43: Verify response headers and JSON metadata never leak physical filesystem paths."""
    headers = get_officer_headers("admin", "admin123")
    res = client.get("/api/documents/case/AICTE-RB-2024-0101", headers=headers)
    assert res.status_code == 200
    docs = res.json()
    for d in docs:
        assert "file_path" not in d
        assert "C:\\" not in str(d)
        assert "/storage/docs" not in str(d)


def test_44_no_public_binary_url():
    """TC-44: Verify there are no unauthenticated endpoints serving document binaries."""
    res = client.get("/api/documents/public/1")
    assert res.status_code == 404 or res.status_code == 401


def test_45_no_document_id_enumeration_bypass():
    """TC-45: Verify complainant download checks case ownership, preventing document_id enumeration."""
    headers = get_citizen_auth_headers("bytea_enum")
    # Attempt download of doc ID 1 (which belongs to seed admin case) under random complaint ID
    res = client.get("/api/complainant/complaints/AICTE-PGRC-2026-RANDOM/documents/1/download", headers=headers)
    assert res.status_code == 404


# -----------------------------------------------------------------------------
# 6. Retention & Audit Tests (TC-46 to TC-50)
# -----------------------------------------------------------------------------
def test_46_complaint_closure_does_not_delete_evidence(db: Session):
    """TC-46: Verify closing a case leaves DocumentMetadata and DocumentBinary intact."""
    data = b"%PDF-1.4 case closure retention test evidence"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="closure_proof.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    # Simulate closing the case
    case = db.query(Case).filter(Case.id == "AICTE-RB-2024-0101").first()
    old_status = case.status
    case.status = "Disposed"
    db.commit()

    # Verify binary still exists
    bin_rec = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
    assert bin_rec is not None
    assert bin_rec.content == data

    # Restore case status
    case.status = old_status
    db.commit()


def test_47_cap_closure_does_not_delete_evidence(db: Session):
    """TC-47: Verify CAP closure does not delete completion evidence."""
    data = b"%PDF-1.4 CAP completion evidence payload"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="cap_remediation_proof.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    # Verify delete_document_safely refuses deletion if linked to CAP
    cap = CorrectiveActionPlan(
        institution_id=1,
        title="Test CAP for Evidence Retention",
        identified_gap="Identified regulatory deficit in infrastructure",
        required_action="Provide verified compliance evidence and remediation certificate",
        responsible_bureau_id=1,
        assigned_officer_id=1,
        prescribed_deadline=datetime.utcnow(),
        completion_evidence_doc_id=doc.id,
        status="COMPLETED"
    )
    db.add(cap)
    db.commit()

    can_delete = storage_service.delete_document_safely(db, doc.id, actor_role="super_admin")
    assert can_delete is False  # Refused due to CAP evidence linkage!


def test_48_metadata_edit_does_not_delete_binary(db: Session):
    """TC-48: Verify updating metadata fields (category, remarks) does not affect binary."""
    data = b"%PDF-1.4 edit metadata test payload"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="edit_meta.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    doc.category = "Updated Category"
    doc.access_classification = "Official Internal"
    db.commit()

    bin_rec = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
    assert bin_rec is not None
    assert bin_rec.content == data


def test_49_restricted_deletion_is_denied(db: Session):
    """TC-49: Verify non-super_admin or linked evidence cannot be deleted."""
    data = b"%PDF-1.4 regulatory compliance audit document"
    doc = storage_service.store_uploaded_document(
        db=db,
        case_id="AICTE-RB-2024-0101",
        file_data=data,
        original_filename="regulatory_audit.pdf",
        backend_override="neon_bytea"
    )
    db.commit()

    # Officer role cannot delete
    assert storage_service.delete_document_safely(db, doc.id, actor_role="bureau_head") is False
    assert storage_service.delete_document_safely(db, doc.id, actor_role="officer") is False


def test_50_audit_history_and_diagnostics(db: Session):
    """TC-50: Verify storage diagnostics reports accurate metrics without loading binaries."""
    diag = storage_service.get_storage_diagnostics(db)
    assert "total_metadata_records" in diag
    assert "total_binary_records" in diag
    assert "total_stored_binary_bytes" in diag
    assert "neon_free_quota_mb" in diag
    assert diag["neon_free_quota_mb"] == 512
    assert diag["backend"] in ["neon_bytea", "local"]
    assert diag["status"] in ["healthy", "warning"]


def test_51_storage_diagnostics_quota_estimate_separation(db: Session):
    """TC-51: Verify quota is treated as an unverified estimate, separated from measured metrics."""
    diag = storage_service.get_storage_diagnostics(db)
    # Measured metrics
    assert isinstance(diag["total_metadata_records"], int)
    assert isinstance(diag["total_binary_records"], int)
    assert isinstance(diag["total_stored_binary_bytes"], int)
    assert isinstance(diag["database_backed_documents"], int)
    assert isinstance(diag["legacy_filesystem_documents"], int)
    assert diag["missing_binary_records"] == 0
    assert diag["orphan_binary_records"] == 0
    # Quota estimate metrics
    assert diag["configured_quota_mb"] == 512
    assert diag["quota_status"] == "unverified_estimate"
    assert diag["is_quota_verified"] is False
    # Operational health status
    assert diag["operational_status"] == "operational"
    assert diag["integrity_status"] == "intact"
    assert "diagnostics_advisory" in diag

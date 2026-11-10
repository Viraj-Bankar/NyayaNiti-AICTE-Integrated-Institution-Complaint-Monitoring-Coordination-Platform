import os
import io
import uuid
import tempfile
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.models import (
    Case, DocumentMetadata, User, Complainant, Institution,
    Bureau, ComplianceAssessment, CorrectiveActionPlan
)
from app.services import storage_service

client = TestClient(app)


# -----------------------------------------------------------------------------
# Fixtures and Helpers
# -----------------------------------------------------------------------------
@pytest.fixture
def temp_storage():
    """Isolated temporary storage root for test execution."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


def get_officer_headers(username: str = "admin", password: str = "admin123") -> dict:
    login_res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login_res.status_code == 200, f"Officer login failed for {username}: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def get_citizen_auth_headers(prefix: str = "storage_cit") -> dict:
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


# -----------------------------------------------------------------------------
# 1. Storage Configuration Tests (Items 1 - 6)
# -----------------------------------------------------------------------------
def test_1_default_local_configuration():
    """Verify default local storage configuration settings."""
    assert settings.DOCUMENT_STORAGE_BACKEND in ["local", "neon_bytea"]
    assert settings.DOCUMENT_STORAGE_ROOT in ["./storage/docs", "/storage/docs"]
    assert settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB in [3, 15]
    assert ".pdf" in settings.DOCUMENT_STORAGE_ALLOWED_EXTENSIONS


def test_2_custom_storage_root(temp_storage):
    """Verify resolution of custom storage root directory."""
    resolved = storage_service.get_storage_root(root_override=temp_storage)
    assert resolved == os.path.abspath(temp_storage)


def test_3_directory_creation(temp_storage):
    """Verify auto-creation of missing storage directory."""
    new_dir = os.path.join(temp_storage, "nested", "evidence_vault")
    assert not os.path.exists(new_dir)
    res = storage_service.validate_storage(root_override=new_dir)
    assert res["status"] == "ready"
    assert os.path.isdir(new_dir)


def test_4_directory_validation(temp_storage):
    """Verify storage validation returns ready status and writable flag."""
    res = storage_service.validate_storage(root_override=temp_storage)
    assert res["status"] == "ready"
    assert res["writable"] is True
    assert res["path"] == os.path.abspath(temp_storage)


def test_5_unwritable_directory_handling(temp_storage):
    """Verify error status when storage path is an existing file, not directory."""
    file_path = os.path.join(temp_storage, "not_a_dir.txt")
    with open(file_path, "w") as f:
        f.write("blocking file")

    res = storage_service.validate_storage(root_override=file_path)
    assert res["status"] == "error"
    assert res["writable"] is False
    assert "not a directory" in res["error"]


def test_6_missing_storage_directory_behavior(temp_storage):
    """Verify missing storage directory initializes cleanly without exceptions."""
    missing_dir = os.path.join(temp_storage, "auto_init_docs")
    res = storage_service.validate_storage(root_override=missing_dir)
    assert res["status"] == "ready"
    assert os.path.exists(missing_dir)


# -----------------------------------------------------------------------------
# 2. File Operations Tests (Items 7 - 16)
# -----------------------------------------------------------------------------
def test_7_save_valid_file(temp_storage):
    """Verify saving a valid file stores binary on disk and returns relative ref."""
    pdf_content = b"%PDF-1.4 statutory regulatory test bytes"
    storage_ref, stored_name, size = storage_service.save_file(
        file_data=pdf_content,
        original_filename="audit_proof.pdf",
        category="complaints",
        subfolder="AICTE-TEST-001",
        root_override=temp_storage
    )
    assert "complaints/AICTE-TEST-001/" in storage_ref
    assert stored_name.startswith("doc_")
    assert stored_name.endswith(".pdf")
    assert size == len(pdf_content)

    # Verify physical file on disk
    physical = storage_service.get_file(storage_ref, root_override=temp_storage)
    assert physical is not None
    assert os.path.isfile(physical)
    with open(physical, "rb") as f:
        assert f.read() == pdf_content


def test_8_retrieve_saved_file(temp_storage):
    """Verify get_file retrieves existing file using storage reference."""
    data = b"%PDF-1.4 content retrieval test"
    ref, _, _ = storage_service.save_file(
        file_data=data,
        original_filename="receipt.pdf",
        root_override=temp_storage
    )
    retrieved_path = storage_service.get_file(ref, root_override=temp_storage)
    assert retrieved_path is not None
    assert os.path.exists(retrieved_path)


def test_9_check_file_existence(temp_storage):
    """Verify file_exists returns True for existing file, False for missing."""
    data = b"%PDF-1.4 existence probe"
    ref, _, _ = storage_service.save_file(
        file_data=data,
        original_filename="exist.pdf",
        root_override=temp_storage
    )
    assert storage_service.file_exists(ref, root_override=temp_storage) is True
    assert storage_service.file_exists("complaints/missing_9999.pdf", root_override=temp_storage) is False


def test_10_retrieve_file_size(temp_storage):
    """Verify get_file_size returns accurate byte length."""
    data = b"%PDF-1.4 exactly thirty-two bytes!!!"
    ref, _, _ = storage_service.save_file(
        file_data=data,
        original_filename="size_test.pdf",
        root_override=temp_storage
    )
    assert storage_service.get_file_size(ref, root_override=temp_storage) == len(data)
    assert storage_service.get_file_size("non_existent.pdf", root_override=temp_storage) is None


def test_11_delete_file_permitted(temp_storage):
    """Verify delete_file safely removes file and returns True."""
    data = b"%PDF-1.4 disposable test content"
    ref, _, _ = storage_service.save_file(
        file_data=data,
        original_filename="delete_me.pdf",
        root_override=temp_storage
    )
    assert storage_service.file_exists(ref, root_override=temp_storage) is True
    deleted = storage_service.delete_file(ref, root_override=temp_storage)
    assert deleted is True
    assert storage_service.file_exists(ref, root_override=temp_storage) is False


def test_12_handle_missing_files(temp_storage):
    """Verify missing file handling returns None/False without crash."""
    assert storage_service.get_file("phantom_dir/ghost.pdf", root_override=temp_storage) is None
    assert storage_service.delete_file("phantom_dir/ghost.pdf", root_override=temp_storage) is False


def test_13_prevent_duplicate_overwrites(temp_storage):
    """Verify multiple uploads of identical original names generate distinct unique files."""
    data = b"%PDF-1.4 identical original name test"
    ref1, name1, _ = storage_service.save_file(data, "statement.pdf", root_override=temp_storage)
    ref2, name2, _ = storage_service.save_file(data, "statement.pdf", root_override=temp_storage)
    assert ref1 != ref2
    assert name1 != name2
    assert storage_service.file_exists(ref1, root_override=temp_storage)
    assert storage_service.file_exists(ref2, root_override=temp_storage)


def test_14_prevent_path_traversal(temp_storage):
    """Verify path traversal tokens in subfolder or filename are neutralized."""
    data = b"%PDF-1.4 traversal test bytes"
    ref, _, _ = storage_service.save_file(
        file_data=data,
        original_filename="../../malicious.pdf",
        category="../../etc",
        subfolder="../passwd",
        root_override=temp_storage
    )
    # Target path must remain strictly inside temp_storage
    resolved = storage_service.get_file(ref, root_override=temp_storage)
    assert resolved is not None
    assert resolved.startswith(os.path.abspath(temp_storage))
    assert ".." not in ref


def test_15_prevent_absolute_path_injection(temp_storage):
    """Verify absolute path references in get_file are rejected if outside root."""
    assert storage_service.get_file("/etc/passwd", root_override=temp_storage) is None
    assert storage_service.get_file("C:\\Windows\\System32\\cmd.exe", root_override=temp_storage) is None


def test_16_prevent_directory_escape(temp_storage):
    """Verify attempts to pass relative traversal in get_file return None."""
    assert storage_service.get_file("../outside.pdf", root_override=temp_storage) is None
    assert storage_service.get_file("complaints/../../escaped.pdf", root_override=temp_storage) is None


# -----------------------------------------------------------------------------
# 3. Upload Validation Tests (Items 17 - 24)
# -----------------------------------------------------------------------------
def test_17_valid_extensions():
    """Verify validation succeeds for all allowed file formats."""
    import zipfile
    # PDF
    _, ext, _ = storage_service.validate_file_upload(b"%PDF-1.4 sample", "doc.pdf")
    assert ext == "pdf"
    # PNG
    _, ext, _ = storage_service.validate_file_upload(b"\x89PNG\r\n\x1a\n sample", "photo.png")
    assert ext == "png"
    # JPG
    _, ext, _ = storage_service.validate_file_upload(b"\xff\xd8\xff sample", "pic.jpg")
    assert ext == "jpg"
    # DOCX (authentic OOXML ZIP package)
    docx_buf = io.BytesIO()
    with zipfile.ZipFile(docx_buf, "w") as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="..."/>')
        zf.writestr("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="..."/>')
    valid_docx = docx_buf.getvalue()
    _, ext, _ = storage_service.validate_file_upload(valid_docx, "memo.docx")
    assert ext == "docx"


def test_18_invalid_extension():
    """Verify disallowed extensions raise ValueError."""
    with pytest.raises(ValueError, match="Unsupported file format"):
        storage_service.validate_file_upload(b"test script", "run.sh")
    with pytest.raises(ValueError, match="Unsupported file format"):
        storage_service.validate_file_upload(b"malware binary", "virus.exe")


def test_19_invalid_mime_type():
    """Verify mismatched content_type raises ValueError."""
    with pytest.raises(ValueError, match="Disallowed MIME type"):
        storage_service.validate_file_upload(
            b"%PDF-1.4 content",
            "test.pdf",
            content_type="text/html"
        )


def test_20_empty_file_rejected():
    """Verify empty 0-byte file raises ValueError."""
    with pytest.raises(ValueError, match="Uploaded file is empty"):
        storage_service.validate_file_upload(b"", "empty.pdf")


def test_21_file_exceeding_max_size():
    """Verify files larger than max size are rejected."""
    max_bytes = settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024
    large_data = b"%PDF" + b"X" * (max_bytes + 10)
    with pytest.raises(ValueError, match="exceeds maximum permitted limit"):
        storage_service.validate_file_upload(large_data, "huge.pdf")


def test_22_mismatched_file_signature():
    """Verify file disguised as PDF with wrong magic bytes is rejected."""
    fake_pdf = b"MZ\x90\x00\x03This is a Windows PE executable"
    with pytest.raises(ValueError, match="File content does not match the stated file extension"):
        storage_service.validate_file_upload(fake_pdf, "disguised.pdf")


def test_23_malicious_filename():
    """Verify malicious filenames are sanitized into safe base names."""
    clean_name, ext, _ = storage_service.validate_file_upload(
        b"%PDF-1.4 valid",
        "../../../etc/shadow.pdf"
    )
    assert "/" not in clean_name
    assert "\\" not in clean_name
    assert "shadow.pdf" in clean_name
    assert ext == "pdf"


def test_24_duplicate_original_filenames(temp_storage):
    """Verify multiple files uploaded with identical original names persist safely."""
    data = b"%PDF-1.4 same name different time"
    ref_a, _, _ = storage_service.save_file(data, "evidence.pdf", root_override=temp_storage)
    ref_b, _, _ = storage_service.save_file(data, "evidence.pdf", root_override=temp_storage)
    assert ref_a != ref_b
    assert storage_service.file_exists(ref_a, root_override=temp_storage)
    assert storage_service.file_exists(ref_b, root_override=temp_storage)


# -----------------------------------------------------------------------------
# 4. Database Integration Tests (Items 25 - 28)
# -----------------------------------------------------------------------------
def test_25_save_file_and_create_metadata(temp_storage):
    """Verify DocumentMetadata record links correctly to internal storage reference."""
    db = SessionLocal()
    case = db.query(Case).first()
    assert case is not None

    data = b"%PDF-1.4 database linking verification"
    ref, safe_name, size = storage_service.save_file(
        file_data=data,
        original_filename="affidavit.pdf",
        category="complaints",
        subfolder=case.id,
        root_override=temp_storage
    )

    doc = DocumentMetadata(
        case_id=case.id,
        file_name=safe_name,
        original_filename="affidavit.pdf",
        file_size=size,
        file_type="pdf",
        category="Affidavit",
        access_classification="Public",
        file_path=ref,
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    doc_id = doc.id

    # Verify query and path resolution
    queried = db.query(DocumentMetadata).filter(DocumentMetadata.id == doc_id).first()
    assert queried is not None
    assert queried.file_path == ref
    resolved_path = storage_service.resolve_document_file_path(queried, root_override=temp_storage)
    assert resolved_path is not None
    assert os.path.isfile(resolved_path)
    db.close()


def test_26_db_commit_failure_safe_file_cleanup(temp_storage):
    """Verify rollback removes newly written file to prevent orphaned files."""
    data = b"%PDF-1.4 rollback cleanup test"
    ref, _, _ = storage_service.save_file(
        file_data=data,
        original_filename="orphaned_candidate.pdf",
        root_override=temp_storage
    )
    assert storage_service.file_exists(ref, root_override=temp_storage) is True

    # Simulate database transaction failure
    db = SessionLocal()
    try:
        # Invalid case_id to trigger integrity error
        doc = DocumentMetadata(
            case_id="NON_EXISTENT_CASE_FOR_ROLLBACK_9999",
            file_name="fake.pdf",
            file_size=len(data),
            file_type="pdf",
            category="Notice",
            access_classification="Public",
            file_path=ref
        )
        db.add(doc)
        db.commit()
    except Exception:
        db.rollback()
        # Storage cleanup hook
        storage_service.delete_file(ref, root_override=temp_storage)
    finally:
        db.close()

    # File should have been cleaned up
    assert storage_service.file_exists(ref, root_override=temp_storage) is False


def test_27_missing_physical_file_handled_gracefully():
    """Verify downloading a document whose physical file is missing returns 404."""
    db = SessionLocal()
    case = db.query(Case).first()
    headers = get_officer_headers("admin", "admin123")

    doc = DocumentMetadata(
        case_id=case.id,
        file_name="missing_ghost_file.pdf",
        original_filename="missing_ghost_file.pdf",
        file_size=1024,
        file_type="pdf",
        category="Official Notice",
        access_classification="Official Internal",
        file_path="complaints/non_existent_folder/missing_ghost_file.pdf",
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    doc_id = doc.id
    db.close()

    res = client.get(
        f"/api/documents/{doc_id}/download",
        headers=headers
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_28_existing_metadata_references_remain_resolvable():
    """Verify backward compatibility for existing records stored with legacy absolute or relative paths."""
    db = SessionLocal()
    case = db.query(Case).first()

    # Create dummy file in storage root
    root = storage_service.get_storage_root()
    legacy_file = os.path.join(root, "legacy_backward_compat.pdf")
    with open(legacy_file, "wb") as f:
        f.write(b"%PDF-1.4 legacy document binary content")

    # Document pointing via relative path
    doc = DocumentMetadata(
        case_id=case.id,
        file_name="legacy_backward_compat.pdf",
        file_size=len(b"%PDF-1.4 legacy document binary content"),
        file_type="pdf",
        category="Official Notice",
        access_classification="Official Internal",
        file_path="legacy_backward_compat.pdf"
    )
    resolved = storage_service.resolve_document_file_path(doc)
    assert resolved is not None
    assert os.path.exists(resolved)

    # Clean up
    if os.path.exists(legacy_file):
        os.remove(legacy_file)
    db.close()


# -----------------------------------------------------------------------------
# 5. Authorization & Access Control Tests (Items 29 - 34)
# -----------------------------------------------------------------------------
def test_29_authorized_complainant_retrieves_own_attachment():
    """Verify authorized citizen can download their own uploaded complaint attachment."""
    headers_a = get_citizen_auth_headers("owner_a")

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Citizen A files complaint
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst.id,
        "title": "Legitimate Fee Dispute",
        "category": "Fees and Financial Issues",
        "description": "Tuition fee refund withheld illegally."
    }, headers=headers_a)
    assert case_res.status_code == 201
    cid = case_res.json()["id"]

    # Citizen A uploads PDF evidence
    pdf_bytes = b"%PDF-1.4 citizen personal tuition bank receipt"
    up_res = client.post(
        f"/api/complainant/complaints/{cid}/documents",
        files={"file": ("receipt.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"category": "Bank Receipt"},
        headers=headers_a
    )
    assert up_res.status_code == 201
    doc_id = up_res.json()["id"]

    # Citizen A downloads own document
    dl_res = client.get(f"/api/complainant/complaints/{cid}/documents/{doc_id}/download", headers=headers_a)
    assert dl_res.status_code == 200
    assert dl_res.content == pdf_bytes
    assert dl_res.headers.get("x-content-type-options") == "nosniff"


def test_30_other_complainant_cannot_retrieve_anti_idor():
    """Verify Citizen B is blocked from downloading Citizen A's document (Anti-IDOR)."""
    headers_a = get_citizen_auth_headers("owner_victim")
    headers_b = get_citizen_auth_headers("intruder_b")

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    # Citizen A files complaint and uploads
    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst.id,
        "title": "Private Medical Certificate Case",
        "category": "Student Welfare",
        "description": "Medical leave request documentation."
    }, headers=headers_a)
    cid = case_res.json()["id"]

    up_res = client.post(
        f"/api/complainant/complaints/{cid}/documents",
        files={"file": ("medical.pdf", io.BytesIO(b"%PDF-1.4 confidential medical history"), "application/pdf")},
        headers=headers_a
    )
    doc_id = up_res.json()["id"]

    # Citizen B attempts to download Citizen A's document -> must be 404 (or 403)
    blocked_res = client.get(f"/api/complainant/complaints/{cid}/documents/{doc_id}/download", headers=headers_b)
    assert blocked_res.status_code in [403, 404]


def test_31_unauthorized_institution_isolation():
    """Verify document download enforces case and complainant relationship isolation."""
    headers_a = get_citizen_auth_headers("inst_iso_a")
    headers_b = get_citizen_auth_headers("inst_iso_b")

    db = SessionLocal()
    inst = db.query(Institution).first()
    db.close()

    case_res = client.post("/api/complainant/complaints", json={
        "institution_id": inst.id,
        "title": "Cadre Strength Audit Evidence",
        "category": "Faculty and Staff Related Issues",
        "description": "Faculty register inspection request."
    }, headers=headers_a)
    cid = case_res.json()["id"]

    up_res = client.post(
        f"/api/complainant/complaints/{cid}/documents",
        files={"file": ("cadre.pdf", io.BytesIO(b"%PDF-1.4 cadre register"), "application/pdf")},
        headers=headers_a
    )
    doc_id = up_res.json()["id"]

    # Querying documents list by Citizen B
    list_res = client.get(f"/api/complainant/complaints/{cid}/documents", headers=headers_b)
    assert list_res.status_code in [403, 404]


def test_32_unauthorized_officer_cannot_retrieve_restricted_evidence():
    """Verify regular officer is forbidden from downloading 'Confidential - Bureau Head Only' document."""
    admin_headers = get_officer_headers("admin", "admin123")
    officer_headers = get_officer_headers("officer_rb", "officer123")

    db = SessionLocal()
    case = db.query(Case).first()

    # Save physical file
    data = b"%PDF-1.4 classified inspection order"
    ref, safe_name, size = storage_service.save_file(
        file_data=data,
        original_filename="classified_notice.pdf",
        category="cases",
        subfolder=case.id
    )

    doc = DocumentMetadata(
        case_id=case.id,
        file_name=safe_name,
        original_filename="classified_notice.pdf",
        file_size=size,
        file_type="pdf",
        category="Official Notice",
        access_classification="Confidential - Bureau Head Only",
        file_path=ref,
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    doc_id = doc.id
    db.close()

    # Standard officer receives 403 Forbidden
    forbidden_res = client.get(
        f"/api/documents/{doc_id}/download",
        headers=officer_headers
    )
    assert forbidden_res.status_code == 403
    assert "confidential" in forbidden_res.json()["detail"].lower()

    # Super Admin succeeds with 200 OK
    allowed_res = client.get(
        f"/api/documents/{doc_id}/download",
        headers=admin_headers
    )
    assert allowed_res.status_code == 200
    assert allowed_res.content == data


def test_33_complainants_cannot_retrieve_internal_only_evidence():
    """Verify complainants cannot access internal officer documents endpoint."""
    citizen_headers = get_citizen_auth_headers("internal_probe")

    db = SessionLocal()
    case = db.query(Case).first()
    db.close()

    data = b"%PDF-1.4 internal regulatory council deliberations"
    ref, safe_name, size = storage_service.save_file(
        file_data=data,
        original_filename="internal_deliberation.pdf",
        category="cases",
        subfolder=case.id
    )

    db = SessionLocal()
    doc = DocumentMetadata(
        case_id=case.id,
        file_name=safe_name,
        original_filename="internal_deliberation.pdf",
        file_size=size,
        file_type="pdf",
        category="Official Notice",
        access_classification="Official Internal",
        file_path=ref,
        uploader_role="officer"
    )
    db.add(doc)
    db.commit()
    doc_id = doc.id
    db.close()

    # Complainant accessing officer endpoint /api/documents/{doc_id}/download -> 401 or 403
    cit_res = client.get(
        f"/api/documents/{doc_id}/download",
        headers=citizen_headers
    )
    assert cit_res.status_code in [401, 403]


def test_34_unauthorized_direct_api_requests():
    """Verify unauthenticated direct requests to download endpoints are rejected."""
    # Unauthenticated officer document download
    res1 = client.get("/api/documents/1/download")
    assert res1.status_code in [401, 403]

    # Unauthenticated citizen complaint download
    res2 = client.get("/api/complainant/complaints/AICTE-TEST-9999/documents/1/download")
    assert res2.status_code in [401, 403]

    # Unauthenticated officer complaints download
    res3 = client.get("/api/officer/complaints/AICTE-TEST-9999/documents/1/download")
    assert res3.status_code in [401, 403]


# -----------------------------------------------------------------------------
# 6. Independent Security Review & Production Hardening Tests (Items 35 - 48)
# -----------------------------------------------------------------------------
def test_35_backend_configuration_validation():
    """Verify supported DOCUMENT_STORAGE_BACKEND values and rejection of unsupported backends."""
    assert storage_service.validate_storage_backend("local") == "local"
    assert storage_service.validate_storage_backend("render_disk") == "render_disk"
    assert storage_service.validate_storage_backend("filesystem") == "filesystem"

    with pytest.raises(ValueError, match="Unsupported DOCUMENT_STORAGE_BACKEND"):
        storage_service.validate_storage_backend("s3")

    with pytest.raises(ValueError, match="Unsupported DOCUMENT_STORAGE_BACKEND"):
        storage_service.validate_storage_backend("gcs")


def test_36_path_traversal_url_encoded():
    """Verify encoded directory traversal attempts (%2e%2e%2f, %252e%252e) are completely rejected."""
    assert storage_service.get_file("%2e%2e%2fetc%2fpasswd") is None
    assert storage_service.get_file("%2e%2e/cases/secret.pdf") is None
    assert storage_service.get_file("%252e%252e%252fetc%252fshadow") is None
    assert storage_service.get_file("cases/..%2f..%2fsecret.txt") is None


def test_37_absolute_path_escape_blocked(temp_storage):
    """Verify arbitrary operating-system files outside authorized roots are never returned."""
    # Create a dummy external file outside the storage root
    outside_dir = tempfile.mkdtemp()
    outside_file = os.path.join(outside_dir, "system_secret.txt")
    with open(outside_file, "w") as f:
        f.write("super_secret_system_data")

    # Document record attempting to read this outside file
    doc = DocumentMetadata(
        file_path=outside_file,
        file_name="system_secret.txt",
        case_id="AICTE-SEC-9999"
    )

    resolved = storage_service.resolve_document_file_path(doc, root_override=temp_storage)
    assert resolved is None, "Security violation: Arbitrary absolute path outside authorized roots was resolved!"

    # Clean up outside file
    try:
        os.remove(outside_file)
        os.rmdir(outside_dir)
    except Exception:
        pass


def test_38_windows_drive_and_unc_escape_blocked():
    """Verify Windows drive letters and UNC paths cannot escape storage root."""
    assert storage_service.get_file("C:\\Windows\\System32\\cmd.exe") is None
    assert storage_service.get_file("D:\\confidential\\database.sqlite") is None
    assert storage_service.get_file("\\\\remote-share\\volume\\exploit.pdf") is None
    assert storage_service.get_file("//remote-share/volume/exploit.pdf") is None


def test_39_symlink_directory_escape_blocked(temp_storage):
    """Verify symlink escape attempts pointing outside storage boundaries are rejected."""
    outside_dir = tempfile.mkdtemp()
    outside_target = os.path.join(outside_dir, "outside_target.pdf")
    with open(outside_target, "wb") as f:
        f.write(b"%PDF-1.4 target outside storage")

    symlink_path = os.path.join(temp_storage, "escaped_link.pdf")
    try:
        os.symlink(outside_target, symlink_path)
        # Test get_file rejects symlink pointing outside storage root
        resolved = storage_service.get_file("escaped_link.pdf", root_override=temp_storage)
        assert resolved is None, "Security violation: Symlink pointing outside storage root was allowed!"
    except (OSError, NotImplementedError):
        # On Windows without developer mode/admin rights, symlink creation may raise OSError
        pytest.skip("Symlink creation not permitted by current OS user permissions.")
    finally:
        if os.path.islink(symlink_path) or os.path.exists(symlink_path):
            os.remove(symlink_path)
        try:
            os.remove(outside_target)
            os.rmdir(outside_dir)
        except Exception:
            pass


def test_40_malicious_legacy_url_blocked():
    """Verify unexpected URL schemes and virtual API routes are never treated as filesystem paths."""
    doc_remote = DocumentMetadata(
        file_path="http://evil-server.com/malware.exe",
        file_name="malware.exe",
        case_id="AICTE-TEST-0001"
    )
    assert storage_service.resolve_document_file_path(doc_remote) is None

    doc_file_url = DocumentMetadata(
        file_path="file:///etc/passwd",
        file_name="passwd",
        case_id="AICTE-TEST-0001"
    )
    assert storage_service.resolve_document_file_path(doc_file_url) is None

    doc_virtual = DocumentMetadata(
        file_path="/api/complainant/complaints/1/documents/2/download",
        file_name="nonexistent.pdf",
        case_id="AICTE-TEST-0001"
    )
    assert storage_service.resolve_document_file_path(doc_virtual) is None


def test_41_null_byte_injection_blocked(temp_storage):
    """Verify null bytes in filenames or paths are rejected or stripped safely."""
    assert storage_service.get_file("document.pdf\x00.exe", root_override=temp_storage) is None

    # Saving with a filename containing null byte must sanitize it
    ref, safe_name, size = storage_service.save_file(
        file_data=b"%PDF-1.4 null byte test",
        original_filename="legit\x00_name.pdf",
        root_override=temp_storage
    )
    assert "\x00" not in safe_name
    assert "\x00" not in ref
    assert storage_service.file_exists(ref, root_override=temp_storage)


def test_42_docx_zip_structure_validation():
    """Verify deep OOXML ZIP validation for DOCX files."""
    import zipfile

    # 1. Authentic minimal DOCX (valid ZIP with [Content_Types].xml and word/document.xml)
    docx_buf = io.BytesIO()
    with zipfile.ZipFile(docx_buf, "w") as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="..."/>')
        zf.writestr("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="..."/>')
    valid_docx_bytes = docx_buf.getvalue()

    clean_name, ext, size = storage_service.validate_file_upload(
        file_data=valid_docx_bytes,
        original_filename="official_directive.docx",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert ext == "docx"
    assert size == len(valid_docx_bytes)

    # 2. Fake DOCX: ZIP archive without OOXML parts (e.g. arbitrary zip containing text files)
    fake_buf = io.BytesIO()
    with zipfile.ZipFile(fake_buf, "w") as zf:
        zf.writestr("secrets.txt", "not a word document")
    fake_docx_bytes = fake_buf.getvalue()

    with pytest.raises(ValueError, match="not a valid Microsoft Word OpenXML document"):
        storage_service.validate_file_upload(
            file_data=fake_docx_bytes,
            original_filename="fake_directive.docx"
        )

    # 3. Corrupt DOCX: Plain text with PK\x03\x04 prefix but not a valid zip
    corrupt_docx = b"PK\x03\x04not_a_real_zip_file"
    with pytest.raises(ValueError, match="not a valid Microsoft Word OpenXML document"):
        storage_service.validate_file_upload(
            file_data=corrupt_docx,
            original_filename="corrupted.docx"
        )


@pytest.mark.anyio
async def test_43_streaming_file_size_enforcement():
    """Verify real-time stream size enforcement terminates immediately when exceeding limit."""
    class MockStreamingUpload:
        def __init__(self, total_bytes: int, chunk_size: int = 65536):
            self.remaining = total_bytes
            self.chunk_size = chunk_size

        async def read(self, size: int = -1):
            if self.remaining <= 0:
                return b""
            to_read = min(self.remaining, self.chunk_size)
            self.remaining -= to_read
            return b"A" * to_read

    max_allowed = settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024

    # 1. Under limit stream: 100 KB
    ok_stream = MockStreamingUpload(100 * 1024)
    data = await storage_service.read_upload_stream(ok_stream)
    assert len(data) == 100 * 1024

    # 2. Over limit stream: Max + 1 byte
    oversized_stream = MockStreamingUpload(max_allowed + 1024)
    with pytest.raises(ValueError, match="File size exceeds maximum permitted limit"):
        await storage_service.read_upload_stream(oversized_stream)

    # 3. Empty stream
    empty_stream = MockStreamingUpload(0)
    with pytest.raises(ValueError, match="Uploaded file is empty"):
        await storage_service.read_upload_stream(empty_stream)


def test_44_concurrent_filename_collision_defense(temp_storage):
    """Verify concurrent uploads with identical filenames receive unique paths and never collide."""
    refs = []
    names = []
    for _ in range(5):
        ref, safe_name, size = storage_service.save_file(
            file_data=b"%PDF-1.4 concurrent document payload",
            original_filename="student_complaint_evidence.pdf",
            category="cases",
            subfolder="AICTE-CONCURRENT-001",
            root_override=temp_storage
        )
        refs.append(ref)
        names.append(safe_name)

    # All references and filenames must be unique
    assert len(set(refs)) == 5
    assert len(set(names)) == 5
    # All 5 files must physically exist on disk
    for r in refs:
        assert storage_service.file_exists(r, root_override=temp_storage)


def test_45_database_rollback_orphan_cleanup(temp_storage):
    """Verify safe cleanup of newly created disk file when database persistence fails."""
    ref, safe_name, size = storage_service.save_file(
        file_data=b"%PDF-1.4 rollback test binary",
        original_filename="uncommitted_file.pdf",
        category="complaints",
        subfolder="AICTE-ROLLBACK-001",
        root_override=temp_storage
    )
    assert storage_service.file_exists(ref, root_override=temp_storage)

    # Simulate upload failure cleanup
    deleted = storage_service.delete_file(ref, root_override=temp_storage)
    assert deleted is True
    assert not storage_service.file_exists(ref, root_override=temp_storage)


def test_46_retention_protection_committed_file_not_deleted(temp_storage):
    """Verify delete_file refuses to delete files referenced by committed DocumentMetadata."""
    db = SessionLocal()
    case = db.query(Case).first()

    # Save a file on disk
    ref, safe_name, size = storage_service.save_file(
        file_data=b"%PDF-1.4 statutory evidentiary record",
        original_filename="statutory_inspection_order.pdf",
        category="cases",
        subfolder=case.id,
        root_override=temp_storage
    )
    assert storage_service.file_exists(ref, root_override=temp_storage)

    # Insert committed metadata record
    doc = DocumentMetadata(
        case_id=case.id,
        file_name=safe_name,
        original_filename="statutory_inspection_order.pdf",
        file_size=size,
        file_type="pdf",
        category="Inspection Report",
        access_classification="Official Internal",
        file_path=ref,
        uploader_role="officer"
    )
    db.add(doc)
    db.commit()
    db.close()

    # Attempting to delete a committed evidentiary record must be blocked
    deleted = storage_service.delete_file(ref, root_override=temp_storage, force=False)
    assert deleted is False, "Retention violation: Committed document file was physically deleted!"
    assert storage_service.file_exists(ref, root_override=temp_storage)

    # Clean up test metadata record
    db = SessionLocal()
    to_delete = db.query(DocumentMetadata).filter(DocumentMetadata.file_name == safe_name).first()
    if to_delete:
        db.delete(to_delete)
        db.commit()
    db.close()
    storage_service.delete_file(ref, root_override=temp_storage, force=True)


def test_47_read_only_or_unwritable_storage_failure(temp_storage):
    """Verify storage validation detects unwritable or non-directory roots."""
    # Point root_override to an existing regular file instead of a directory
    dummy_file = os.path.join(temp_storage, "not_a_dir.txt")
    with open(dummy_file, "w") as f:
        f.write("text")

    res = storage_service.validate_storage(root_override=dummy_file)
    assert res["status"] == "error"
    assert res["writable"] is False
    assert "not a directory" in res["error"].lower()


def test_48_production_startup_rejects_relative_path(monkeypatch):
    """Verify production startup fails fast if DOCUMENT_STORAGE_ROOT is set to a relative local path."""
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr(settings, "DOCUMENT_STORAGE_BACKEND", "render_disk")
    monkeypatch.setattr(settings, "DOCUMENT_STORAGE_ROOT", "./storage/docs")

    with pytest.raises(RuntimeError, match="PRODUCTION STORAGE CONFIG ERROR"):
        storage_service.validate_storage_on_startup()


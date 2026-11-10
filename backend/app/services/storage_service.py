import os
import re
import uuid
import zipfile
import io
import urllib.parse
import tempfile
import hashlib
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime
from app.config import settings

# Supported storage backend configurations (Zero-Cost Neon BYTEA + Filesystem options)
SUPPORTED_STORAGE_BACKENDS = {"local", "render_disk", "filesystem", "neon_bytea", "database"}

# Canonical MIME mappings
ALLOWED_MIME_TYPES = {
    "pdf": ["application/pdf"],
    "png": ["image/png"],
    "jpg": ["image/jpeg", "image/pjpeg"],
    "jpeg": ["image/jpeg", "image/pjpeg"],
    "docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream"
    ]
}

# Magic byte signatures
MAGIC_BYTES = {
    "pdf": [b"%PDF"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "docx": [b"PK\x03\x04"]  # Office Open XML Zip archive header
}


def validate_storage_backend(backend_name: Optional[str] = None) -> str:
    """
    Validate that the configured storage backend is supported.
    Accepted values: 'local', 'render_disk', 'filesystem'.
    Raises ValueError on unsupported values.
    """
    val = (backend_name or settings.DOCUMENT_STORAGE_BACKEND).strip().lower()
    if val not in SUPPORTED_STORAGE_BACKENDS:
        raise ValueError(
            f"Unsupported DOCUMENT_STORAGE_BACKEND: '{val}'. "
            f"Supported values are: {sorted(list(SUPPORTED_STORAGE_BACKENDS))}."
        )
    return val


def get_backend_base_dir() -> str:
    """Return the absolute path of the backend directory."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_storage_root(root_override: Optional[str] = None) -> str:
    """
    Resolve the canonical storage root directory.
    Supports Render Persistent Disk (/storage/docs) and local development (./storage/docs).
    """
    if root_override:
        configured = root_override
    else:
        # Check DOCUMENT_STORAGE_ROOT first, fallback to legacy STORAGE_DIR if set
        configured = settings.DOCUMENT_STORAGE_ROOT
        if configured == "./storage/docs" and os.environ.get("STORAGE_DIR"):
            configured = os.environ.get("STORAGE_DIR")

    if os.path.isabs(configured):
        return os.path.abspath(configured)

    base = get_backend_base_dir()
    rel = configured.lstrip("./").lstrip(".\\")
    return os.path.abspath(os.path.join(base, rel))


def _sanitize_path_component(comp: Optional[str]) -> str:
    """
    Sanitize directory or category components to prevent path traversal,
    absolute injection, directory escaping, null bytes, or URL-encoded attacks.
    """
    if not comp:
        return ""

    raw = str(comp).replace("\x00", "")

    # Multi-pass URL unquoting to prevent double-encoded traversal (%252e%252e)
    for _ in range(3):
        unquoted = urllib.parse.unquote(raw)
        if unquoted == raw:
            break
        raw = unquoted

    raw = raw.replace("\x00", "")

    # Strip null bytes, slashes, backslashes, Windows colons, and traversal tokens
    clean = re.sub(r"[\x00/\\:*?\"<>|]", "_", raw.strip())
    clean = re.sub(r"\.{2,}", "_", clean)
    return clean.strip(" ._")


def _is_safe_subpath(base_dir: str, target_path: str) -> bool:
    """
    Verify target_path resides strictly within base_dir without escaping.
    Uses os.path.realpath on both paths to resolve symlinks and prevent symlink directory escape.
    """
    try:
        real_base = os.path.realpath(os.path.abspath(base_dir))
        real_target = os.path.realpath(os.path.abspath(target_path))
        common = os.path.commonpath([real_base, real_target])
        return common == real_base
    except Exception:
        return False


def validate_docx_data(file_data: bytes) -> bool:
    """
    Verify that DOCX content is an authentic ZIP archive adhering to Office Open XML specs.
    Checks for required [Content_Types].xml and word/ part, while guarding against zip-bombs.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(file_data), "r") as zf:
            namelist = zf.namelist()
            # Must have [Content_Types].xml (OPC package convention)
            if "[Content_Types].xml" not in namelist:
                return False
            # Must have Word document directory or word/document.xml
            has_word_part = any(name.startswith("word/") for name in namelist)
            if not has_word_part:
                return False
            # Zip bomb guard: total uncompressed size must not exceed 50 MB
            total_uncompressed = sum(info.file_size for info in zf.infolist())
            if total_uncompressed > 50 * 1024 * 1024:
                return False
            return True
    except Exception:
        return False


def validate_storage(root_override: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate that the storage directory exists (or can be created),
    is a directory, and has write permissions.
    """
    validate_storage_backend()
    root = get_storage_root(root_override)
    try:
        if not os.path.exists(root):
            os.makedirs(root, exist_ok=True)

        if not os.path.isdir(root):
            return {
                "status": "error",
                "path": root,
                "writable": False,
                "error": f"Path '{root}' exists but is not a directory."
            }

        # Check write permissions via atomic probe file
        probe_name = f".storage_probe_{uuid.uuid4().hex[:8]}.tmp"
        probe_path = os.path.join(root, probe_name)
        with open(probe_path, "wb") as f:
            f.write(b"nyayaniti_storage_probe")

        if os.path.exists(probe_path):
            os.remove(probe_path)

        return {
            "status": "ready",
            "backend": settings.DOCUMENT_STORAGE_BACKEND,
            "path": root,
            "writable": True
        }
    except Exception as e:
        return {
            "status": "error",
            "path": root,
            "writable": False,
            "error": str(e)
        }


def validate_storage_on_startup() -> Dict[str, Any]:
    """
    Startup hook for FastAPI.
    Validates persistent storage health and fails fast in production if:
    1. DOCUMENT_STORAGE_BACKEND is unsupported.
    2. In 'neon_bytea' / 'database' mode, verifies database connectivity without requiring disk.
    3. In 'render_disk' mode, verifies DOCUMENT_STORAGE_ROOT is an absolute path.
    4. In filesystem mode, verifies storage root exists and has write permissions.
    """
    backend = validate_storage_backend()

    # Zero-Cost PostgreSQL BYTEA / Database Storage Mode
    if backend in {"neon_bytea", "database"}:
        from app.database import engine
        from sqlalchemy import text
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {
                "status": "ready",
                "backend": backend,
                "storage_type": "database_bytea",
                "writable": True
            }
        except Exception as e:
            err_msg = f"Zero-cost database storage connection failed: {e}"
            if os.getenv("APP_ENV", "development").lower() in ("production", "staging"):
                raise RuntimeError(f"{os.getenv('APP_ENV').upper()} STORAGE ERROR: {err_msg}")
            else:
                print(f"[NyayaNiti Storage Warning] {err_msg}")
            return {
                "status": "error",
                "backend": backend,
                "writable": False,
                "error": str(e)
            }

    is_prod = (
        os.getenv("APP_ENV", "development").lower() == "production"
        or settings.DOCUMENT_STORAGE_ROOT == "/storage/docs"
        or os.getenv("RENDER") == "true"
        or backend == "render_disk"
    )

    if is_prod and not os.path.isabs(settings.DOCUMENT_STORAGE_ROOT):
        raise RuntimeError(
            f"PRODUCTION STORAGE CONFIG ERROR: DOCUMENT_STORAGE_ROOT is set to relative path "
            f"'{settings.DOCUMENT_STORAGE_ROOT}'. Production requires a mounted persistent disk path (e.g. /storage/docs)."
        )

    result = validate_storage()

    if result["status"] != "ready":
        err_msg = f"Storage initialization failed for '{result['path']}': {result.get('error')}"
        if is_prod:
            raise RuntimeError(f"PRODUCTION STORAGE ERROR: {err_msg}")
        else:
            print(f"[NyayaNiti Storage Warning] {err_msg}")

    return result


async def read_upload_stream(file: Any, max_bytes: Optional[int] = None) -> bytes:
    """
    Read an uploaded file in chunks while enforcing maximum size limits in real-time.
    Aborts immediately if the stream exceeds max_bytes, preventing memory exhaustion.
    """
    if max_bytes is None:
        max_bytes = settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024

    chunks = []
    total_bytes = 0
    chunk_size = 65536  # 64 KB chunks

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise ValueError(
                f"File size exceeds maximum permitted limit of {settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB} MB."
            )
        chunks.append(chunk)

    if total_bytes == 0:
        raise ValueError("Uploaded file is empty.")

    return b"".join(chunks)


def validate_file_upload(
    file_data: bytes,
    original_filename: str,
    content_type: Optional[str] = None
) -> Tuple[str, str, int]:
    """
    Comprehensive file upload validation:
    - Empty file rejection
    - Maximum file size
    - Allowed extension
    - Allowed MIME type
    - Magic bytes file signature verification
    - Deep OOXML ZIP validation for DOCX
    """
    file_size = len(file_data)
    if file_size == 0:
        raise ValueError("Uploaded file is empty.")

    max_bytes = settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise ValueError(
            f"File size exceeds maximum permitted limit of {settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB} MB."
        )

    # Sanitize original filename and reject null bytes
    raw_name = str(original_filename).replace("\x00", "").strip()
    clean_original = os.path.basename(raw_name)
    clean_original = re.sub(r"[\x00/\\:*?\"<>|]", "_", clean_original)
    if not clean_original or clean_original.startswith("."):
        clean_original = f"document_{uuid.uuid4().hex[:6]}.pdf"

    ext = clean_original.rsplit(".", 1)[-1].lower() if "." in clean_original else ""
    allowed_exts = {e.lower().lstrip(".") for e in settings.DOCUMENT_STORAGE_ALLOWED_EXTENSIONS}

    if not ext or ext not in allowed_exts:
        formatted_allowed = ", ".join(sorted(allowed_exts)).upper()
        raise ValueError(f"Unsupported file format '.{ext}'. Allowed formats: {formatted_allowed}.")

    # MIME type validation if provided
    if content_type:
        ctype = content_type.lower().split(";")[0].strip()
        expected_mimes = ALLOWED_MIME_TYPES.get(ext, [])
        if expected_mimes and ctype not in expected_mimes and ctype != "application/octet-stream":
            raise ValueError(f"Disallowed MIME type '{content_type}' for .{ext} file.")

    # Magic bytes signature validation
    signatures = MAGIC_BYTES.get(ext, [])
    if signatures:
        matched = any(file_data.startswith(sig) for sig in signatures)
        if not matched:
            raise ValueError("File content does not match the stated file extension format.")

    # Deep DOCX structure verification
    if ext == "docx":
        if not validate_docx_data(file_data):
            raise ValueError("Invalid DOCX file: content is not a valid Microsoft Word OpenXML document.")

    return clean_original, ext, file_size


def save_file(
    file_data: bytes,
    original_filename: str,
    category: Optional[str] = "complaints",
    subfolder: Optional[str] = None,
    content_type: Optional[str] = None,
    root_override: Optional[str] = None
) -> Tuple[str, str, int]:
    """
    Save file to persistent disk with atomic write, unique identifier,
    and path traversal prevention.
    Returns: (storage_reference, safe_stored_filename, file_size)
    """
    clean_name, ext, file_size = validate_file_upload(file_data, original_filename, content_type)

    root = get_storage_root(root_override)
    safe_cat = _sanitize_path_component(category) or "documents"
    safe_sub = _sanitize_path_component(subfolder)

    if safe_sub:
        target_dir = os.path.join(root, safe_cat, safe_sub)
        rel_prefix = f"{safe_cat}/{safe_sub}"
    else:
        target_dir = os.path.join(root, safe_cat)
        rel_prefix = safe_cat

    if not _is_safe_subpath(root, target_dir):
        raise ValueError("Path traversal or directory escape attempt detected.")

    os.makedirs(target_dir, exist_ok=True)

    uid = uuid.uuid4().hex[:16]
    safe_stored_name = f"doc_{uid}.{ext}"
    target_path = os.path.join(target_dir, safe_stored_name)

    if not _is_safe_subpath(target_dir, target_path):
        raise ValueError("Filename injection or directory escape attempt detected.")

    if os.path.exists(target_path):
        safe_stored_name = f"doc_{uid}_{uuid.uuid4().hex[:6]}.{ext}"
        target_path = os.path.join(target_dir, safe_stored_name)

    # Atomic write pattern: write to tmp file then atomic replace
    tmp_path = os.path.join(target_dir, f".tmp_{uid}.{ext}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(file_data)
        os.replace(tmp_path, target_path)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    storage_ref = f"{rel_prefix}/{safe_stored_name}".replace("\\", "/")
    return storage_ref, safe_stored_name, file_size


def get_file(storage_ref: str, root_override: Optional[str] = None) -> Optional[str]:
    """
    Retrieve physical file path from storage reference.
    Validates against traversal tokens, UNC, drive letters, encoded strings, null bytes,
    and symlink escape.
    """
    if not storage_ref or not isinstance(storage_ref, str):
        return None

    if "\x00" in storage_ref:
        return None

    root = get_storage_root(root_override)

    # Multi-pass URL unquoting to prevent encoded traversal (%2e%2e%2f)
    raw = storage_ref
    for _ in range(3):
        unquoted = urllib.parse.unquote(raw)
        if unquoted == raw:
            break
        raw = unquoted

    if "\x00" in raw:
        return None

    # Disallow Windows drive letters ('C:'), UNC prefixes ('\\\\', '//')
    if ":" in raw or raw.startswith(("\\\\", "//")):
        return None

    # Normalize slashes
    normalized_ref = raw.replace("\\", "/").lstrip("/")

    # Disallow directory traversal markers
    parts = normalized_ref.split("/")
    if any(p == ".." or p.strip() == ".." for p in parts):
        return None

    candidate_path = os.path.abspath(os.path.join(root, normalized_ref))
    if _is_safe_subpath(root, candidate_path) and os.path.isfile(candidate_path):
        return os.path.realpath(candidate_path)

    # Check direct filename in root
    base_candidate = os.path.abspath(os.path.join(root, os.path.basename(normalized_ref)))
    if _is_safe_subpath(root, base_candidate) and os.path.isfile(base_candidate):
        return os.path.realpath(base_candidate)

    return None


def resolve_document_file_path(doc: Any, root_override: Optional[str] = None) -> Optional[str]:
    """
    Universal backward-compatible resolver for DocumentMetadata records.
    Safely resolves:
    1. Modern storage reference via get_file
    2. Subdirectory conventions: complaints/{case_id}/{file_name}, cases/{case_id}/{file_name}
    3. Legacy /storage/cases/ directories
    4. Legitimate absolute paths strictly confined within authorized roots (storage root, legacy cases, tempdir)
    
    Security fences:
    - Never retrieves arbitrary operating-system files (/etc/passwd, C:\\Windows, etc.)
    - Symlinks pointing outside authorized storage roots are rejected via realpath check
    - Virtual URLs (/api/...) and remote schemes (http, ftp, file) are never treated as filesystem paths
    - Null bytes and malformed paths return None
    - No physical path is exposed across the HTTP boundary
    """
    if not doc:
        return None

    root = get_storage_root(root_override)
    file_path = getattr(doc, "file_path", None)
    file_name = getattr(doc, "file_name", None)
    case_id = getattr(doc, "case_id", None)

    # 1. Sanitize and inspect file_path
    if file_path:
        if "\x00" in str(file_path):
            return None

        file_path_str = str(file_path).strip()
        lower_path = file_path_str.lower()

        # Reject remote URL schemes and database binary URIs
        if any(lower_path.startswith(scheme) for scheme in ["http://", "https://", "ftp://", "file://", "javascript:", "db://"]):
            pass
        elif lower_path.startswith(("/api/", "/complainant/", "/officer/")):
            # Virtual download URL - do not treat as local filesystem path
            pass
        elif lower_path.startswith("/secure/storage/"):
            # Seed/demo data convention: /secure/storage/cases/{case_id}/{file_name}
            rel_candidate = re.sub(r"^/secure/storage/", "", file_path_str).lstrip("/")
            candidate = get_file(rel_candidate, root_override=root)
            if candidate:
                return candidate
        elif not os.path.isabs(file_path_str):
            resolved = get_file(file_path_str, root_override=root)
            if resolved:
                return resolved
        else:
            # Absolute path stored in doc.file_path (from test suites or explicit fixtures)
            # CRITICAL SECURITY CHECK: Only allow if strictly within an authorized storage directory!
            base_dir = get_backend_base_dir()
            legacy_cases = os.path.abspath(os.path.join(base_dir, "storage", "cases"))

            is_in_root = _is_safe_subpath(root, file_path_str)
            is_in_legacy = os.path.exists(legacy_cases) and _is_safe_subpath(legacy_cases, file_path_str)

            if (is_in_root or is_in_legacy) and os.path.isfile(file_path_str):
                return os.path.realpath(file_path_str)
            else:
                # Disallow external system files (/etc/passwd, C:\Windows, UNC shares, etc.)
                pass

    # 2. Structured relative paths
    if case_id and file_name:
        safe_case_id = _sanitize_path_component(case_id)
        safe_file_name = _sanitize_path_component(file_name)
        if safe_case_id and safe_file_name:
            for prefix in ["complaints", "cases", "compliance", "corrective-actions"]:
                candidate = get_file(f"{prefix}/{safe_case_id}/{safe_file_name}", root_override=root)
                if candidate:
                    return candidate

            # Direct case folder
            candidate = get_file(f"{safe_case_id}/{safe_file_name}", root_override=root)
            if candidate:
                return candidate

    # 3. Direct file_name in storage root
    if file_name:
        safe_name = _sanitize_path_component(file_name)
        if safe_name:
            candidate = get_file(safe_name, root_override=root)
            if candidate:
                return candidate

    # 4. Backward compatibility: check legacy backend/storage/cases
    base_dir = get_backend_base_dir()
    legacy_storage_cases = os.path.abspath(os.path.join(base_dir, "storage", "cases"))
    if os.path.exists(legacy_storage_cases):
        if case_id and file_name:
            safe_case_id = _sanitize_path_component(case_id)
            safe_file_name = _sanitize_path_component(file_name)
            if safe_case_id and safe_file_name:
                legacy_case_path = os.path.abspath(os.path.join(legacy_storage_cases, safe_case_id, safe_file_name))
                if _is_safe_subpath(legacy_storage_cases, legacy_case_path) and os.path.isfile(legacy_case_path):
                    return os.path.realpath(legacy_case_path)

        if file_name:
            safe_file_name = _sanitize_path_component(file_name)
            if safe_file_name:
                legacy_file_path = os.path.abspath(os.path.join(legacy_storage_cases, safe_file_name))
                if _is_safe_subpath(legacy_storage_cases, legacy_file_path) and os.path.isfile(legacy_file_path):
                    return os.path.realpath(legacy_file_path)

    return None


def file_exists(storage_ref: str, root_override: Optional[str] = None) -> bool:
    """Check if file exists on persistent storage."""
    return get_file(storage_ref, root_override=root_override) is not None


def is_file_referenced(storage_ref: str, db: Optional[Any] = None) -> bool:
    """
    Check if any committed DocumentMetadata record in the database references this storage_ref or filename.
    Guards against accidental deletion of evidence under legal hold or active case review.
    """
    if not storage_ref:
        return False

    close_db = False
    if db is None:
        try:
            from app.database import SessionLocal
            db = SessionLocal()
            close_db = True
        except Exception:
            return False

    try:
        from app.models.models import DocumentMetadata
        base_name = os.path.basename(storage_ref)
        count = db.query(DocumentMetadata).filter(
            (DocumentMetadata.file_path == storage_ref) |
            (DocumentMetadata.file_path == f"/{storage_ref}") |
            (DocumentMetadata.file_name == base_name)
        ).count()
        return count > 0
    except Exception:
        return False
    finally:
        if close_db and db:
            db.close()


def delete_file(
    storage_ref: str,
    root_override: Optional[str] = None,
    force: bool = False,
    db: Optional[Any] = None
) -> bool:
    """
    Safely delete a file from persistent storage.
    Used for rollback when database transactions fail.
    Refuses deletion if the file is referenced by any active DocumentMetadata record,
    enforcing statutory evidence retention and legal-hold integrity.
    """
    if not storage_ref:
        return False

    path = get_file(storage_ref, root_override=root_override)
    if not path or not os.path.isfile(path):
        return False

    # Retention check: Do not delete if referenced by committed metadata unless force=True
    if not force and is_file_referenced(storage_ref, db=db):
        return False

    try:
        os.remove(path)
        return True
    except Exception:
        return False


def get_file_size(storage_ref: str, root_override: Optional[str] = None) -> Optional[int]:
    """Return physical file size in bytes if file exists."""
    path = get_file(storage_ref, root_override=root_override)
    if path and os.path.isfile(path):
        return os.path.getsize(path)
    return None


# =============================================================================
# Zero-Cost Neon PostgreSQL BYTEA Storage & Backward-Compatible Handlers
# =============================================================================

def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hex digest for binary data integrity verification."""
    return hashlib.sha256(data).hexdigest()


def save_document_binary(
    db: Any,
    document_id: int,
    file_data: bytes,
    sha256_checksum: Optional[str] = None
) -> Any:
    """
    Store binary content into DocumentBinary table associated with document_id.
    Validates document_id, ensures no duplicate binary already exists, and records checksum.
    """
    from app.models.models import DocumentBinary, DocumentMetadata

    if not document_id or not isinstance(document_id, int):
        raise ValueError("Invalid document_id for binary storage.")

    doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == document_id).first()
    if not doc:
        raise ValueError(f"DocumentMetadata with id {document_id} does not exist.")

    existing_bin = db.query(DocumentBinary).filter(DocumentBinary.document_id == document_id).first()
    if existing_bin:
        raise ValueError(f"A binary object already exists for DocumentMetadata id {document_id}.")

    if not file_data:
        raise ValueError("Cannot store empty binary content.")

    checksum = sha256_checksum or compute_sha256(file_data)
    binary_entry = DocumentBinary(
        document_id=document_id,
        content=file_data,
        sha256_checksum=checksum,
        file_size_bytes=len(file_data),
        created_at=datetime.utcnow()
    )
    db.add(binary_entry)
    return binary_entry


def store_uploaded_document(
    db: Any,
    case_id: str,
    file_data: bytes,
    original_filename: str,
    category: str = "Official Notice",
    access_classification: str = "Official Internal",
    uploaded_by_id: Optional[int] = None,
    uploaded_by_complainant_id: Optional[int] = None,
    uploader_role: str = "officer",
    content_type: Optional[str] = None,
    backend_override: Optional[str] = None
) -> Any:
    """
    Unified transactional document storage.
    Supports:
    1. 'neon_bytea' / 'database': Writes metadata and binary into the database within the active transaction.
    2. 'local' / 'render_disk' / 'filesystem': Writes to persistent disk and stores path in metadata.
    Does NOT commit the transaction - caller commits so case events, audit logs,
    and metadata commit atomically together. If anything fails, db.rollback() rolls back everything.
    """
    clean_name, ext, file_size = validate_file_upload(file_data, original_filename, content_type)
    backend = (backend_override or settings.DOCUMENT_STORAGE_BACKEND).strip().lower()

    from app.models.models import DocumentMetadata, DocumentBinary

    if backend in {"neon_bytea", "database"}:
        checksum = compute_sha256(file_data)

        # Step 1: Create DocumentMetadata record
        doc = DocumentMetadata(
            case_id=case_id,
            file_name=clean_name,
            original_filename=clean_name,
            file_size=file_size,
            file_type=ext,
            category=category,
            access_classification=access_classification,
            uploaded_by_id=uploaded_by_id,
            uploaded_by_complainant_id=uploaded_by_complainant_id,
            uploader_role=uploader_role,
            file_path="pending",  # Updated after ID generation
            upload_timestamp=datetime.utcnow()
        )
        db.add(doc)
        db.flush()  # Generate doc.id within the active transaction

        # Step 2: Establish db:// canonical storage URI
        doc.file_path = f"db://document_binaries/{doc.id}"

        # Step 3: Insert DocumentBinary in the exact same transaction
        doc_bin = DocumentBinary(
            document_id=doc.id,
            content=file_data,
            sha256_checksum=checksum,
            file_size_bytes=file_size,
            created_at=datetime.utcnow()
        )
        db.add(doc_bin)
        return doc
    else:
        # Legacy filesystem / persistent disk save
        storage_ref, safe_name, actual_size = save_file(
            file_data=file_data,
            original_filename=clean_name,
            category="cases",
            subfolder=case_id,
            content_type=content_type
        )
        doc = DocumentMetadata(
            case_id=case_id,
            file_name=safe_name,
            original_filename=clean_name,
            file_size=actual_size,
            file_type=ext,
            category=category,
            access_classification=access_classification,
            uploaded_by_id=uploaded_by_id,
            uploaded_by_complainant_id=uploaded_by_complainant_id,
            uploader_role=uploader_role,
            file_path=storage_ref,
            upload_timestamp=datetime.utcnow()
        )
        db.add(doc)
        return doc


def get_document_binary(doc: Any, db: Any) -> Optional[Tuple[bytes, str, str, int]]:
    """
    Retrieve document binary bytes.
    First checks the DocumentBinary table in the database.
    If not in the database, falls back to legacy filesystem resolution.
    Returns: (binary_bytes, filename, file_type, file_size) or None
    """
    if not doc:
        return None

    from app.models.models import DocumentBinary

    # 1. Check DocumentBinary in database
    if hasattr(doc, "id") and doc.id is not None:
        bin_record = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
        if bin_record and bin_record.content:
            filename = getattr(doc, "original_filename", None) or getattr(doc, "file_name", "document")
            file_type = getattr(doc, "file_type", "pdf")
            return (bin_record.content, filename, file_type, bin_record.file_size_bytes)

    # 2. Check legacy filesystem resolution
    file_path = resolve_document_file_path(doc)
    if file_path and os.path.isfile(file_path):
        try:
            with open(file_path, "rb") as f:
                data = f.read()
            filename = getattr(doc, "original_filename", None) or getattr(doc, "file_name", os.path.basename(file_path))
            file_type = getattr(doc, "file_type", filename.split(".")[-1].lower())
            return (data, filename, file_type, len(data))
        except Exception:
            return None

    return None


def retrieve_document_payload(
    doc: Any,
    db: Any
) -> Optional[Tuple[Optional[bytes], Optional[str], str, str, int]]:
    """
    Unified payload retriever.
    Returns: (binary_bytes, physical_path, filename, media_type, file_size)
    - For database-stored binaries: (bytes, None, filename, media_type, size)
    - For legacy filesystem files: (None, path, filename, media_type, size)
    - For missing files: None
    """
    if not doc:
        return None

    from app.models.models import DocumentBinary

    filename = getattr(doc, "original_filename", None) or getattr(doc, "file_name", "document.pdf")
    ext = getattr(doc, "file_type", "pdf").lower().lstrip(".")
    media_type = ALLOWED_MIME_TYPES.get(ext, ["application/octet-stream"])[0]

    # 1. Database-backed binary check
    if hasattr(doc, "id") and doc.id is not None:
        bin_record = db.query(DocumentBinary).filter(DocumentBinary.document_id == doc.id).first()
        if bin_record and bin_record.content:
            return (bin_record.content, None, filename, media_type, bin_record.file_size_bytes)

    # 2. Legacy filesystem resolution check
    file_path = resolve_document_file_path(doc)
    if file_path and os.path.isfile(file_path):
        return (None, file_path, filename, media_type, os.path.getsize(file_path))

    return None


def create_download_response(
    payload: Tuple[Optional[bytes], Optional[str], str, str, int]
) -> Any:
    """
    Generate bounded-memory HTTP streaming or FileResponse for document downloads.
    Enforces X-Content-Type-Options: nosniff and safe Content-Disposition headers.
    """
    from fastapi.responses import Response, FileResponse

    binary_bytes, physical_path, filename, media_type, file_size = payload
    safe_filename = _sanitize_path_component(filename) or "document.pdf"
    if not safe_filename.endswith(f".{media_type.split('/')[-1]}") and "." not in safe_filename:
        safe_filename = f"{safe_filename}.pdf"

    if binary_bytes is not None:
        return Response(
            content=binary_bytes,
            media_type=media_type,
            headers={
                "X-Content-Type-Options": "nosniff",
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Content-Length": str(file_size),
                "Cache-Control": "private, no-cache, no-store, must-revalidate"
            }
        )
    elif physical_path is not None and os.path.isfile(physical_path):
        return FileResponse(
            path=physical_path,
            media_type=media_type,
            filename=safe_filename,
            headers={
                "X-Content-Type-Options": "nosniff",
                "Content-Disposition": f'attachment; filename="{safe_filename}"'
            }
        )
    else:
        raise ValueError("Invalid payload: neither binary_bytes nor physical_path provided.")


def delete_document_safely(
    db: Any,
    doc_id: int,
    actor_role: Optional[str] = None,
    force: bool = False
) -> bool:
    """
    Enforce evidence retention and legal-hold integrity during document deletion.
    - Prohibits deletion if referenced in ComplianceEvidence, CorrectiveActionPlan, or CoordinationTask.
    - Prohibits deletion unless actor is super_admin or force is True.
    - Deletes DocumentBinary and DocumentMetadata atomically within the transaction.
    """
    from app.models.models import (
        DocumentMetadata, DocumentBinary, ComplianceEvidence,
        CorrectiveActionPlan, CoordinationTask
    )

    doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == doc_id).first()
    if not doc:
        return False

    # Retention check 1: Compliance evidence linkage
    comp_count = db.query(ComplianceEvidence).filter(ComplianceEvidence.document_id == doc_id).count()
    if comp_count > 0:
        return False

    # Retention check 2: CAP evidence linkage
    cap_count = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.completion_evidence_doc_id == doc_id).count()
    if cap_count > 0:
        return False

    # Retention check 3: Coordination task linkage
    task_count = db.query(CoordinationTask).filter(CoordinationTask.evidence_doc_id == doc_id).count()
    if task_count > 0:
        return False

    # Role restriction: Only super_admin or forced authorized deletion allowed
    if actor_role != "super_admin" and not force:
        return False

    # Delete DocumentBinary first (due to ondelete="RESTRICT")
    db.query(DocumentBinary).filter(DocumentBinary.document_id == doc_id).delete()

    # Delete DocumentMetadata
    db.delete(doc)

    # If physical file exists, delete if not referenced elsewhere
    if doc.file_path and not doc.file_path.startswith("db://"):
        delete_file(doc.file_path, db=db, force=force)

    return True


def get_storage_diagnostics(db: Any) -> Dict[str, Any]:
    """
    Administrative diagnostic function to report storage usage and quota without
    loading full document binaries into memory.
    Uses efficient SQL aggregate queries.
    """
    from app.models.models import DocumentMetadata, DocumentBinary
    from sqlalchemy import func

    total_meta = db.query(func.count(DocumentMetadata.id)).scalar() or 0
    total_bin = db.query(func.count(DocumentBinary.id)).scalar() or 0
    total_bytes = db.query(func.sum(DocumentBinary.file_size_bytes)).scalar() or 0
    avg_bytes = db.query(func.avg(DocumentBinary.file_size_bytes)).scalar() or 0.0
    max_bytes = db.query(func.max(DocumentBinary.file_size_bytes)).scalar() or 0

    db_backed_count = db.query(func.count(DocumentMetadata.id)).filter(
        DocumentMetadata.file_path.like("db://%")
    ).scalar() or 0

    legacy_fs_count = total_meta - db_backed_count

    # Integrity verification: Identify missing binaries and orphan binaries
    missing_binaries = db.query(func.count(DocumentMetadata.id)).filter(
        DocumentMetadata.file_path.like("db://%"),
        ~DocumentMetadata.id.in_(db.query(DocumentBinary.document_id))
    ).scalar() or 0

    orphan_binaries = db.query(func.count(DocumentBinary.id)).filter(
        ~DocumentBinary.document_id.in_(db.query(DocumentMetadata.id))
    ).scalar() or 0

    metadata_without_binary = total_meta - total_bin

    assumed_quota_mb = getattr(settings, "DOCUMENT_STORAGE_ASSUMED_QUOTA_MB", 512)
    assumed_quota_bytes = assumed_quota_mb * 1024 * 1024
    utilization_pct = round((total_bytes / assumed_quota_bytes) * 100, 4) if assumed_quota_bytes > 0 else 0.0

    # Operational status is determined strictly by data integrity and connectivity,
    # never solely by an unverified third-party account quota assumption.
    is_intact = (missing_binaries == 0 and orphan_binaries == 0)
    operational_status = "operational" if is_intact else "degraded"

    return {
        "backend": settings.DOCUMENT_STORAGE_BACKEND,
        "max_file_size_mb": settings.DOCUMENT_STORAGE_MAX_FILE_SIZE_MB,
        # Verified measured database metrics
        "total_metadata_records": int(total_meta),
        "total_binary_records": int(total_bin),
        "total_stored_binary_bytes": int(total_bytes),
        "total_stored_binary_mb": round(total_bytes / (1024 * 1024), 2),
        "average_document_size_bytes": round(avg_bytes, 2),
        "max_document_size_bytes": int(max_bytes),
        "database_backed_documents": int(db_backed_count),
        "legacy_filesystem_documents": int(legacy_fs_count),
        "missing_binary_records": int(missing_binaries),
        "orphan_binary_records": int(orphan_binaries),
        "metadata_without_binary": int(metadata_without_binary),
        # Configured / unverified quota threshold metrics
        "configured_quota_mb": assumed_quota_mb,
        "neon_free_quota_mb": assumed_quota_mb,  # Backward compatibility for existing telemetry
        "quota_status": "unverified_estimate",
        "is_quota_verified": False,
        "quota_utilization_percent": utilization_pct,
        # Operational and integrity health
        "operational_status": operational_status,
        "integrity_status": "intact" if is_intact else "violation",
        "status": "healthy" if is_intact else "warning",
        "diagnostics_advisory": (
            "Operational health is derived from database schema and referential integrity. "
            "Quota utilization is an advisory estimate based on configured threshold."
        ),
    }

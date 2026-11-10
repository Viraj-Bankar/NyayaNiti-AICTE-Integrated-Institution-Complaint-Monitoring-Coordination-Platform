"""
NyayaNiti — Privacy-Safe Synthetic Staging Data Generator
Purpose: Populates an empty staging database with 100% fictional test records.
Zero production complainant data, zero production credentials, zero real personal information.
"""

import hashlib
import os
import re
import sys
from typing import Optional, Any
from datetime import datetime, timedelta

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from sqlalchemy.engine import make_url
from sqlalchemy import text
from app.api.auth import hash_password
from app.database import SessionLocal, engine, ensure_schema
from app.models.models import (
    Bureau, User, Complainant, Institution, InstitutionAlias, ComplaintCategory,
    Case, CaseEvent, CaseAssignment, CaseRelationship,
    DocumentMetadata, DocumentBinary,
    AuditLog, Notification,
    OverlapAlert, ActionConflictAlert, SurgeAlert, PriorityEvaluation, AIDuplicateRecommendation,
    CoordinationWorkspace, CoordinationParticipant, CoordinationTask, CaseCoordinationLink,
    RegulatoryRequirement, RegulatoryRequirementVersion, ComplianceAssessment, ComplianceEvidence,
    CorrectiveActionPlan, InstitutionalRiskIndicator, ComplianceScoreSnapshot, SystemConfiguration
)


def seed_staging_complaint_categories(db: Session):
    """Ensure standard statutory categories exist for synthetic staging cases."""
    if db.query(ComplaintCategory).first():
        return
    categories = [
        ComplaintCategory(code="ACADEMIC", name="Academic Issues", description="Curriculum and academic issues", default_priority="Medium", sla_days=30, is_active=True),
        ComplaintCategory(code="EXAMINATION", name="Examination and Results", description="Grading and exam issues", default_priority="High", sla_days=15, is_active=True),
        ComplaintCategory(code="ADMISSION", name="Admission and Enrollment", description="Admission guidelines", default_priority="High", sla_days=15, is_active=True),
        ComplaintCategory(code="FEES_FINANCIAL", name="Fees and Financial Issues", description="Fee overcharging", default_priority="High", sla_days=30, is_active=True),
        ComplaintCategory(code="INFRASTRUCTURE", name="Infrastructure and Facilities", description="Facility deficits", default_priority="Medium", sla_days=45, is_active=True),
        ComplaintCategory(code="ADMINISTRATIVE", name="Administrative Issues", description="Administrative delay", default_priority="High", sla_days=15, is_active=True),
        ComplaintCategory(code="FACULTY_STAFF", name="Faculty and Staff Related Issues", description="Staff conduct", default_priority="Medium", sla_days=30, is_active=True),
        ComplaintCategory(code="STUDENT_WELFARE", name="Student Welfare", description="Welfare and scholarships", default_priority="Medium", sla_days=30, is_active=True),
        ComplaintCategory(code="HARASSMENT", name="Harassment and Discrimination", description="Harassment complaints", default_priority="Critical", sla_days=7, is_active=True),
        ComplaintCategory(code="OTHER", name="Other", description="Miscellaneous grievances", default_priority="Low", sla_days=30, is_active=True),
    ]
    db.add_all(categories)
    db.commit()


def generate_synthetic_pdf(text_tag: str) -> bytes:
    """Generate a valid minimal PDF binary with custom identification tag."""
    content = (
        f"%PDF-1.4\n"
        f"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        f"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        f"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
        f"% NyayaNiti Synthetic Staging Document: {text_tag}\n"
        f"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n"
        f"trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
    )
    return content.encode("utf-8")


def generate_synthetic_png(text_tag: str) -> bytes:
    """Generate a valid minimal 1x1 PNG binary."""
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    comment = f"/* NyayaNiti Synthetic Staging Image: {text_tag} */".encode("utf-8")
    return png_header + comment


def verify_staging_target_safety(
    target_url: str,
    expected_db: Optional[str] = None,
    expected_host: Optional[str] = None,
    expected_role: Optional[str] = None,
    connection: Optional[Any] = None
):
    """
    Independent database identity verification and strict safety fences:
    1. Never prints complete connection URLs, passwords, or credentials.
    2. Rejects default SQLite development database (nyayaniti.db).
    3. Rejects known production identifiers.
    4. Requires explicit confirmation via CLI flag (--confirm-staging) or env var (NYAYANITI_STAGING_CONFIRM=1).
    5. Requires an explicit expected database name (--expected-db or EXPECTED_STAGING_DB).
    6. Validates expected host against parsed connection endpoint.
    7. Validates connected database name using PostgreSQL current_database().
    8. Validates connected role using PostgreSQL current_user.
    9. Fails closed on any identity mismatch or missing parameter.
    """
    if not target_url or not isinstance(target_url, str):
        raise RuntimeError("FATAL SAFETY ERROR: No database connection URL provided for staging seed.")

    # 1. Parse connection URL safely without logging secrets
    try:
        parsed = make_url(target_url)
    except Exception:
        raise RuntimeError("FATAL SAFETY ERROR: Malformed database connection URL format.")

    db_name = (parsed.database or "").strip()
    host_name = (parsed.host or "").strip().lower()
    clean_lower = target_url.lower()

    # 2. Refuse SQLite local development database (nyayaniti.db)
    if "nyayaniti.db" in clean_lower or clean_lower.endswith("/nyayaniti.db") or clean_lower.endswith("\\nyayaniti.db"):
        raise RuntimeError(
            "FATAL SAFETY ABORT: seed_staging_synthetic.py refused to execute against local development "
            "database 'nyayaniti.db'. Synthetic staging data must only be seeded into dedicated staging instances."
        )

    # 3. Refuse known production hostnames/keywords
    prod_markers = [
        "prod", "production", "nyayaniti-prod", "aicte-prod",
        "primary", "main-db", "nyayaniti-production"
    ]
    for marker in prod_markers:
        if marker in host_name or marker in db_name.lower():
            raise RuntimeError(
                f"FATAL SAFETY ABORT: Database identifier contains production marker '{marker}'. "
                f"Synthetic staging seed is strictly prohibited against production endpoints."
            )

    # 4. Require explicit confirmation flag
    has_cli_flag = "--confirm-staging" in sys.argv
    has_env_flag = os.getenv("NYAYANITI_STAGING_CONFIRM", "").strip() in ("1", "true", "TRUE", "yes")
    if not (has_cli_flag or has_env_flag):
        raise RuntimeError(
            "SAFETY CONFIRMATION REQUIRED: seed_staging_synthetic.py modifies database records. "
            "To execute against a validated staging database, pass the '--confirm-staging' flag "
            "or set environment variable 'NYAYANITI_STAGING_CONFIRM=1'."
        )

    # 5. Require explicit expected database name (Requirement 3)
    exp_db = expected_db or os.getenv("EXPECTED_STAGING_DB")
    if not exp_db:
        for i, arg in enumerate(sys.argv):
            if arg == "--expected-db" and i + 1 < len(sys.argv):
                exp_db = sys.argv[i + 1]
                break
            elif arg.startswith("--expected-db="):
                exp_db = arg.split("=", 1)[1]
                break

    if not exp_db:
        raise RuntimeError(
            "FATAL SAFETY ABORT: Missing required expected staging database name. "
            "Identity verification requires an explicit target database name via '--expected-db <NAME>' "
            "or 'EXPECTED_STAGING_DB' environment variable."
        )

    # Validate parsed URL database against expected DB name
    target_leaf = os.path.basename(db_name) if parsed.drivername.startswith("sqlite") else db_name
    if target_leaf != exp_db:
        raise RuntimeError(
            f"FATAL SAFETY ABORT: Target database name mismatch. "
            f"Connection targets '{target_leaf}', but expected staging database is '{exp_db}'. Aborting."
        )

    # 6. Validate expected host for network databases (Requirement 6)
    if host_name:
        exp_host = expected_host or os.getenv("EXPECTED_STAGING_HOST")
        if not exp_host:
            for i, arg in enumerate(sys.argv):
                if arg == "--expected-host" and i + 1 < len(sys.argv):
                    exp_host = sys.argv[i + 1]
                    break
                elif arg.startswith("--expected-host="):
                    exp_host = arg.split("=", 1)[1]
                    break

        if not exp_host:
            raise RuntimeError(
                "FATAL SAFETY ABORT: Missing required expected staging hostname. "
                "Network database connections require explicit '--expected-host <HOST>' "
                "or 'EXPECTED_STAGING_HOST' environment variable."
            )
        if host_name != exp_host.lower().strip():
            raise RuntimeError(
                f"FATAL SAFETY ABORT: Hostname mismatch. "
                f"Connection host '{host_name}' does not match expected staging host '{exp_host}'. Aborting."
            )

    # 7. Server-side identity verification via live SQL query (Requirements 4 & 5)
    if connection:
        dialect_name = connection.dialect.name
        if dialect_name == "postgresql":
            try:
                row = connection.execute(text("SELECT current_database(), current_user")).fetchone()
                actual_db, actual_user = row[0], row[1]
            except Exception as e:
                clean_err = re.sub(r"://[^@]+@", "://***:***@", str(e))
                clean_err = re.sub(r"password=[^\s;&]+", "password=***", clean_err)
                raise RuntimeError(f"FATAL SAFETY ABORT: Failed to verify PostgreSQL server identity: {clean_err}")

            if actual_db != exp_db:
                raise RuntimeError(
                    f"FATAL SAFETY ABORT: Server-side database identity verification failed. "
                    f"PostgreSQL current_database() returned '{actual_db}', expected '{exp_db}'. Aborting."
                )

            exp_role = expected_role or os.getenv("EXPECTED_STAGING_ROLE")
            if not exp_role:
                for i, arg in enumerate(sys.argv):
                    if arg == "--expected-role" and i + 1 < len(sys.argv):
                        exp_role = sys.argv[i + 1]
                        break
                    elif arg.startswith("--expected-role="):
                        exp_role = arg.split("=", 1)[1]
                        break

            if not exp_role:
                raise RuntimeError(
                    "FATAL SAFETY ABORT: Missing required expected staging database role. "
                    "PostgreSQL connections require explicit '--expected-role <ROLE>' "
                    "or 'EXPECTED_STAGING_ROLE' environment variable."
                )

            if actual_user != exp_role:
                raise RuntimeError(
                    f"FATAL SAFETY ABORT: Server-side database role verification failed. "
                    f"PostgreSQL current_user returned '{actual_user}', expected role '{exp_role}'. Aborting."
                )
        elif dialect_name == "sqlite":
            try:
                row = connection.execute(text("PRAGMA database_list")).fetchone()
                if row and len(row) >= 3 and row[2]:
                    actual_leaf = os.path.basename(row[2])
                    if actual_leaf and actual_leaf != exp_db:
                        raise RuntimeError(
                            f"FATAL SAFETY ABORT: SQLite server-side database identity verification failed. "
                            f"PRAGMA database_list returned '{actual_leaf}', expected '{exp_db}'. Aborting."
                        )
            except Exception as e:
                if "FATAL SAFETY ABORT" in str(e):
                    raise
                pass


def verify_database_hygiene(db: Session):
    """
    Comprehensive pre-seed database hygiene check covering all 31 application tables.
    Verifies that the target database is either:
    1. Pristine / empty (ready for initial synthetic staging seed), OR
    2. Already seeded with strictly synthetic staging records (idempotent re-run).
    If unexpected rows or non-staging records exist in ANY table, immediately aborts.
    Prints table names and row counts only; never prints credentials or PII.
    """
    violations = []

    # 1. Cases: must strictly match synthetic prefix
    non_stg_cases = db.query(Case).filter(~Case.id.like("STG-CASE-%")).count()
    if non_stg_cases > 0:
        violations.append(f"cases: {non_stg_cases} unexpected non-staging rows")

    # 2. Users: must strictly match synthetic prefix
    non_stg_users = db.query(User).filter(~User.username.like("staging_%")).count()
    if non_stg_users > 0:
        violations.append(f"users: {non_stg_users} unexpected non-staging rows")

    # 3. Institutions: must strictly match synthetic prefix
    non_stg_insts = db.query(Institution).filter(~Institution.permanent_id.like("STG-INST-%")).count()
    if non_stg_insts > 0:
        violations.append(f"institutions: {non_stg_insts} unexpected non-staging rows")

    # 4. Bureaus: must strictly match synthetic prefix
    non_stg_bureaus = db.query(Bureau).filter(~Bureau.code.like("STG-%")).count()
    if non_stg_bureaus > 0:
        violations.append(f"bureaus: {non_stg_bureaus} unexpected non-staging rows")

    # 5. Complainants: must strictly match synthetic email prefix
    non_stg_comp = db.query(Complainant).filter(~Complainant.email.like("staging.%")).count()
    if non_stg_comp > 0:
        violations.append(f"complainants: {non_stg_comp} unexpected non-staging rows")

    # 6. Document Metadata: must strictly match synthetic prefix
    non_stg_docs = db.query(DocumentMetadata).filter(~DocumentMetadata.file_name.like("stg_%")).count()
    if non_stg_docs > 0:
        violations.append(f"document_metadata: {non_stg_docs} unexpected non-staging rows")

    # 7. Document Binaries: must strictly link to synthetic staging document metadata
    stg_doc_subquery = db.query(DocumentMetadata.id).filter(DocumentMetadata.file_name.like("stg_%"))
    non_stg_bins = db.query(DocumentBinary).filter(~DocumentBinary.document_id.in_(stg_doc_subquery)).count()
    if non_stg_bins > 0:
        violations.append(f"document_binaries: {non_stg_bins} unexpected unlinked/non-staging rows")

    # 8. Regulatory Requirements: must strictly match synthetic prefix
    non_stg_reqs = db.query(RegulatoryRequirement).filter(~RegulatoryRequirement.id.like("AICTE-STG-%")).count()
    if non_stg_reqs > 0:
        violations.append(f"regulatory_requirements: {non_stg_reqs} unexpected non-staging rows")

    # 9. Compliance Assessments: must link to synthetic staging requirements
    non_stg_assess = db.query(ComplianceAssessment).filter(
        ~ComplianceAssessment.requirement_id.like("AICTE-STG-%")
    ).count()
    if non_stg_assess > 0:
        violations.append(f"compliance_assessments: {non_stg_assess} unexpected non-staging rows")

    # 10. Corrective Action Plans: must link to synthetic staging cases
    non_stg_caps = db.query(CorrectiveActionPlan).filter(
        ~CorrectiveActionPlan.related_case_id.like("STG-CASE-%")
    ).count()
    if non_stg_caps > 0:
        violations.append(f"corrective_action_plans: {non_stg_caps} unexpected non-staging rows")

    # 11. Case Events: must link to synthetic staging cases
    non_stg_events = db.query(CaseEvent).filter(~CaseEvent.case_id.like("STG-CASE-%")).count()
    if non_stg_events > 0:
        violations.append(f"case_events: {non_stg_events} unexpected non-staging rows")

    # 12-30. Operational tables that must be strictly empty (0 rows) in an isolated staging environment
    operational_tables = [
        (AuditLog, "audit_logs"),
        (Notification, "notifications"),
        (CaseAssignment, "case_assignments"),
        (CaseRelationship, "case_relationships"),
        (CaseCoordinationLink, "case_coordination_links"),
        (CoordinationWorkspace, "coordination_workspaces"),
        (CoordinationParticipant, "coordination_participants"),
        (CoordinationTask, "coordination_tasks"),
        (ActionConflictAlert, "action_conflict_alerts"),
        (OverlapAlert, "overlap_alerts"),
        (SurgeAlert, "surge_alerts"),
        (PriorityEvaluation, "priority_evaluations"),
        (AIDuplicateRecommendation, "ai_duplicate_recommendations"),
        (InstitutionAlias, "institution_aliases"),
        (InstitutionalRiskIndicator, "institutional_risk_indicators"),
        (ComplianceEvidence, "compliance_evidences"),
        (ComplianceScoreSnapshot, "compliance_score_snapshots"),
        (RegulatoryRequirementVersion, "regulatory_requirement_versions"),
        (SystemConfiguration, "system_configurations"),
    ]

    for model_cls, tbl_name in operational_tables:
        cnt = db.query(model_cls).count()
        if cnt > 0:
            violations.append(f"{tbl_name}: {cnt} unexpected rows")

    if violations:
        details = ", ".join(violations)
        raise RuntimeError(
            f"FATAL SAFETY ABORT: Database hygiene verification failed across application tables. "
            f"Found unexpected non-staging data ({details}). "
            f"Aborting to protect existing application records."
        )


def seed_staging_synthetic_data(
    db: Session,
    force_reset: bool = False,
    expected_db: Optional[str] = None,
    expected_host: Optional[str] = None,
    expected_role: Optional[str] = None
):
    """
    Populate staging database with strictly synthetic entities.
    Idempotent: skips if staging records already exist unless force_reset is True.
    """
    # 1. Verify database connection safety and server-side identity
    target_url = str(db.bind.url) if db.bind else ""
    verify_staging_target_safety(
        target_url,
        expected_db=expected_db,
        expected_host=expected_host,
        expected_role=expected_role,
        connection=db.connection()
    )

    # 2. Comprehensive 31-table pre-seed database hygiene check
    verify_database_hygiene(db)

    # 3. Check existing staging marker (Idempotency)
    existing_bureau = db.query(Bureau).filter(Bureau.code == "STG-RB").first()
    if existing_bureau and not force_reset:
        print("[Staging Seed] Synthetic staging records already exist. Skipping seed.")
        return

    print("[Staging Seed] Initializing synthetic staging dataset...")

    # Ensure complaint categories exist
    seed_staging_complaint_categories(db)

    # 2. Synthetic Bureaus
    stg_rb = Bureau(
        code="STG-RB",
        name="Regulation Bureau (Staging)",
        description="Synthetic Regulation Bureau for staging compliance validation",
        is_active=True
    )
    stg_pgrc = Bureau(
        code="STG-PGRC",
        name="Public Grievance Redressal Cell (Staging)",
        description="Synthetic Public Grievance Redressal Cell for staging complaint workflow tests",
        is_active=True
    )
    db.add_all([stg_rb, stg_pgrc])
    db.commit()
    db.refresh(stg_rb)
    db.refresh(stg_pgrc)

    # 3. Two Synthetic Institutions
    inst1 = Institution(
        permanent_id="STG-INST-001",
        official_name="Apex National Institute of Technology (Synthetic)",
        address="Plot 101, Knowledge Park V",
        city="Greater Noida",
        district="Gautam Buddha Nagar",
        state="Uttar Pradesh",
        region="Northern",
        pincode="201310",
        verification_status="Verified",
        institution_type="Engineering & Technology",
        email="contact@apex-staging.example.test",
        phone="+91-120-5550101",
        website="https://apex-staging.example.test"
    )
    inst2 = Institution(
        permanent_id="STG-INST-002",
        official_name="Beacon Institute of Engineering and Research (Synthetic)",
        address="Survey No 45, Tech Innovation Valley",
        city="Bengaluru",
        district="Bengaluru Urban",
        state="Karnataka",
        region="South-Western",
        pincode="560100",
        verification_status="Verified",
        institution_type="Engineering & Technology",
        email="info@beacon-staging.example.test",
        phone="+91-80-5550202",
        website="https://beacon-staging.example.test"
    )
    db.add_all([inst1, inst2])
    db.commit()
    db.refresh(inst1)
    db.refresh(inst2)

    # 4. Three Synthetic Officers
    test_officer_hash = hash_password("StagingTestPass2026!")
    officer_rb = User(
        username="staging_officer_rb",
        email="staging.officer1@example.test",
        full_name="Shri Ramesh Kumar (Staging Officer)",
        designation="Assistant Director (Staging RB)",
        hashed_password=test_officer_hash,
        role="authorized_officer",
        bureau_id=stg_rb.id,
        is_active=True
    )
    head_pgrc = User(
        username="staging_head_pgrc",
        email="staging.head@example.test",
        full_name="Dr. Meenakshi Sundaram (Staging Head)",
        designation="Adviser-II (Staging PGRC)",
        hashed_password=test_officer_hash,
        role="bureau_head",
        bureau_id=stg_pgrc.id,
        is_active=True
    )
    admin_user = User(
        username="staging_admin",
        email="staging.admin@example.test",
        full_name="Dr. Arvind Swaminathan (Staging Admin)",
        designation="Chief Regulatory Officer (Staging)",
        hashed_password=test_officer_hash,
        role="super_admin",
        bureau_id=stg_rb.id,
        is_active=True
    )
    db.add_all([officer_rb, head_pgrc, admin_user])
    db.commit()
    db.refresh(officer_rb)
    db.refresh(head_pgrc)
    db.refresh(admin_user)

    # 5. Two Synthetic Complainants
    comp1 = Complainant(
        full_name="Synthetic Student Alpha",
        email="staging.complainant1@example.test",
        mobile="9999900001",
        complainant_type="Student",
        hashed_password=hash_password("StagingStudent2026!"),
        is_active=True,
        is_email_verified=True,
        is_mobile_verified=True
    )
    comp2 = Complainant(
        full_name="Synthetic Faculty Beta",
        email="staging.complainant2@example.test",
        mobile="9999900002",
        complainant_type="Faculty",
        hashed_password=hash_password("StagingFaculty2026!"),
        is_active=True,
        is_email_verified=True,
        is_mobile_verified=True
    )
    db.add_all([comp1, comp2])
    db.commit()
    db.refresh(comp1)
    db.refresh(comp2)

    # 6. Four Synthetic Cases / Complaints
    now = datetime.utcnow()
    case1 = Case(
        id="STG-CASE-2026-0001",
        title="Synthetic Academic Curriculum Discrepancy Inquiry",
        category="ACADEMIC",
        subcategory="Curriculum Discrepancy",
        institution_id=inst1.id,
        current_bureau_id=stg_rb.id,
        complainant_id=comp1.id,
        status="Under Investigation",
        priority="Medium",
        date_received=now - timedelta(days=10),
        prescribed_deadline=now + timedelta(days=20),
        description="Investigation into syllabus discrepancies for synthetic staging test."
    )
    case2 = Case(
        id="STG-CASE-2026-0002",
        title="Synthetic Examination Grade Transparency Appeal",
        category="EXAMINATION",
        subcategory="Grade Transparency",
        institution_id=inst1.id,
        current_bureau_id=stg_pgrc.id,
        complainant_id=comp1.id,
        status="Pending Review",
        priority="High",
        date_received=now - timedelta(days=5),
        prescribed_deadline=now + timedelta(days=10),
        description="Student appeal regarding grade transparency with multi-file evidence attached."
    )
    case3 = Case(
        id="STG-CASE-2026-0003",
        title="Synthetic Fee Refund Delay Grievance",
        category="FEES_FINANCIAL",
        subcategory="Fee Refund",
        institution_id=inst2.id,
        current_bureau_id=stg_pgrc.id,
        complainant_id=comp2.id,
        status="Notice Issued",
        priority="High",
        date_received=now - timedelta(days=20),
        prescribed_deadline=now + timedelta(days=10),
        description="Faculty grievance regarding fee refund delay. Includes legacy filesystem fallback record."
    )
    case4 = Case(
        id="STG-CASE-2026-0004",
        title="Synthetic Laboratory Equipment Standard Audit",
        category="INFRASTRUCTURE",
        subcategory="Lab Standards",
        institution_id=inst2.id,
        current_bureau_id=stg_rb.id,
        complainant_id=comp2.id,
        status="Resolved",
        priority="Medium",
        date_received=now - timedelta(days=35),
        prescribed_deadline=now - timedelta(days=5),
        description="Inspection report on lab facilities. Backed by single PostgreSQL BYTEA document."
    )
    db.add_all([case1, case2, case3, case4])
    db.commit()

    # 7. Synthetic Documents & Binaries

    # Document A (Case 2 - Doc 1: Valid BYTEA PDF)
    pdf_bytes_1 = generate_synthetic_pdf("Grade_Sheet_Verification_STG_0002")
    pdf_sha_1 = hashlib.sha256(pdf_bytes_1).hexdigest()
    doc_meta_1 = DocumentMetadata(
        case_id=case2.id,
        file_name="stg_grade_sheet_evidence.pdf",
        original_filename="stg_grade_sheet_evidence.pdf",
        file_size=len(pdf_bytes_1),
        file_type="application/pdf",
        category="Evidence Document",
        access_classification="Public Grievance",
        uploaded_by_complainant_id=comp1.id,
        uploader_role="complainant",
        file_path="db://document_binaries/pending",
        upload_timestamp=now - timedelta(days=4)
    )
    db.add(doc_meta_1)
    db.commit()
    db.refresh(doc_meta_1)

    doc_meta_1.file_path = f"db://document_binaries/{doc_meta_1.id}"
    bin_1 = DocumentBinary(
        document_id=doc_meta_1.id,
        content=pdf_bytes_1,
        sha256_checksum=pdf_sha_1,
        file_size_bytes=len(pdf_bytes_1),
        created_at=now - timedelta(days=4)
    )
    db.add(bin_1)

    # Document B (Case 2 - Doc 2: Valid BYTEA PNG)
    png_bytes_2 = generate_synthetic_png("Representation_Letter_STG_0002")
    png_sha_2 = hashlib.sha256(png_bytes_2).hexdigest()
    doc_meta_2 = DocumentMetadata(
        case_id=case2.id,
        file_name="stg_representation_letter.png",
        original_filename="stg_representation_letter.png",
        file_size=len(png_bytes_2),
        file_type="image/png",
        category="Evidence Document",
        access_classification="Public Grievance",
        uploaded_by_complainant_id=comp1.id,
        uploader_role="complainant",
        file_path="db://document_binaries/pending",
        upload_timestamp=now - timedelta(days=4)
    )
    db.add(doc_meta_2)
    db.commit()
    db.refresh(doc_meta_2)

    doc_meta_2.file_path = f"db://document_binaries/{doc_meta_2.id}"
    bin_2 = DocumentBinary(
        document_id=doc_meta_2.id,
        content=png_bytes_2,
        sha256_checksum=png_sha_2,
        file_size_bytes=len(png_bytes_2),
        created_at=now - timedelta(days=4)
    )
    db.add(bin_2)

    # Document C (Case 3: Legacy Filesystem Record - NO row in document_binaries)
    # Designed specifically to test filesystem fallback in retrieve_document_payload
    doc_meta_legacy = DocumentMetadata(
        case_id=case3.id,
        file_name="stg_legacy_fee_receipt.pdf",
        original_filename="stg_legacy_fee_receipt.pdf",
        file_size=1500,
        file_type="application/pdf",
        category="Official Notice",
        access_classification="Official Internal",
        uploaded_by_id=officer_rb.id,
        uploader_role="officer",
        file_path="complaints/STG-CASE-2026-0003/stg_legacy_fee_receipt.pdf",
        upload_timestamp=now - timedelta(days=19)
    )
    db.add(doc_meta_legacy)

    # Document D (Case 4: Single BYTEA Document - Officer uploaded)
    pdf_bytes_4 = generate_synthetic_pdf("Lab_Standard_Report_STG_0004")
    pdf_sha_4 = hashlib.sha256(pdf_bytes_4).hexdigest()
    doc_meta_4 = DocumentMetadata(
        case_id=case4.id,
        file_name="stg_lab_compliance_report.pdf",
        original_filename="stg_lab_compliance_report.pdf",
        file_size=len(pdf_bytes_4),
        file_type="application/pdf",
        category="Inspection Report",
        access_classification="Official Internal",
        uploaded_by_id=officer_rb.id,
        uploader_role="officer",
        file_path="db://document_binaries/pending",
        upload_timestamp=now - timedelta(days=34)
    )
    db.add(doc_meta_4)
    db.commit()
    db.refresh(doc_meta_4)

    doc_meta_4.file_path = f"db://document_binaries/{doc_meta_4.id}"
    bin_4 = DocumentBinary(
        document_id=doc_meta_4.id,
        content=pdf_bytes_4,
        sha256_checksum=pdf_sha_4,
        file_size_bytes=len(pdf_bytes_4),
        created_at=now - timedelta(days=34)
    )
    db.add(bin_4)
    db.commit()

    # 8. Synthetic Compliance & Corrective Action Plan (CAP)
    req = RegulatoryRequirement(
        id="AICTE-STG-REQ-01",
        title="Synthetic Student Grievance Committee Mandate",
        description="Mandatory constitution of SGRC at technical institutions.",
        category_code="GOVERNANCE",
        regulatory_source="AICTE Regulations 2026",
        applicable_institution_types=["Engineering & Technology"],
        weight=1.0,
        responsible_bureau_id=stg_rb.id,
        version="1.0",
        is_active=True
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    assess = ComplianceAssessment(
        institution_id=inst1.id,
        requirement_id=req.id,
        requirement_version="1.0",
        assessment_period="2026-Q1",
        status="Non-Compliant",
        score_contribution=45.0,
        reviewer_id=officer_rb.id,
        reviewer_remarks="Synthetic audit observation: incomplete ombudsman documentation."
    )
    db.add(assess)
    db.commit()
    db.refresh(assess)

    cap = CorrectiveActionPlan(
        institution_id=inst1.id,
        assessment_id=assess.id,
        related_case_id=case1.id,
        title="Establish Functional Ombudsman Mechanism",
        identified_gap="Absence of formally notified ombudsman in institution portal.",
        required_action="Synthetic remediation: appoint neutral ombudsman.",
        responsible_bureau_id=stg_rb.id,
        assigned_officer_id=officer_rb.id,
        priority="High",
        status="Pending Verification",
        prescribed_deadline=now + timedelta(days=30)
    )
    db.add(cap)
    db.commit()

    print("[Staging Seed] Synthetic staging dataset created successfully.")
    print(f"  Institutions: 2 (Permanent IDs: STG-INST-001, STG-INST-002)")
    print(f"  Bureaus: 2 (Codes: STG-RB, STG-PGRC)")
    print(f"  Officers: 3 (staging.officer1@example.test, staging.head@example.test, staging.admin@example.test)")
    print(f"  Complainants: 2 (staging.complainant1@example.test, staging.complainant2@example.test)")
    print(f"  Cases: 4 (STG-CASE-2026-0001 through STG-CASE-2026-0004)")
    print(f"  BYTEA Documents: 3 | Legacy Filesystem Documents: 1")
    print(f"  Compliance Requirements: 1 | Assessments: 1 | CAPs: 1")


if __name__ == "__main__":
    import argparse
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    parser = argparse.ArgumentParser(description="NyayaNiti Synthetic Staging Data Generator")
    parser.add_argument("--confirm-staging", action="store_true", help="Explicit confirmation to seed staging database")
    parser.add_argument("--db-url", type=str, default=None, help="Explicit staging DATABASE_URL")
    parser.add_argument("--expected-db", type=str, default=None, help="Expected staging database name")
    parser.add_argument("--expected-host", type=str, default=None, help="Expected staging database hostname")
    parser.add_argument("--expected-role", type=str, default=None, help="Expected staging database user role")
    parser.add_argument("--force-reset", action="store_true", help="Force wipe existing staging records and re-seed")
    args, _ = parser.parse_known_args()

    # Never silently default to local development (nyayaniti.db) or implicit production DATABASE_URL
    explicit_url = args.db_url or os.getenv("STAGING_DATABASE_URL")
    if not explicit_url:
        print(
            "FATAL SAFETY ABORT: No explicit staging database connection source provided.\n"
            "Refusing to default to local development (nyayaniti.db) or implicit DATABASE_URL.\n"
            "Specify target via '--db-url <URL>' or 'STAGING_DATABASE_URL' environment variable.",
            file=sys.stderr
        )
        sys.exit(1)

    exp_db = args.expected_db or os.getenv("EXPECTED_STAGING_DB")
    exp_host = args.expected_host or os.getenv("EXPECTED_STAGING_HOST")
    exp_role = args.expected_role or os.getenv("EXPECTED_STAGING_ROLE")

    try:
        verify_staging_target_safety(
            explicit_url,
            expected_db=exp_db,
            expected_host=exp_host,
            expected_role=exp_role
        )
    except Exception as e:
        clean_err = re.sub(r"://[^@]+@", "://***:***@", str(e))
        clean_err = re.sub(r"password=[^\s;&]+", "password=***", clean_err)
        print(f"[Safety Gate Violation] {clean_err}", file=sys.stderr)
        sys.exit(1)

    try:
        target_engine = create_engine(explicit_url)
        TargetSession = sessionmaker(bind=target_engine)
        db = TargetSession()
        try:
            seed_staging_synthetic_data(
                db,
                force_reset=args.force_reset,
                expected_db=exp_db,
                expected_host=exp_host,
                expected_role=exp_role
            )
        finally:
            db.close()
            target_engine.dispose()
    except Exception as e:
        clean_err = re.sub(r"://[^@]+@", "://***:***@", str(e))
        clean_err = re.sub(r"password=[^\s;&]+", "password=***", clean_err)
        print(f"[Staging Seed Execution Error] {clean_err}", file=sys.stderr)
        sys.exit(1)

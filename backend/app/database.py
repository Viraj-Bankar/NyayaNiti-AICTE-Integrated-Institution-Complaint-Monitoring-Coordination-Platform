import os
from sqlalchemy import create_engine, event, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Normalize sqlite relative paths and postgres URL schemes for Render/Neon deployment
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rel_path = db_url.replace("sqlite:///./", "")
    abs_path = os.path.join(base_dir, rel_path).replace("\\", "/")
    db_url = f"sqlite:///{abs_path}"
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

# For SQLite, enable check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

# Enable foreign key support in SQLite
if "sqlite" in db_url:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_schema():
    if not settings.AUTO_MIGRATE:
        return
    import app.models.models  # noqa: F401 - ensure all declarative models are registered on Base
    Base.metadata.create_all(bind=engine)
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        with engine.connect() as conn:
            # 1. Cases table enhancements
            if "cases" in tables:
                case_cols = [c["name"] for c in inspector.get_columns("cases")]
                if "complainant_id" not in case_cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN complainant_id INTEGER REFERENCES complainants(id)"))
                if "title" not in case_cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN title VARCHAR(250)"))

            # 2. CaseEvents table enhancements
            if "case_events" in tables:
                event_cols = [c["name"] for c in inspector.get_columns("case_events")]
                if "is_public" not in event_cols:
                    conn.execute(text("ALTER TABLE case_events ADD COLUMN is_public BOOLEAN DEFAULT TRUE"))

            # 3. DocumentMetadata table enhancements
            if "document_metadata" in tables:
                doc_col_objs = {c["name"]: c for c in inspector.get_columns("document_metadata")}
                # If uploaded_by_id is NOT NULL, relax it for complainant evidence
                if "uploaded_by_id" in doc_col_objs and not doc_col_objs["uploaded_by_id"].get("nullable", True):
                    if "sqlite" in db_url:
                        conn.execute(text("PRAGMA foreign_keys=OFF;"))
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS document_metadata_v2 (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                case_id VARCHAR(100) NOT NULL REFERENCES cases(id),
                                file_name VARCHAR(255) NOT NULL,
                                original_filename VARCHAR(255),
                                file_size INTEGER NOT NULL,
                                file_type VARCHAR(50) NOT NULL,
                                category VARCHAR(100) DEFAULT 'Official Notice',
                                access_classification VARCHAR(50) DEFAULT 'Official Internal',
                                uploaded_by_id INTEGER REFERENCES users(id),
                                uploaded_by_complainant_id INTEGER REFERENCES complainants(id),
                                uploader_role VARCHAR(50) DEFAULT 'officer',
                                file_path VARCHAR(500) NOT NULL,
                                upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                        """))
                        conn.execute(text("""
                            INSERT INTO document_metadata_v2 (
                                id, case_id, file_name, original_filename, file_size, file_type, category,
                                access_classification, uploaded_by_id, uploaded_by_complainant_id, uploader_role, file_path, upload_timestamp
                            )
                            SELECT
                                id, case_id, file_name, file_name, file_size, file_type, category,
                                access_classification, uploaded_by_id, NULL, 'officer', file_path, upload_timestamp
                            FROM document_metadata;
                        """))
                        conn.execute(text("DROP TABLE document_metadata;"))
                        conn.execute(text("ALTER TABLE document_metadata_v2 RENAME TO document_metadata;"))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_document_metadata_case_id ON document_metadata (case_id);"))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_document_metadata_id ON document_metadata (id);"))
                        conn.execute(text("PRAGMA foreign_keys=ON;"))
                    else:
                        conn.execute(text("ALTER TABLE document_metadata ALTER COLUMN uploaded_by_id DROP NOT NULL;"))

                # Ensure all required columns exist (for both SQLite and PostgreSQL)
                doc_cols = [c["name"] for c in inspector.get_columns("document_metadata")]
                if "uploaded_by_complainant_id" not in doc_cols:
                    conn.execute(text("ALTER TABLE document_metadata ADD COLUMN uploaded_by_complainant_id INTEGER REFERENCES complainants(id)"))
                if "uploader_role" not in doc_cols:
                    conn.execute(text("ALTER TABLE document_metadata ADD COLUMN uploader_role VARCHAR(50) DEFAULT 'officer'"))
                if "original_filename" not in doc_cols:
                    conn.execute(text("ALTER TABLE document_metadata ADD COLUMN original_filename VARCHAR(255)"))

            # 4. Notifications table enhancements
            if "notifications" in tables:
                notif_cols = [c["name"] for c in inspector.get_columns("notifications")]
                if "complainant_id" not in notif_cols:
                    conn.execute(text("ALTER TABLE notifications ADD COLUMN complainant_id INTEGER REFERENCES complainants(id)"))

            # 5. CoordinationTasks table enhancements
            if "coordination_tasks" in tables:
                task_cols = [c["name"] for c in inspector.get_columns("coordination_tasks")]
                if "depends_on_task_id" not in task_cols:
                    conn.execute(text("ALTER TABLE coordination_tasks ADD COLUMN depends_on_task_id INTEGER REFERENCES coordination_tasks(id)"))
                if "evidence_doc_id" not in task_cols:
                    conn.execute(text("ALTER TABLE coordination_tasks ADD COLUMN evidence_doc_id INTEGER REFERENCES document_metadata(id)"))

            # 6. ActionConflictAlerts table enhancements
            if "action_conflict_alerts" in tables:
                conflict_cols = [c["name"] for c in inspector.get_columns("action_conflict_alerts")]
                if "coordination_workspace_id" not in conflict_cols:
                    conn.execute(text("ALTER TABLE action_conflict_alerts ADD COLUMN coordination_workspace_id INTEGER REFERENCES coordination_workspaces(id)"))

            # 7. Phase 8: Compliance & Governance Table Verification
            # Safe creation of indexes for fast multi-dimensional lookups
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comp_assess_inst_req_period ON compliance_assessments (institution_id, requirement_id, assessment_period);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cap_inst_status_deadline ON corrective_action_plans (institution_id, status, prescribed_deadline);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_risk_ind_inst_severity ON institutional_risk_indicators (institution_id, severity, status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comp_snap_inst_period ON compliance_score_snapshots (institution_id, assessment_period);"))

            # 8. Zero-Cost Document Binaries Table Verification (PostgreSQL BYTEA / SQLite LargeBinary)
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_document_binaries_document_id ON document_binaries (document_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_document_binaries_created_at ON document_binaries (created_at);"))

            conn.commit()
    except Exception as e:
        print(f"Schema verification note: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


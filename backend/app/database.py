import os
from sqlalchemy import create_engine, event, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Normalize sqlite relative paths to backend directory so tests and commands work from any directory
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rel_path = db_url.replace("sqlite:///./", "")
    abs_path = os.path.join(base_dir, rel_path).replace("\\", "/")
    db_url = f"sqlite:///{abs_path}"

# For SQLite, enable check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

# Enable foreign key support in SQLite
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_schema():
    Base.metadata.create_all(bind=engine)
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if "cases" in tables:
            columns = [c["name"] for c in inspector.get_columns("cases")]
            if "complainant_id" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN complainant_id INTEGER REFERENCES complainants(id)"))
                    conn.commit()
    except Exception as e:
        print(f"Schema verification note: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


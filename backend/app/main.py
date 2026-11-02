from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal, ensure_schema, ensure_schema
from app.api import (
    auth, institutions, cases, overlaps, action_conflicts,
    coordination, dashboard, surges, reports, notifications,
    audit, documents, settings as admin_settings,
    complainant_auth, complainant_cases
)
from app.seed_data import seed_database

# Ensure database tables and schema columns
ensure_schema()

app = FastAPI(
    title="NyayaNiti — AICTE Integrated Institution Complaint Monitoring & Coordination Platform",
    description="Centralized administrative case-monitoring and cross-bureau coordination system for AICTE Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Startup event to ensure schema migrations and seed database if empty
@app.on_event("startup")
def on_startup():
    ensure_schema()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

# Include routers - Internal Operational & Officer
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(cases.router, prefix=settings.API_V1_PREFIX)
app.include_router(institutions.router, prefix=settings.API_V1_PREFIX)
app.include_router(overlaps.router, prefix=settings.API_V1_PREFIX)
app.include_router(action_conflicts.router, prefix=settings.API_V1_PREFIX)
app.include_router(coordination.router, prefix=settings.API_V1_PREFIX)
app.include_router(surges.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX)
app.include_router(documents.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_settings.router, prefix=settings.API_V1_PREFIX)

# Include routers - Citizen & Complainant Space
app.include_router(complainant_auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(complainant_cases.complaints_router, prefix=settings.API_V1_PREFIX)
app.include_router(complainant_cases.router, prefix=settings.API_V1_PREFIX)
app.include_router(complainant_cases.notification_router, prefix=settings.API_V1_PREFIX)
app.include_router(complainant_cases.citizen_directory_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "portal": "NyayaNiti — AICTE Integrated Complaint Monitoring & Coordination Platform",
        "authority": "All India Council for Technical Education (AICTE)",
        "status": "Operational",
        "documentation": "/docs",
        "api_prefix": settings.API_V1_PREFIX
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "nyayaniti-backend"}

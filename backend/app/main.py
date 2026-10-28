from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import (
    auth, institutions, cases, overlaps, action_conflicts,
    coordination, dashboard, surges, reports, notifications,
    audit, documents, settings as admin_settings
)
from app.seed_data import seed_database

# Create tables
Base.metadata.create_all(bind=engine)

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
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Startup event to seed database if empty
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

# Include routers
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

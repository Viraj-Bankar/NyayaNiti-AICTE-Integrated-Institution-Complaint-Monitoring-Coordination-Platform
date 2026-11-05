from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.models import Case, OverlapAlert, CoordinationWorkspace, CaseCoordinationLink, Institution, Bureau, User

# Bureau Jurisdictional Scope Mapping
BUREAU_JURISDICTION_DOMAINS = {
    "RB": ["Faculty Irregularity", "Infrastructure Norms", "Affiliation Non-Compliance", "Intake Verification", "Campus Audit"],
    "PGRC": ["Fee Overcharging", "Harassment", "Ragging", "Withholding Certificates", "Student Welfare", "Grievance Redressal"],
    "APPROVAL": ["Unapproved Course", "Extension of Approval", "Land and Building Deficiency", "Closure of Course", "Unauthorized Specialization"],
    "POLICY": ["Reservation Roster Violation", "National Directives", "Statutory Interpretation", "Fee Structure Policy"]
}

# Related regulatory domains between bureaus
CROSS_BUREAU_OVERLAP_PAIRS = [
    ({"Fee Overcharging", "Withholding Certificates"}, {"Unapproved Course", "Land and Building Deficiency"}, "Financial irregularities intersecting with unapproved academic expansion"),
    ({"Faculty Irregularity"}, {"Extension of Approval", "Unapproved Course"}, "Cadre ratio deficiencies directly impacting academic approval eligibility"),
    ({"Harassment", "Ragging"}, {"Infrastructure Norms"}, "Campus safety and student protection intersecting with regulatory campus norms")
]

def classify_responsibility_relationship(
    case_a: Case,
    case_b: Case,
    db: Session,
    links_cache: Optional[Dict[str, int]] = None
) -> Dict[str, Any]:
    """
    Deterministically evaluates institutional responsibility and bureau jurisdiction.
    Does NOT rely solely on text similarity.
    """
    if case_a.id == case_b.id or case_a.institution_id != case_b.institution_id:
        return {"relationship": "UNRELATED", "overlap_detected": False}
        
    bureau_a_code = case_a.current_bureau.code if case_a.current_bureau else "N/A"
    bureau_b_code = case_b.current_bureau.code if case_b.current_bureau else "N/A"
    is_cross_bureau = (case_a.current_bureau_id != case_b.current_bureau_id)
    
    # Check existing coordination workspace links
    if links_cache is not None:
        ws_a = links_cache.get(case_a.id)
        ws_b = links_cache.get(case_b.id)
    else:
        link_a = db.query(CaseCoordinationLink).filter(CaseCoordinationLink.case_id == case_a.id).first()
        link_b = db.query(CaseCoordinationLink).filter(CaseCoordinationLink.case_id == case_b.id).first()
        ws_a = link_a.workspace_id if link_a else None
        ws_b = link_b.workspace_id if link_b else None
    
    shared_workspace_id = ws_a if (ws_a and ws_a == ws_b) else None
        
    # Check for Duplicate Assignment (Same category, identical complainant or same bureau/officer assignment mistake)
    is_same_category = (case_a.category.lower() == case_b.category.lower())
    is_same_complainant = bool(case_a.complainant_id and case_a.complainant_id == case_b.complainant_id)
    
    if is_same_category and is_same_complainant:
        return {
            "relationship": "DUPLICATE_ASSIGNMENT",
            "overlap_detected": True,
            "severity": "High",
            "rationale": "Identical complaint category and identical complainant submitted across multiple tracking numbers.",
            "recommendation": "Consolidate duplicate filings under primary case record.",
            "is_cross_bureau": is_cross_bureau,
            "shared_workspace_id": shared_workspace_id
        }
        
    if shared_workspace_id:
        return {
            "relationship": "LEGITIMATE_JOINT_INVESTIGATION",
            "overlap_detected": True,
            "severity": "Medium",
            "rationale": f"Both cases are already actively coordinated under Joint Workspace #{shared_workspace_id}.",
            "recommendation": "Proceed with joint investigation tasks in existing workspace.",
            "is_cross_bureau": is_cross_bureau,
            "shared_workspace_id": shared_workspace_id
        }
        
    # Check Cross-Bureau Statutory Overlap
    if is_cross_bureau:
        # Check domain intersection
        rationale_found = None
        for set_x, set_y, explanation in CROSS_BUREAU_OVERLAP_PAIRS:
            if (case_a.category in set_x and case_b.category in set_y) or \
               (case_b.category in set_x and case_a.category in set_y):
                rationale_found = explanation
                break
                
        if rationale_found or is_same_category:
            return {
                "relationship": "GENUINE_RESPONSIBILITY_OVERLAP",
                "overlap_detected": True,
                "severity": "High" if rationale_found else "Medium",
                "rationale": rationale_found or f"Multiple bureaus ({bureau_a_code} & {bureau_b_code}) independently addressing allegations in category '{case_a.category}' for the same institution.",
                "recommendation": "Initiate or link to a Cross-Bureau Coordination Workspace to synchronize official findings.",
                "is_cross_bureau": True,
                "shared_workspace_id": None
            }
            
    # Default to related but independent complaints
    return {
        "relationship": "RELATED_INDEPENDENT",
        "overlap_detected": False,
        "severity": "Low",
        "rationale": "Complaints concern the same institution but relate to independent departmental matters.",
        "recommendation": "Maintain distinct case records with cross-referencing.",
        "is_cross_bureau": is_cross_bureau,
        "shared_workspace_id": None
    }

def detect_responsibility_overlaps_for_case(db: Session, case_id: str) -> List[OverlapAlert]:
    """
    Evaluates responsibility overlaps for a specific case against all active cases for the institution.
    """
    target = db.query(Case).filter(Case.id == case_id).first()
    if not target:
        return []
        
    other_cases = db.query(Case).filter(
        Case.institution_id == target.institution_id,
        Case.id != target.id,
        Case.status != "Disposed"
    ).all()
    
    new_alerts = []
    for other in other_cases:
        rel = classify_responsibility_relationship(target, other, db)
        if not rel["overlap_detected"]:
            continue
            
        existing = db.query(OverlapAlert).filter(
            or_(
                and_(OverlapAlert.case_a_id == target.id, OverlapAlert.case_b_id == other.id),
                and_(OverlapAlert.case_a_id == other.id, OverlapAlert.case_b_id == target.id)
            ),
            OverlapAlert.review_status.in_(["New", "Under Review", "Confirmed Related"])
        ).first()
        
        if existing:
            continue
            
        alert = OverlapAlert(
            case_a_id=target.id,
            case_b_id=other.id,
            institution_id=target.institution_id,
            similarity_score=0.90 if rel["relationship"] == "DUPLICATE_ASSIGNMENT" else 0.75,
            model_name="Deterministic Responsibility & Jurisdiction Engine",
            evidence_summary={
                "relationship": rel["relationship"],
                "rationale": rel["rationale"],
                "recommendation": rel["recommendation"],
                "case_a_bureau": target.current_bureau.code if target.current_bureau else "N/A",
                "case_b_bureau": other.current_bureau.code if other.current_bureau else "N/A",
                "is_cross_bureau": rel["is_cross_bureau"],
                "shared_workspace_id": rel.get("shared_workspace_id")
            },
            review_status="New"
        )
        db.add(alert)
        new_alerts.append(alert)
        
    if new_alerts:
        db.commit()
        for a in new_alerts:
            db.refresh(a)
            
    return new_alerts

def scan_all_responsibility_overlaps(db: Session) -> Dict[str, Any]:
    """
    Scans all active cases across all institutions for deterministic responsibility overlaps.
    Optimized with set-based prefetching for high-throughput scanning.
    """
    # 1. Preload existing overlap alerts into set for O(1) deduplication
    existing_rows = db.query(
        OverlapAlert.case_a_id,
        OverlapAlert.case_b_id
    ).filter(
        OverlapAlert.review_status.in_(["New", "Under Review", "Confirmed Related"])
    ).all()
    
    existing_keys = set()
    for row in existing_rows:
        existing_keys.add((row[0], row[1]))
        existing_keys.add((row[1], row[0]))

    # 2. Preload case coordination links cache
    link_rows = db.query(CaseCoordinationLink.case_id, CaseCoordinationLink.workspace_id).all()
    links_cache = {row[0]: row[1] for row in link_rows}

    institutions = db.query(Institution).all()
    pairs_evaluated = 0
    new_alerts_count = 0
    
    for inst in institutions:
        cases = db.query(Case).filter(
            Case.institution_id == inst.id,
            Case.status != "Disposed"
        ).all()
        
        n = len(cases)
        for i in range(n):
            for j in range(i + 1, n):
                pairs_evaluated += 1
                c_a, c_b = cases[i], cases[j]
                rel = classify_responsibility_relationship(c_a, c_b, db, links_cache=links_cache)
                if not rel["overlap_detected"]:
                    continue
                    
                if (c_a.id, c_b.id) in existing_keys:
                    continue
                    
                existing_keys.add((c_a.id, c_b.id))
                existing_keys.add((c_b.id, c_a.id))
                
                alert = OverlapAlert(
                    case_a_id=c_a.id,
                    case_b_id=c_b.id,
                    institution_id=inst.id,
                    similarity_score=0.90 if rel["relationship"] == "DUPLICATE_ASSIGNMENT" else 0.75,
                    model_name="Deterministic Responsibility & Jurisdiction Engine",
                    evidence_summary={
                        "relationship": rel["relationship"],
                        "rationale": rel["rationale"],
                        "recommendation": rel["recommendation"],
                        "case_a_bureau": c_a.current_bureau.code if c_a.current_bureau else "N/A",
                        "case_b_bureau": c_b.current_bureau.code if c_b.current_bureau else "N/A",
                        "is_cross_bureau": rel["is_cross_bureau"]
                    },
                    review_status="New"
                )
                db.add(alert)
                new_alerts_count += 1
                
    if new_alerts_count > 0:
        db.commit()
        
    return {
        "pairs_evaluated": pairs_evaluated,
        "new_overlaps_detected": new_alerts_count
    }


from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.models import Case, ActionConflictAlert, Bureau, Institution
from app.services.escalation_service import create_deduplicated_notification

# Comprehensive statutory conflict rules with categories and severities
CONFLICT_RULES = [
    {
        "id": "RULE_CONTRADICTORY_ORDERS",
        "name": "Contradictory Regulatory Directive",
        "type": "Conflicting Direction",
        "severity": "Critical",
        "keywords_a": ["closure", "complied", "clean chit", "disposed", "no action required", "extension granted", "approved"],
        "keywords_b": ["show cause", "inspection", "penalty", "deficiency", "punitive", "withdrawn", "revocation", "suspension"],
        "description": "One bureau recorded a compliance, approval, or case closure, while another bureau concurrently ordered punitive action, inspection, show cause, or revocation for the same institution."
    },
    {
        "id": "RULE_DUPLICATE_INSPECTION",
        "name": "Duplicate Surprise/Expert Inspection",
        "type": "Duplicate Action",
        "severity": "High",
        "keywords_a": ["physical inspection", "expert visit", "committee visit", "on-site inspection", "surprise inspection"],
        "keywords_b": ["physical inspection", "expert visit", "committee visit", "on-site inspection", "surprise inspection"],
        "description": "Multiple bureaus have independently ordered physical expert committee visits within overlapping periods, causing administrative duplication."
    },
    {
        "id": "RULE_STATUS_MISMATCH",
        "name": "Severe Status Inconsistency",
        "type": "Inconsistent Status",
        "severity": "High",
        "description": "Cases for the same institution exhibit opposing statuses (e.g. one marked Disposed while another is marked Escalated or Under Process on related allegations)."
    },
    {
        "id": "RULE_CONCURRENT_HEARING",
        "name": "Conflicting Hearing Schedule",
        "type": "Conflicting Assignment",
        "severity": "Medium",
        "keywords_a": ["hearing scheduled", "personal hearing", "standing hearing committee"],
        "keywords_b": ["hearing scheduled", "personal hearing", "standing hearing committee"],
        "description": "Separate hearing dates scheduled without inter-bureau coordination."
    },
    {
        "id": "RULE_INCOMPATIBLE_DEADLINES",
        "name": "Incompatible Regulatory Deadlines",
        "type": "Conflicting Deadline",
        "severity": "Medium",
        "description": "Bureaus have set conflicting statutory deadlines (e.g., immediate 7-day show-cause response deadline colliding with an extended 30-day inquiry deadline)."
    },
    {
        "id": "RULE_REDUNDANT_ACTION",
        "name": "Redundant Inquiry Action",
        "type": "Redundant Action",
        "severity": "Medium",
        "keywords_a": ["inquiry committee", "fact finding", "document verification", "affidavit submission"],
        "keywords_b": ["inquiry committee", "fact finding", "document verification", "affidavit submission"],
        "description": "Independent parallel document verifications or preliminary inquiries initiated for identical allegations within the same month."
    }
]

def check_action_conflict(case_a: Case, case_b: Case) -> Optional[Dict[str, Any]]:
    """
    Evaluates whether two cases involving the same verified institution
    have conflicting or duplicate official actions.
    """
    if case_a.id == case_b.id or case_a.institution_id != case_b.institution_id:
        return None
        
    action_a = (case_a.last_action or "").lower()
    action_b = (case_b.last_action or "").lower()
    
    # 1. Check Contradictory Regulatory Directives
    rule_contra = CONFLICT_RULES[0]
    is_a_lenient = any(k in action_a for k in rule_contra["keywords_a"])
    is_b_punitive = any(k in action_b for k in rule_contra["keywords_b"])
    is_b_lenient = any(k in action_b for k in rule_contra["keywords_a"])
    is_a_punitive = any(k in action_a for k in rule_contra["keywords_b"])
    
    if (is_a_lenient and is_b_punitive) or (is_b_lenient and is_a_punitive):
        return {
            "conflict_type": rule_contra["type"],
            "rule_triggered": rule_contra["name"],
            "severity": rule_contra["severity"],
            "evidence": {
                "rule_id": rule_contra["id"],
                "explanation": rule_contra["description"],
                "case_a_bureau": case_a.current_bureau.code if case_a.current_bureau else "N/A",
                "case_a_action": case_a.last_action,
                "case_b_bureau": case_b.current_bureau.code if case_b.current_bureau else "N/A",
                "case_b_action": case_b.last_action,
                "reconciliation_advice": "Convene joint Standing Coordination meeting to harmonize official stance."
            }
        }
        
    # 2. Check Duplicate Inspection Orders
    rule_dup = CONFLICT_RULES[1]
    is_a_inspect = any(k in action_a for k in rule_dup["keywords_a"])
    is_b_inspect = any(k in action_b for k in rule_dup["keywords_b"])
    if is_a_inspect and is_b_inspect and case_a.current_bureau_id != case_b.current_bureau_id:
        return {
            "conflict_type": rule_dup["type"],
            "rule_triggered": rule_dup["name"],
            "severity": rule_dup["severity"],
            "evidence": {
                "rule_id": rule_dup["id"],
                "explanation": rule_dup["description"],
                "case_a_action": case_a.last_action,
                "case_b_action": case_b.last_action,
                "reconciliation_advice": "Merge independent inspection orders into a single joint AICTE inspection team."
            }
        }
        
    # 3. Check severe status inconsistency
    if (case_a.status == "Disposed" and case_b.status in ["Escalated", "Under Process"]) or \
       (case_b.status == "Disposed" and case_a.status in ["Escalated", "Under Process"]):
        rule_status = CONFLICT_RULES[2]
        return {
            "conflict_type": rule_status["type"],
            "rule_triggered": rule_status["name"],
            "severity": rule_status["severity"],
            "evidence": {
                "rule_id": rule_status["id"],
                "explanation": rule_status["description"],
                "case_a_status": case_a.status,
                "case_b_status": case_b.status,
                "case_a_bureau": case_a.current_bureau.code if case_a.current_bureau else "N/A",
                "case_b_bureau": case_b.current_bureau.code if case_b.current_bureau else "N/A",
                "reconciliation_advice": "Verify whether prior disposal accounted for active ongoing proceedings."
            }
        }

    # 4. Check Conflicting Hearing Schedules
    rule_hearing = CONFLICT_RULES[3]
    is_a_hearing = any(k in action_a for k in rule_hearing["keywords_a"])
    is_b_hearing = any(k in action_b for k in rule_hearing["keywords_b"])
    if is_a_hearing and is_b_hearing and case_a.current_bureau_id != case_b.current_bureau_id:
        return {
            "conflict_type": rule_hearing["type"],
            "rule_triggered": rule_hearing["name"],
            "severity": rule_hearing["severity"],
            "evidence": {
                "rule_id": rule_hearing["id"],
                "explanation": rule_hearing["description"],
                "case_a_action": case_a.last_action,
                "case_b_action": case_b.last_action,
                "reconciliation_advice": "Consolidate separate hearings into a single joint hearing committee."
            }
        }

    # 5. Check Incompatible Deadlines
    if case_a.prescribed_deadline and case_b.prescribed_deadline and case_a.current_bureau_id != case_b.current_bureau_id:
        deadline_diff = abs((case_a.prescribed_deadline - case_b.prescribed_deadline).days)
        # One urgent (< 7 days) and one distant (> 21 days) on active non-disposed cases
        if deadline_diff >= 14 and case_a.status != "Disposed" and case_b.status != "Disposed":
            rule_dl = CONFLICT_RULES[4]
            return {
                "conflict_type": rule_dl["type"],
                "rule_triggered": rule_dl["name"],
                "severity": rule_dl["severity"],
                "evidence": {
                    "rule_id": rule_dl["id"],
                    "explanation": f"Case A deadline ({case_a.prescribed_deadline.strftime('%Y-%m-%d')}) diverges by {deadline_diff} days from Case B deadline ({case_b.prescribed_deadline.strftime('%Y-%m-%d')}).",
                    "case_a_deadline": case_a.prescribed_deadline.isoformat(),
                    "case_b_deadline": case_b.prescribed_deadline.isoformat(),
                    "reconciliation_advice": "Synchronize institutional compliance schedules across bureaus."
                }
            }

    # 6. Check Redundant Inquiries
    rule_red = CONFLICT_RULES[5]
    is_a_red = any(k in action_a for k in rule_red["keywords_a"])
    is_b_red = any(k in action_b for k in rule_red["keywords_b"])
    if is_a_red and is_b_red and case_a.current_bureau_id != case_b.current_bureau_id:
        return {
            "conflict_type": rule_red["type"],
            "rule_triggered": rule_red["name"],
            "severity": rule_red["severity"],
            "evidence": {
                "rule_id": rule_red["id"],
                "explanation": rule_red["description"],
                "case_a_action": case_a.last_action,
                "case_b_action": case_b.last_action,
                "reconciliation_advice": "Share preliminary inquiry findings between bureaus to avoid duplication."
            }
        }
        
    return None

def detect_action_conflicts_for_case(db: Session, case_id: str) -> List[ActionConflictAlert]:
    """
    Evaluates action conflicts for a specific case against all other active cases
    for the same institution. Deduplicates before inserting.
    """
    target_case = db.query(Case).filter(Case.id == case_id).first()
    if not target_case:
        return []
        
    other_cases = db.query(Case).filter(
        Case.institution_id == target_case.institution_id,
        Case.id != target_case.id,
        Case.status != "Disposed"
    ).all()
    
    new_alerts = []
    for other in other_cases:
        conflict_res = check_action_conflict(target_case, other)
        if not conflict_res:
            continue
            
        # Check if an existing alert already covers this pair
        existing = db.query(ActionConflictAlert).filter(
            or_(
                and_(ActionConflictAlert.case_a_id == target_case.id, ActionConflictAlert.case_b_id == other.id),
                and_(ActionConflictAlert.case_a_id == other.id, ActionConflictAlert.case_b_id == target_case.id)
            ),
            ActionConflictAlert.rule_triggered == conflict_res["rule_triggered"],
            ActionConflictAlert.status.in_(["Pending Review", "Confirmed Conflict"])
        ).first()
        
        if existing:
            continue
            
        alert = ActionConflictAlert(
            case_a_id=target_case.id,
            case_b_id=other.id,
            institution_id=target_case.institution_id,
            conflict_type=conflict_res["conflict_type"],
            rule_triggered=conflict_res["rule_triggered"],
            severity=conflict_res["severity"],
            evidence=conflict_res["evidence"],
            status="Pending Review"
        )
        db.add(alert)
        new_alerts.append(alert)
        
        # Dispatch notification to assigned officers
        for rec_id in set(filter(None, [target_case.assigned_officer_id, other.assigned_officer_id])):
            create_deduplicated_notification(
                db=db,
                recipient_id=rec_id,
                notification_type="ACTION_CONFLICT",
                title=f"Action Conflict Detected: {target_case.id} vs {other.id}",
                message=f"Conflict rule '{conflict_res['rule_triggered']}' ({conflict_res['severity']}) detected between {target_case.id} and {other.id}.",
                severity=conflict_res["severity"],
                related_entity_type="ActionConflictAlert",
                related_entity_id=str(alert.id),
                link_url="/action-conflicts"
            )
        
    if new_alerts:
        db.commit()
        for a in new_alerts:
            db.refresh(a)
            
    return new_alerts

def scan_all_action_conflicts(db: Session) -> Dict[str, Any]:
    """
    Scans all open cases across all institutions for inter-bureau action conflicts.
    Optimized with set-based prefetching for high-throughput scanning.
    """
    # 1. Preload existing active conflict alert keys in memory for O(1) deduplication
    existing_rows = db.query(
        ActionConflictAlert.case_a_id,
        ActionConflictAlert.case_b_id,
        ActionConflictAlert.rule_triggered
    ).filter(
        ActionConflictAlert.status.in_(["Pending Review", "Confirmed Conflict"])
    ).all()
    
    existing_keys = set()
    for row in existing_rows:
        existing_keys.add((row[0], row[1], row[2]))
        existing_keys.add((row[1], row[0], row[2]))

    institutions = db.query(Institution).all()
    total_evaluated = 0
    total_new_conflicts = 0
    
    for inst in institutions:
        cases = db.query(Case).filter(
            Case.institution_id == inst.id,
            Case.status != "Disposed"
        ).all()
        
        n = len(cases)
        for i in range(n):
            for j in range(i + 1, n):
                total_evaluated += 1
                c_a, c_b = cases[i], cases[j]
                conflict_res = check_action_conflict(c_a, c_b)
                if not conflict_res:
                    continue
                    
                rule_trig = conflict_res["rule_triggered"]
                if (c_a.id, c_b.id, rule_trig) in existing_keys:
                    continue
                    
                existing_keys.add((c_a.id, c_b.id, rule_trig))
                existing_keys.add((c_b.id, c_a.id, rule_trig))

                alert = ActionConflictAlert(
                    case_a_id=c_a.id,
                    case_b_id=c_b.id,
                    institution_id=inst.id,
                    conflict_type=conflict_res["conflict_type"],
                    rule_triggered=rule_trig,
                    severity=conflict_res["severity"],
                    evidence=conflict_res["evidence"],
                    status="Pending Review"
                )
                db.add(alert)
                total_new_conflicts += 1
                
                # Dispatch notification to assigned officers
                for rec_id in set(filter(None, [c_a.assigned_officer_id, c_b.assigned_officer_id])):
                    create_deduplicated_notification(
                        db=db,
                        recipient_id=rec_id,
                        notification_type="ACTION_CONFLICT",
                        title=f"Action Conflict Detected: {c_a.id} vs {c_b.id}",
                        message=f"Conflict rule '{rule_trig}' ({conflict_res['severity']}) detected between {c_a.id} and {c_b.id}.",
                        severity=conflict_res["severity"],
                        related_entity_type="ActionConflictAlert",
                        related_entity_id=f"{c_a.id}_{c_b.id}_{rule_trig}",
                        link_url="/action-conflicts"
                    )
                
    if total_new_conflicts > 0:
        db.commit()
        
    return {
        "pairs_evaluated": total_evaluated,
        "new_conflicts_detected": total_new_conflicts
    }

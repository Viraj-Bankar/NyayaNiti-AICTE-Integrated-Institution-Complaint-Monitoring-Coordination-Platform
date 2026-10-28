from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Case, ActionConflictAlert

# Define conflict rules with descriptions and severities
CONFLICT_RULES = [
    {
        "id": "RULE_CONTRADICTORY_ORDERS",
        "name": "Contradictory Regulatory Directive",
        "type": "Conflicting Direction",
        "severity": "Critical",
        "keywords_a": ["closure", "complied", "clean chit", "disposed", "no action required"],
        "keywords_b": ["show cause", "inspection", "penalty", "deficiency", "punitive", "withdrawn"],
        "description": "One bureau recorded a compliance or case closure, while another bureau concurrently ordered punitive action, inspection, or show cause for the same institution."
    },
    {
        "id": "RULE_DUPLICATE_INSPECTION",
        "name": "Duplicate Surprise/Expert Inspection",
        "type": "Duplicate Action",
        "severity": "High",
        "keywords_a": ["physical inspection", "expert visit", "committee visit", "on-site inspection"],
        "keywords_b": ["physical inspection", "expert visit", "committee visit", "on-site inspection"],
        "description": "Both Regulation Bureau and Public Grievance Cell have independently ordered physical expert committee visits within the same period, causing unnecessary administrative duplication."
    },
    {
        "id": "RULE_STATUS_MISMATCH",
        "name": "Severe Status Inconsistency",
        "type": "Inconsistent Status",
        "severity": "High",
        "description": "Cases for the same institution exhibit opposing statuses (e.g. one marked Disposed while another is marked Escalated on related allegations)."
    },
    {
        "id": "RULE_CONCURRENT_HEARING",
        "name": "Conflicting Hearing Schedule",
        "type": "Conflicting Assignment",
        "severity": "Medium",
        "keywords_a": ["hearing scheduled", "personal hearing", "standing hearing committee"],
        "keywords_b": ["hearing scheduled", "personal hearing", "standing hearing committee"],
        "description": "Separate hearing dates scheduled without inter-bureau coordination."
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
    if (case_a.status == "Disposed" and case_b.status == "Escalated") or (case_b.status == "Disposed" and case_a.status == "Escalated"):
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
                "case_b_bureau": case_b.current_bureau.code if case_b.current_bureau else "N/A"
            }
        }
        
    return None

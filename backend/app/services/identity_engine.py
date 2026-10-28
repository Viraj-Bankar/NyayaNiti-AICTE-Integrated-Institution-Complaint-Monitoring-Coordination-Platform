import re
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from app.models.models import Institution, InstitutionAlias
from app.config import settings

def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    # Standardize casing, remove extra spaces and punctuation while keeping digits and letters
    t = text.lower().strip()
    t = re.sub(r'[\.,\-\(\)\/\\]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def resolve_institution_identity(
    db: Session,
    permanent_id: Optional[str] = None,
    institution_name: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None
) -> Dict[str, Any]:
    """
    Institution Identity Resolution Engine implementing the 6-priority rules
    demanded by Section 12 of AICTE NyayaNiti Master Prompt.
    """
    # 1. Exact authoritative AICTE Permanent ID match
    if permanent_id and permanent_id.strip():
        pid = permanent_id.strip()
        inst = db.query(Institution).filter(Institution.permanent_id == pid).first()
        if inst:
            # Check if name heavily contradicts
            name_score = 100.0
            if institution_name:
                norm_input = normalize_text(institution_name)
                norm_inst = normalize_text(inst.official_name)
                name_score = fuzz.token_sort_ratio(norm_input, norm_inst)
                
            if name_score <= 50.0:
                return {
                    "outcome": "Identity Conflict",
                    "matched_institution_id": inst.id,
                    "institution": inst,
                    "confidence": 0.45,
                    "priority_level": 1,
                    "rule_applied": "Exact AICTE ID matched, but institution name exhibits severe conflict with official registry record",
                    "evidence": {
                        "input_id": pid,
                        "registered_name": inst.official_name,
                        "input_name": institution_name,
                        "name_similarity_ratio": round(name_score, 1)
                    }
                }
            return {
                "outcome": "Verified Match",
                "matched_institution_id": inst.id,
                "institution": inst,
                "confidence": 0.99,
                "priority_level": 1,
                "rule_applied": "Authoritative AICTE Permanent ID exact match confirmed",
                "evidence": {
                    "permanent_id": inst.permanent_id,
                    "official_name": inst.official_name,
                    "state": inst.state,
                    "district": inst.district,
                    "name_score": round(name_score, 1)
                }
            }

    # 2. Check verified aliases & historical names
    if institution_name:
        clean_input = normalize_text(institution_name)
        aliases = db.query(InstitutionAlias).filter(InstitutionAlias.is_verified == True).all()
        for alias in aliases:
            clean_alias = normalize_text(alias.alias_name)
            if clean_input == clean_alias or fuzz.token_sort_ratio(clean_input, clean_alias) > 92.0:
                inst = alias.institution
                # Check geographic match if provided
                geo_match = True
                if state and inst.state.lower() != state.lower():
                    geo_match = False
                
                return {
                    "outcome": "Verified Match" if geo_match else "Probable Match",
                    "matched_institution_id": inst.id,
                    "institution": inst,
                    "confidence": 0.92 if geo_match else 0.75,
                    "priority_level": 2,
                    "rule_applied": f"Matched verified official alias/historical name: '{alias.alias_name}' ({alias.alias_type})",
                    "evidence": {
                        "alias_matched": alias.alias_name,
                        "alias_type": alias.alias_type,
                        "official_name": inst.official_name,
                        "permanent_id": inst.permanent_id,
                        "geo_match": geo_match
                    }
                }

    # 3. Fuzzy Name Matching against Official Names with Geographic Blocking
    if institution_name:
        clean_input = normalize_text(institution_name)
        candidates = db.query(Institution).all()
        best_match = None
        best_score = 0.0
        
        for cand in candidates:
            cand_name = normalize_text(cand.official_name)
            ratio = fuzz.token_sort_ratio(clean_input, cand_name)
            
            # Geographic corroboration
            state_match = (state and cand.state.lower() == state.lower())
            district_match = (district and cand.district.lower() == district.lower())
            
            boost = 0.0
            if state_match:
                boost += 8.0
            if district_match:
                boost += 5.0
                
            total_score = min(100.0, ratio + boost)
            if total_score > best_score:
                best_score = total_score
                best_match = (cand, ratio, state_match, district_match)
                
        if best_match and best_score >= settings.RAPIDFUZZ_NAME_SIMILARITY_THRESHOLD:
            cand, ratio, state_match, district_match = best_match
            if ratio >= 88.0 and (state_match or not state):
                outcome = "Verified Match" if ratio >= 94.0 else "Probable Match"
                confidence = round(best_score / 100.0, 2)
            elif ratio >= 72.0:
                outcome = "Manual Review Required"
                confidence = round(best_score / 100.0, 2)
            else:
                outcome = "Manual Review Required"
                confidence = 0.60
                
            return {
                "outcome": outcome,
                "matched_institution_id": cand.id,
                "institution": cand,
                "confidence": confidence,
                "priority_level": 4,
                "rule_applied": f"Fuzzy name similarity ({round(ratio, 1)}%) with geographic verification",
                "evidence": {
                    "matched_official_name": cand.official_name,
                    "permanent_id": cand.permanent_id,
                    "token_sort_ratio": round(ratio, 1),
                    "state_match": state_match,
                    "district_match": district_match
                }
            }

    return {
        "outcome": "No Match Found",
        "matched_institution_id": None,
        "institution": None,
        "confidence": 0.0,
        "priority_level": 6,
        "rule_applied": "No authoritative record or threshold-exceeding candidate found",
        "evidence": {}
    }

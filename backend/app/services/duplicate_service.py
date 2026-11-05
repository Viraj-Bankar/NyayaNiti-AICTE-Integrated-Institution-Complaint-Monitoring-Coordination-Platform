"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: Duplicate Complaint Detection Service

Orchestrates candidate retrieval, MPNet-768 semantic embedding,
13-dimensional pairwise feature engineering, SVM duplicate classification,
and officer verification workflows.
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.models import (
    Case, Institution, User, CaseRelationship, CaseEvent,
    AuditLog, AIDuplicateRecommendation
)
from app.services.mpnet_encoder import get_mpnet_encoder, EMBEDDING_DIM, MODEL_NAME
from app.services.pairwise_features import extract_pair_features, explain_features, FEATURE_NAMES
from app.services.svm_classifier import get_svm_classifier
from app.services.audit_service import log_audit_event, record_case_event

logger = logging.getLogger("nyayaniti.duplicate_service")

MODEL_VERSION = "v1.0.0-phase6-mpnet-svm"


class DuplicateDetectionService:
    def __init__(self):
        self.encoder = get_mpnet_encoder()
        self.classifier = get_svm_classifier()

    def get_model_status(self) -> Dict[str, Any]:
        """Returns comprehensive diagnostic metadata for the Phase 6 AI model."""
        is_avail = self.classifier.is_available
        device = getattr(self.encoder, "device", "cpu")

        # Load metadata if present
        meta_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "ml_models", "training_metadata.json"
        )
        metadata = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata: {e}")

        return {
            "model_name": f"{MODEL_NAME} + Calibrated RBF-SVM",
            "model_version": MODEL_VERSION,
            "is_available": is_avail,
            "embedding_dim": EMBEDDING_DIM,
            "device": device,
            "feature_count": len(FEATURE_NAMES),
            "feature_names": FEATURE_NAMES,
            "best_hyperparameters": metadata.get("best_hyperparameters", {
                "kernel": "rbf",
                "C": 1.0,
                "gamma": 0.01
            }),
            "decision_thresholds": {
                "high_confidence_duplicate": 0.85,
                "manual_review_required": 0.60
            },
            "vector_engine": "In-Memory Cosine Vector Index (Documented NumPy/BLAS Fallback)",
            "pgvector_status": "evaluated_not_installed",
            "pgvector_note": (
                "pgvector extension evaluated for PostgreSQL/Neon production. "
                "Local SQLite runtime and python environment do not have pgvector installed. "
                "Candidate filtering is performed efficiently in SQL by institution context, "
                "followed by in-memory vectorized MPNet-768 dot-product scoring."
            ),
            "statutory_safeguard": (
                "AI duplicate detection is strictly decision-support. "
                "All results are advisory recommendations. Authorized officer verification "
                "is mandatory before any formal docket linkage or procedural consolidation."
            )
        }

    def retrieve_candidate_cases(
        self,
        db: Session,
        source_case: Case,
        limit: int = 50,
        include_cross_institution: bool = False
    ) -> List[Case]:
        """
        Retrieves candidate complaints from the database respecting institution context,
        complaint lifecycle, and privacy boundaries.
        """
        query = db.query(Case).filter(Case.id != source_case.id)

        # Statutory boundary: By default, restrict to the same educational institution
        if not include_cross_institution:
            query = query.filter(Case.institution_id == source_case.institution_id)

        # Lifecycle filter: exclude drafts and retracted complaints
        query = query.filter(Case.status.notin_(["Draft", "Withdrawn"]))

        # Most recent cases first, bounded by configurable limit
        candidates = query.order_by(desc(Case.date_received)).limit(limit).all()
        return candidates

    def analyze_complaint(
        self,
        db: Session,
        complaint_id: str,
        limit: int = 5,
        min_similarity: float = 0.40,
        include_cross_institution: bool = False
    ) -> Dict[str, Any]:
        """
        Executes end-to-end MPNet semantic similarity candidate retrieval and
        SVM duplicate classification for a target complaint.
        """
        source_case = db.query(Case).filter(Case.id == complaint_id).first()
        if not source_case:
            raise ValueError(f"Complaint '{complaint_id}' not found")

        inst = source_case.institution
        institution_name = inst.official_name if inst else "Unknown Institution"

        # 1. Retrieve candidates
        candidates = self.retrieve_candidate_cases(
            db=db,
            source_case=source_case,
            limit=50,
            include_cross_institution=include_cross_institution
        )

        if not candidates:
            logger.info(f"No candidate cases found for complaint {complaint_id} in institution {source_case.institution_id}")
            return {
                "source_complaint_id": source_case.id,
                "source_title": source_case.title,
                "source_institution_id": source_case.institution_id,
                "source_institution_name": institution_name,
                "total_candidates_evaluated": 0,
                "high_confidence_count": 0,
                "review_required_count": 0,
                "candidates": [],
                "model_name": f"{MODEL_NAME} + Calibrated RBF-SVM",
                "model_version": MODEL_VERSION,
                "vector_search_engine": "In-Memory Cosine Vector Index",
                "analyzed_at": datetime.utcnow()
            }

        # 2. Encode source text (cached if previously computed)
        source_text = f"{source_case.title}. {source_case.description}" if source_case.title else source_case.description
        source_emb = self.encoder.encode_single(source_text, normalize=True)

        # 3. Batch encode candidates (benefiting from singleton SHA-256 cache)
        candidate_texts = [
            f"{c.title}. {c.description}" if c.title else c.description
            for c in candidates
        ]
        cand_embs = self.encoder.encode_batch(candidate_texts, batch_size=16, normalize=True)

        # 4. Compute cosine similarity (dot product of L2-normalized embeddings)
        scored_pairs = []
        for cand, c_emb, c_text in zip(candidates, cand_embs, candidate_texts):
            cosine_sim = float(np.dot(source_emb, c_emb))
            cosine_sim = max(-1.0, min(1.0, round(cosine_sim, 4)))

            if cosine_sim >= min_similarity:
                scored_pairs.append({
                    "case": cand,
                    "cosine_similarity": cosine_sim,
                    "embedding": c_emb,
                    "text": c_text
                })

        # Sort descending by cosine similarity and select top K
        scored_pairs.sort(key=lambda x: x["cosine_similarity"], reverse=True)
        top_candidates = scored_pairs[:limit]

        # 5. Run 13-feature pairwise extraction & SVM classification
        candidate_results = []
        high_conf_count = 0
        review_req_count = 0

        for item in top_candidates:
            cand_case = item["case"]
            cos_score = item["cosine_similarity"]
            cand_emb = item["embedding"]
            cand_text = item["text"]

            pred = self.classifier.predict_pair(
                text_a=source_text,
                text_b=cand_text,
                institution_id_a=source_case.institution_id,
                institution_id_b=cand_case.institution_id,
                category_a=source_case.category or "",
                category_b=cand_case.category or "",
                emb_a=source_emb,
                emb_b=cand_emb
            )

            is_dup = pred["is_duplicate"]
            prob = pred["duplicate_probability"]
            tier = pred["decision_tier"]
            advice = pred["statutory_advice"]
            feats = pred["features"]

            if tier == "HIGH_CONFIDENCE_DUPLICATE":
                high_conf_count += 1
            elif tier == "MANUAL_REVIEW_REQUIRED":
                review_req_count += 1

            inst_match = bool(source_case.institution_id == cand_case.institution_id)
            cat_match = bool(
                source_case.category and cand_case.category and
                source_case.category.lower().strip() == cand_case.category.lower().strip()
            )

            # Construct transparent statutory explanation
            explanation = (
                f"Candidate {cand_case.id} exhibits {round(cos_score * 100, 1)}% MPNet semantic alignment "
                f"with {round(feats.get('fuzz_token_set_ratio', 0) * 100, 1)}% lexical word overlap. "
                f"Institution concordance: {'SAME' if inst_match else 'DIFFERENT'}; "
                f"Category concordance: {'SAME' if cat_match else 'DIFFERENT'}. "
                f"Calibrated SVM duplicate probability: {round(prob * 100, 1)}% ({tier})."
            )

            # Persist or update AIDuplicateRecommendation record in DB
            rec = db.query(AIDuplicateRecommendation).filter(
                AIDuplicateRecommendation.source_case_id == source_case.id,
                AIDuplicateRecommendation.candidate_case_id == cand_case.id
            ).first()

            if not rec:
                rec = AIDuplicateRecommendation(
                    source_case_id=source_case.id,
                    candidate_case_id=cand_case.id,
                    institution_id=source_case.institution_id,
                    similarity_score=cos_score,
                    duplicate_probability=prob,
                    predicted_tier=tier,
                    is_duplicate_predicted=is_dup,
                    features=feats,
                    explanation=explanation,
                    statutory_advice=advice,
                    model_version=MODEL_VERSION,
                    verification_status="PENDING_REVIEW"
                )
                db.add(rec)
                db.flush()
            else:
                # Update existing record if pending
                if rec.verification_status == "PENDING_REVIEW":
                    rec.similarity_score = cos_score
                    rec.duplicate_probability = prob
                    rec.predicted_tier = tier
                    rec.is_duplicate_predicted = is_dup
                    rec.features = feats
                    rec.explanation = explanation
                    rec.statutory_advice = advice
                    rec.updated_at = datetime.utcnow()
                    db.flush()

            cand_inst_name = (
                cand_case.institution.official_name
                if cand_case.institution else "Unknown Institution"
            )

            candidate_results.append({
                "recommendation_id": rec.id,
                "source_complaint_id": source_case.id,
                "candidate_complaint_id": cand_case.id,
                "candidate_title": cand_case.title,
                "candidate_category": cand_case.category,
                "candidate_institution_id": cand_case.institution_id,
                "candidate_institution_name": cand_inst_name,
                "candidate_status": cand_case.status,
                "candidate_date_received": cand_case.date_received,
                "predicted_relationship": tier,
                "similarity_score": cos_score,
                "duplicate_probability": prob,
                "svm_decision": is_dup,
                "institution_match": inst_match,
                "category_match": cat_match,
                "matching_features": feats,
                "explanation": explanation,
                "statutory_advice": advice,
                "verification_status": rec.verification_status,
                "verification_reason": rec.verification_reason,
                "model_version": MODEL_VERSION
            })

        db.commit()

        # Update source case overlap review flag if high confidence detected
        if high_conf_count > 0 and source_case.overlap_review_status == "None":
            source_case.overlap_review_status = "New"
            db.commit()

        logger.info(
            f"[AIDuplicateService] Analyzed {source_case.id}: "
            f"{len(candidates)} candidates checked, {len(candidate_results)} ranked, "
            f"{high_conf_count} high-confidence duplicates."
        )

        return {
            "source_complaint_id": source_case.id,
            "source_title": source_case.title,
            "source_institution_id": source_case.institution_id,
            "source_institution_name": institution_name,
            "total_candidates_evaluated": len(candidates),
            "high_confidence_count": high_conf_count,
            "review_required_count": review_req_count,
            "candidates": candidate_results,
            "model_name": f"{MODEL_NAME} + Calibrated RBF-SVM",
            "model_version": MODEL_VERSION,
            "vector_search_engine": "In-Memory Cosine Vector Index",
            "analyzed_at": datetime.utcnow()
        }

    def get_complaint_duplicates_summary(
        self,
        db: Session,
        complaint_id: str
    ) -> Dict[str, Any]:
        """
        Retrieves duplicate status summary for a complaint, triggering analysis
        automatically if not yet analyzed.
        """
        source_case = db.query(Case).filter(Case.id == complaint_id).first()
        if not source_case:
            raise ValueError(f"Complaint '{complaint_id}' not found")

        inst_name = (
            source_case.institution.official_name
            if source_case.institution else "Unknown Institution"
        )

        recs = db.query(AIDuplicateRecommendation).filter(
            AIDuplicateRecommendation.source_case_id == source_case.id
        ).order_by(desc(AIDuplicateRecommendation.duplicate_probability)).all()

        if not recs:
            # Trigger analysis on demand
            analysis = self.analyze_complaint(db, complaint_id, limit=5)
            candidates = analysis.get("candidates", [])
            top_rec = candidates[0] if candidates else None
            high_conf = analysis.get("high_confidence_count", 0)
            review_req = analysis.get("review_required_count", 0)
            total = analysis.get("total_candidates_evaluated", 0)
            last_analyzed = analysis.get("analyzed_at")
        else:
            high_conf = sum(1 for r in recs if r.predicted_tier == "HIGH_CONFIDENCE_DUPLICATE")
            review_req = sum(1 for r in recs if r.predicted_tier == "MANUAL_REVIEW_REQUIRED")
            total = len(recs)
            last_analyzed = recs[0].updated_at or recs[0].created_at

            top_r = recs[0]
            cand_case = top_r.candidate_case
            cand_inst_name = (
                cand_case.institution.official_name
                if cand_case and cand_case.institution else "Unknown Institution"
            )
            top_rec = {
                "recommendation_id": top_r.id,
                "source_complaint_id": top_r.source_case_id,
                "candidate_complaint_id": top_r.candidate_case_id,
                "candidate_title": cand_case.title if cand_case else None,
                "candidate_category": cand_case.category if cand_case else "",
                "candidate_institution_id": cand_case.institution_id if cand_case else 0,
                "candidate_institution_name": cand_inst_name,
                "candidate_status": cand_case.status if cand_case else "Unknown",
                "candidate_date_received": cand_case.date_received if cand_case else datetime.utcnow(),
                "predicted_relationship": top_r.predicted_tier,
                "similarity_score": top_r.similarity_score,
                "duplicate_probability": top_r.duplicate_probability,
                "svm_decision": top_r.is_duplicate_predicted,
                "institution_match": bool(cand_case and source_case.institution_id == cand_case.institution_id),
                "category_match": bool(cand_case and source_case.category == cand_case.category),
                "matching_features": top_r.features or {},
                "explanation": top_r.explanation or "",
                "statutory_advice": top_r.statutory_advice or "",
                "verification_status": top_r.verification_status,
                "verification_reason": top_r.verification_reason,
                "model_version": top_r.model_version
            }

        return {
            "complaint_id": source_case.id,
            "complaint_title": source_case.title,
            "institution_id": source_case.institution_id,
            "institution_name": inst_name,
            "total_candidates_analyzed": total,
            "high_confidence_duplicates_count": high_conf,
            "review_required_count": review_req,
            "top_recommendation": top_rec,
            "has_active_recommendations": (high_conf > 0 or review_req > 0),
            "model_version": MODEL_VERSION,
            "last_analyzed_at": last_analyzed
        }

    def get_complaint_candidates(
        self,
        db: Session,
        complaint_id: str,
        min_similarity: Optional[float] = None,
        tier: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieves formatted list of candidate duplicate recommendations."""
        source_case = db.query(Case).filter(Case.id == complaint_id).first()
        if not source_case:
            raise ValueError(f"Complaint '{complaint_id}' not found")

        recs_query = db.query(AIDuplicateRecommendation).filter(
            AIDuplicateRecommendation.source_case_id == source_case.id
        )

        if min_similarity is not None:
            recs_query = recs_query.filter(AIDuplicateRecommendation.similarity_score >= min_similarity)
        if tier:
            recs_query = recs_query.filter(AIDuplicateRecommendation.predicted_tier == tier)
        if status:
            recs_query = recs_query.filter(AIDuplicateRecommendation.verification_status == status)

        recs = recs_query.order_by(desc(AIDuplicateRecommendation.duplicate_probability)).limit(limit).all()

        # If empty and no filters applied, trigger fresh analysis
        if not recs and min_similarity is None and tier is None and status is None:
            analysis = self.analyze_complaint(db, complaint_id, limit=limit)
            return analysis.get("candidates", [])

        results = []
        for r in recs:
            cand = r.candidate_case
            cand_inst_name = (
                cand.institution.official_name
                if cand and cand.institution else "Unknown Institution"
            )
            results.append({
                "recommendation_id": r.id,
                "source_complaint_id": r.source_case_id,
                "candidate_complaint_id": r.candidate_case_id,
                "candidate_title": cand.title if cand else None,
                "candidate_category": cand.category if cand else "",
                "candidate_institution_id": cand.institution_id if cand else 0,
                "candidate_institution_name": cand_inst_name,
                "candidate_status": cand.status if cand else "Unknown",
                "candidate_date_received": cand.date_received if cand else datetime.utcnow(),
                "predicted_relationship": r.predicted_tier,
                "similarity_score": r.similarity_score,
                "duplicate_probability": r.duplicate_probability,
                "svm_decision": r.is_duplicate_predicted,
                "institution_match": bool(cand and source_case.institution_id == cand.institution_id),
                "category_match": bool(cand and source_case.category == cand.category),
                "matching_features": r.features or {},
                "explanation": r.explanation or "",
                "statutory_advice": r.statutory_advice or "",
                "verification_status": r.verification_status,
                "verification_reason": r.verification_reason,
                "model_version": r.model_version
            })

        return results

    def verify_duplicate_recommendation(
        self,
        db: Session,
        source_complaint_id: str,
        candidate_complaint_id: str,
        decision: str,
        reason: str,
        officer: User,
        link_dossier: bool = True
    ) -> Dict[str, Any]:
        """
        Executes authorized officer verification of an AI duplicate recommendation.
        AI never automatically merges or closes cases; officer decision is authoritative.
        """
        valid_decisions = ["CONFIRM_DUPLICATE", "MARK_RELATED", "REJECT_RECOMMENDATION"]
        if decision not in valid_decisions:
            raise ValueError(f"Invalid decision '{decision}'. Must be one of: {valid_decisions}")

        source_case = db.query(Case).filter(Case.id == source_complaint_id).first()
        if not source_case:
            raise ValueError(f"Source complaint '{source_complaint_id}' not found")

        cand_case = db.query(Case).filter(Case.id == candidate_complaint_id).first()
        if not cand_case:
            raise ValueError(f"Candidate complaint '{candidate_complaint_id}' not found")

        rec = db.query(AIDuplicateRecommendation).filter(
            AIDuplicateRecommendation.source_case_id == source_complaint_id,
            AIDuplicateRecommendation.candidate_case_id == candidate_complaint_id
        ).first()

        now = datetime.utcnow()
        if rec:
            rec.verification_status = decision
            rec.verified_by_id = officer.id
            rec.verification_reason = reason
            rec.verified_at = now
            rec.updated_at = now

        linked_rel_id = None

        if decision == "CONFIRM_DUPLICATE":
            source_case.overlap_review_status = "Confirmed Related"

            if link_dossier:
                # Check for existing relationship
                existing_rel = db.query(CaseRelationship).filter(
                    or_(
                        and_(CaseRelationship.case_a_id == source_case.id, CaseRelationship.case_b_id == cand_case.id),
                        and_(CaseRelationship.case_a_id == cand_case.id, CaseRelationship.case_b_id == source_case.id)
                    )
                ).first()

                if not existing_rel:
                    new_rel = CaseRelationship(
                        case_a_id=source_case.id,
                        case_b_id=cand_case.id,
                        relationship_type="Duplicate Grievance",
                        status="Active",
                        similarity_score=rec.similarity_score if rec else None,
                        evidence=rec.features if rec else None,
                        reviewer_id=officer.id,
                        review_decision="CONFIRM_DUPLICATE",
                        review_remarks=reason,
                        decided_at=now,
                        created_at=now
                    )
                    db.add(new_rel)
                    db.flush()
                    linked_rel_id = new_rel.id
                else:
                    existing_rel.relationship_type = "Duplicate Grievance"
                    existing_rel.review_decision = "CONFIRM_DUPLICATE"
                    existing_rel.review_remarks = reason
                    existing_rel.decided_at = now
                    linked_rel_id = existing_rel.id

            # CaseEvents for both dossiers
            record_case_event(
                db=db,
                case_id=source_case.id,
                event_type="DUPLICATE_CONFIRMED_BY_OFFICER",
                actor_id=officer.id,
                actor_name=officer.full_name,
                new_value=cand_case.id,
                remarks=f"Confirmed duplicate with {cand_case.id} by {officer.full_name}. Rationale: {reason}",
                is_public=False,
                commit=False
            )
            record_case_event(
                db=db,
                case_id=cand_case.id,
                event_type="DUPLICATE_CONFIRMED_BY_OFFICER",
                actor_id=officer.id,
                actor_name=officer.full_name,
                new_value=source_case.id,
                remarks=f"Confirmed duplicate with {source_case.id} by {officer.full_name}. Rationale: {reason}",
                is_public=False,
                commit=False
            )

            log_audit_event(
                db=db,
                actor_id=officer.id,
                actor_name=officer.full_name,
                actor_role=officer.role,
                event_type="AI_DUPLICATE_VERIFIED",
                entity_type="AIDuplicateRecommendation",
                entity_id=f"{source_case.id}<->{cand_case.id}",
                new_value="CONFIRM_DUPLICATE",
                remarks=reason,
                commit=False
            )

        elif decision == "MARK_RELATED":
            source_case.overlap_review_status = "Confirmed Related"

            if link_dossier:
                existing_rel = db.query(CaseRelationship).filter(
                    or_(
                        and_(CaseRelationship.case_a_id == source_case.id, CaseRelationship.case_b_id == cand_case.id),
                        and_(CaseRelationship.case_a_id == cand_case.id, CaseRelationship.case_b_id == source_case.id)
                    )
                ).first()

                if not existing_rel:
                    new_rel = CaseRelationship(
                        case_a_id=source_case.id,
                        case_b_id=cand_case.id,
                        relationship_type="Related Matter",
                        status="Active",
                        similarity_score=rec.similarity_score if rec else None,
                        evidence=rec.features if rec else None,
                        reviewer_id=officer.id,
                        review_decision="MARK_RELATED",
                        review_remarks=reason,
                        decided_at=now,
                        created_at=now
                    )
                    db.add(new_rel)
                    db.flush()
                    linked_rel_id = new_rel.id
                else:
                    existing_rel.relationship_type = "Related Matter"
                    existing_rel.review_decision = "MARK_RELATED"
                    existing_rel.review_remarks = reason
                    existing_rel.decided_at = now
                    linked_rel_id = existing_rel.id

            record_case_event(
                db=db,
                case_id=source_case.id,
                event_type="RELATED_MATTER_MARKED_BY_OFFICER",
                actor_id=officer.id,
                actor_name=officer.full_name,
                new_value=cand_case.id,
                remarks=f"Marked as related matter with {cand_case.id}. Rationale: {reason}",
                is_public=False,
                commit=False
            )

            log_audit_event(
                db=db,
                actor_id=officer.id,
                actor_name=officer.full_name,
                actor_role=officer.role,
                event_type="AI_RELATED_MATTER_VERIFIED",
                entity_type="AIDuplicateRecommendation",
                entity_id=f"{source_case.id}<->{cand_case.id}",
                new_value="MARK_RELATED",
                remarks=reason,
                commit=False
            )

        elif decision == "REJECT_RECOMMENDATION":
            source_case.overlap_review_status = "Rejected"

            record_case_event(
                db=db,
                case_id=source_case.id,
                event_type="AI_RECOMMENDATION_REJECTED",
                actor_id=officer.id,
                actor_name=officer.full_name,
                new_value=cand_case.id,
                remarks=f"AI duplicate recommendation with {cand_case.id} rejected by {officer.full_name}. Rationale: {reason}",
                is_public=False,
                commit=False
            )

            log_audit_event(
                db=db,
                actor_id=officer.id,
                actor_name=officer.full_name,
                actor_role=officer.role,
                event_type="AI_DUPLICATE_REJECTED",
                entity_type="AIDuplicateRecommendation",
                entity_id=f"{source_case.id}<->{cand_case.id}",
                new_value="REJECT_RECOMMENDATION",
                remarks=reason,
                commit=False
            )

        db.commit()

        return {
            "status": "success",
            "message": f"Officer verification recorded: {decision}",
            "source_complaint_id": source_case.id,
            "candidate_complaint_id": cand_case.id,
            "decision": decision,
            "linked_relationship_id": linked_rel_id,
            "verified_at": now,
            "verified_by": officer.full_name
        }


# Singleton accessor
_duplicate_service = None


def get_duplicate_service() -> DuplicateDetectionService:
    global _duplicate_service
    if _duplicate_service is None:
        _duplicate_service = DuplicateDetectionService()
    return _duplicate_service


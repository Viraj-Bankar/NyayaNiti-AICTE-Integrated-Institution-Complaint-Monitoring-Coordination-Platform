"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: SVM Duplicate Complaint Classifier Runtime Service

Inference and decision-support service wrapping the trained MPNet-768 + RBF-SVM model:
- Loads serialized artifacts: svm_duplicate_model.joblib, feature_scaler.joblib, metadata
- Encodes complaint narratives on-the-fly or accepts precomputed 768-dim vectors
- Extracts 13-dimensional pairwise features
- Computes calibrated duplicate probability P(duplicate | features)
- Formats explainable diagnostic evidence for regulatory scrutiny officers
- Automatically falls back to hybrid TF-IDF / RapidFuzz engine if neural weights are unavailable
"""

import os
import joblib
import numpy as np
from typing import Dict, Any, Optional, Tuple, Union

from app.services.mpnet_encoder import get_mpnet_encoder, EMBEDDING_DIM
from app.services.pairwise_features import extract_pair_features, explain_features, FEATURE_NAMES
from app.services.matching_engine import compute_similarity as fallback_compute_similarity

MODEL_DIR = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")), "ml_models")
MODEL_PATH = os.path.join(MODEL_DIR, "svm_duplicate_model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "feature_scaler.joblib")

_svm_model = None
_feature_scaler = None
_model_initialized = False


def _initialize_model():
    """Lazily loads SVM model and feature scaler."""
    global _svm_model, _feature_scaler, _model_initialized
    if _model_initialized:
        return

    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            _svm_model = joblib.load(MODEL_PATH)
            _feature_scaler = joblib.load(SCALER_PATH)
            _model_initialized = True
        except Exception as e:
            print(f"[SVMClassifier] Warning: Could not load serialized model: {e}")
            _svm_model = None
            _feature_scaler = None
            _model_initialized = False
    else:
        _model_initialized = False


class SVMDuplicateClassifier:
    def __init__(self):
        _initialize_model()
        self.model = _svm_model
        self.scaler = _feature_scaler
        self.encoder = get_mpnet_encoder()

    @property
    def is_available(self) -> bool:
        _initialize_model()
        return _svm_model is not None and _feature_scaler is not None

    def predict_pair(
        self,
        text_a: str,
        text_b: str,
        institution_id_a: Any = None,
        institution_id_b: Any = None,
        category_a: str = "",
        category_b: str = "",
        emb_a: Optional[np.ndarray] = None,
        emb_b: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a complaint pair and returns duplicate probability,
        binary prediction, and explainable evidence.
        """
        # Fallback if SVM model or scaler is missing
        if not self.is_available:
            return self._fallback_prediction(text_a, text_b, category_a, category_b)

        # 1. Obtain or compute MPNet-768 embeddings
        if emb_a is None or len(emb_a) != EMBEDDING_DIM:
            emb_a = self.encoder.encode_single(text_a, normalize=True)
        if emb_b is None or len(emb_b) != EMBEDDING_DIM:
            emb_b = self.encoder.encode_single(text_b, normalize=True)

        # 2. Extract 13-dimensional pairwise feature vector
        features = extract_pair_features(
            emb_a=emb_a,
            emb_b=emb_b,
            text_a=text_a,
            text_b=text_b,
            institution_id_a=institution_id_a,
            institution_id_b=institution_id_b,
            category_a=category_a,
            category_b=category_b
        )

        # 3. Scale features using fitted scaler
        features_scaled = self.scaler.transform([features])

        # 4. Predict binary label and calibrated probability
        pred_label = int(self.model.predict(features_scaled)[0])
        try:
            prob = float(self.model.predict_proba(features_scaled)[0][1])
        except Exception:
            # If decision function only
            raw_score = float(self.model.decision_function(features_scaled)[0])
            prob = float(1.0 / (1.0 + np.exp(-raw_score)))

        prob = max(0.0, min(1.0, round(prob, 4)))
        feature_dict = explain_features(features)

        # 5. Tier classification and statutory decision-support policy
        # Under AICTE grievance administration, matters against distinct educational institutions
        # represent independent legal jurisdictions and cannot be conflated as duplicates.
        diff_institutions = (
            institution_id_a is not None and
            institution_id_b is not None and
            institution_id_a != institution_id_b
        )

        if diff_institutions:
            decision_tier = "DISTINCT_MATTERS"
            statutory_advice = "Cross-institution textual resemblance detected; distinct educational institutions require independent inquiry proceedings."
            is_dup = False
        elif prob >= 0.85:
            decision_tier = "HIGH_CONFIDENCE_DUPLICATE"
            statutory_advice = "Statutorily confirmed duplicate candidate; recommend docket linkage or unified inquiry."
            is_dup = True
        elif prob >= 0.60:
            decision_tier = "MANUAL_REVIEW_REQUIRED"
            statutory_advice = "Substantive overlap detected; manual scrutiny by review officer required."
            is_dup = True
        else:
            decision_tier = "DISTINCT_MATTERS"
            statutory_advice = "Distinct institutional grievances; proceed on separate inquiry tracks."
            is_dup = False

        return {
            "is_duplicate": is_dup,
            "duplicate_probability": prob,
            "decision_tier": decision_tier,
            "statutory_advice": statutory_advice,
            "model_name": "all-mpnet-base-v2 + SVM-RBF (Calibrated)",
            "embedding_dim": EMBEDDING_DIM,
            "features": feature_dict,
            "explainability": {
                "cosine_similarity": feature_dict["cosine_similarity"],
                "fuzz_token_set_ratio": feature_dict["fuzz_token_set_ratio"],
                "same_institution": bool(feature_dict["same_institution"]),
                "same_category": bool(feature_dict["same_category"]),
                "l2_distance": feature_dict["l2_distance"]
            }
        }

    def _fallback_prediction(self, text_a: str, text_b: str, cat_a: str, cat_b: str) -> Dict[str, Any]:
        """Graceful fallback to documented TF-IDF / RapidFuzz engine."""
        score, model_used, evidence = fallback_compute_similarity(text_a, text_b, cat_a, cat_b)
        return {
            "is_duplicate": bool(score >= 0.70),
            "duplicate_probability": round(float(score), 4),
            "decision_tier": "HIGH_CONFIDENCE_DUPLICATE" if score >= 0.82 else "MANUAL_REVIEW_REQUIRED" if score >= 0.60 else "DISTINCT_MATTERS",
            "statutory_advice": "Evaluated using documented fallback engine.",
            "model_name": f"{model_used} (Fallback)",
            "embedding_dim": None,
            "features": evidence,
            "explainability": evidence
        }


_classifier_instance = None


def get_svm_classifier() -> SVMDuplicateClassifier:
    """Returns singleton instance of SVMDuplicateClassifier."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = SVMDuplicateClassifier()
    return _classifier_instance

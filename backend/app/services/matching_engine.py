import re
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from rapidfuzz import fuzz
from app.config import settings

# Global cache for embeddings / model status
_sbert_model = None
_sbert_available = False
_model_name = "TF-IDF + RapidFuzz Hybrid Semantic Engine (Documented Fallback)"

try:
    from sentence_transformers import SentenceTransformer
    _sbert_model = SentenceTransformer(settings.SBERT_MODEL_NAME)
    _sbert_available = True
    _model_name = f"SBERT / {settings.SBERT_MODEL_NAME}"
except Exception:
    _sbert_model = None
    _sbert_available = False
    _model_name = "TF-IDF + RapidFuzz Regulatory Hybrid Similarity Engine (Documented Fallback)"

# Canonical regulatory synonyms as informed by AICTE grievance taxonomy
REGULATORY_SYNONYMS = {
    "sixty-five thousand": "65000",
    "sixty five thousand": "65000",
    "fifty thousand": "50000",
    "caution money": "caution fee deposit",
    "infrastructure fund": "capitation development fee",
    "marksheets": "original certificates documents",
    "mark sheet": "original certificates documents",
    "mark sheets": "original certificates documents",
    "demanding": "forcibly collecting demanding",
    "collecting": "forcibly collecting demanding",
    "withholding": "refusing retention withholding",
    "refusing": "refusing retention withholding",
    "retained": "refusing retention withholding",
    "retention": "refusing retention withholding",
    "non-payment": "unpaid delayed salary",
    "unpaid salary": "unpaid delayed salary",
    "7th pay": "7th cpc salary scales",
    "ragging": "anti-ragging physical harassment",
    "unapproved course": "unapproved specialization intake affiliation"
}

def get_model_info() -> Dict[str, Any]:
    return {
        "model_name": _model_name,
        "is_sbert_active": _sbert_available,
        "high_threshold": settings.OVERLAP_HIGH_THRESHOLD,
        "review_threshold": settings.OVERLAP_REVIEW_THRESHOLD,
        "note": "AI semantic similarity measures textual and contextual resemblance. It does not establish legal duplicate status and serves strictly as decision-support."
    }

def clean_and_normalize(text: Optional[str]) -> str:
    """Stage 1: Normalize text while canonicalizing regulatory concepts."""
    if not text:
        return ""
    normalized = text.lower()
    for phrase, canonical in REGULATORY_SYNONYMS.items():
        normalized = normalized.replace(phrase, canonical)
    normalized = re.sub(r'[\r\n\t]+', ' ', normalized)
    normalized = re.sub(r'[^\w\s\-\/\.]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized

def calculate_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Stage 4: Cosine similarity calculation: dot(A, B) / (norm(A) * norm(B))"""
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

def extract_key_overlapping_terms(text1: str, text2: str) -> List[str]:
    """Identify significant shared words/phrases between two complaints."""
    stop_words = {
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'been', 'were',
        'college', 'institute', 'institution', 'aicte', 'complaint', 'grievance', 'regarding',
        'has', 'had', 'was', 'are', 'not', 'submitted', 'received', 'dated', 'about', 'under', 'into'
    }
    words1 = set(re.findall(r'\b[a-zA-Z]{4,}\b', text1.lower())) - stop_words
    words2 = set(re.findall(r'\b[a-zA-Z]{4,}\b', text2.lower())) - stop_words
    common = sorted(list(words1.intersection(words2)))
    return common[:8]

def compute_similarity(desc_a: str, desc_b: str, cat_a: str = "", cat_b: str = "") -> Tuple[float, str, Dict[str, Any]]:
    """
    Computes semantic similarity between two complaints using SBERT or documented hybrid fallback.
    Returns: (score, model_used, evidence_dict)
    """
    norm_a = clean_and_normalize(desc_a)
    norm_b = clean_and_normalize(desc_b)
    
    if not norm_a or not norm_b:
        return 0.0, _model_name, {"reason": "Empty description"}

    # If SBERT is active, use sentence embeddings
    if _sbert_available and _sbert_model is not None:
        try:
            embeddings = _sbert_model.encode([norm_a, norm_b])
            vec_score = calculate_cosine_similarity(embeddings[0], embeddings[1])
            model_used = f"SBERT ({settings.SBERT_MODEL_NAME})"
        except Exception:
            vec_score = _tfidf_similarity(norm_a, norm_b)
            model_used = "TF-IDF Cosine Similarity (Fallback)"
    else:
        vec_score = _tfidf_similarity(norm_a, norm_b)
        model_used = _model_name

    # RapidFuzz Token Set and Sort ratios for lexical-semantic alignment
    set_ratio = fuzz.token_set_ratio(norm_a, norm_b) / 100.0
    sort_ratio = fuzz.token_sort_ratio(norm_a, norm_b) / 100.0
    fuzz_hybrid = (0.65 * set_ratio) + (0.35 * sort_ratio)
    
    category_match = (cat_a.lower().strip() == cat_b.lower().strip()) if cat_a and cat_b else False
    
    # Combined hybrid score (Paper 2 & 3 multi-stage blocking + matching principles)
    if _sbert_available:
        combined_score = (0.70 * vec_score) + (0.30 * fuzz_hybrid)
    else:
        combined_score = (0.45 * vec_score) + (0.55 * fuzz_hybrid)
        
    # If category matches exactly, add targeted category concordance
    if category_match:
        combined_score = min(1.0, combined_score + 0.10)
        
    combined_score = round(float(combined_score), 4)
    overlapping_terms = extract_key_overlapping_terms(desc_a, desc_b)

    evidence = {
        "cosine_score": round(float(vec_score), 4),
        "fuzz_hybrid_score": round(float(fuzz_hybrid), 4),
        "category_exact_match": category_match,
        "shared_terms": overlapping_terms,
        "fields_compared": ["description", "category"],
        "stage": "Explainable SBERT/Hybrid Matching Pipeline Stage 5",
        "threshold_eval": (
            "HIGH_OVERLAP" if combined_score >= settings.OVERLAP_HIGH_THRESHOLD
            else "MANUAL_REVIEW_REQUIRED" if combined_score >= settings.OVERLAP_REVIEW_THRESHOLD
            else "DISTINCT_CASES"
        )
    }

    return combined_score, model_used, evidence

def _tfidf_similarity(text1: str, text2: str) -> float:
    """Documented TF-IDF Vector cosine similarity fallback implementation."""
    try:
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(sim)
    except Exception:
        return fuzz.token_set_ratio(text1, text2) / 100.0

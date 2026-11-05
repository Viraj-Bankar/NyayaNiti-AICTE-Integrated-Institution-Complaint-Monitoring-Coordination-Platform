"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: Pairwise Feature Engineering Service

Extracts an explainable, multi-dimensional feature vector for a complaint pair (A, B)
combining MPNet-768 dense vector geometry, lexical alignment, and institutional context:

Dense Vector Geometric Features (MPNet-768):
1.  cosine_similarity: Dot product of unit-normalized embeddings
2.  l1_distance: Manhattan distance ||u - v||_1
3.  l2_distance: Euclidean distance ||u - v||_2
4.  diff_mean: Mean element-wise absolute difference
5.  diff_max: Maximum element-wise absolute difference
6.  diff_std: Standard deviation of element-wise absolute difference
7.  prod_mean: Mean element-wise product (u * v)
8.  prod_std: Standard deviation of element-wise product

Lexical Alignment Features (RapidFuzz):
9.  fuzz_token_set_ratio: Order-invariant token set resemblance in [0, 1]
10. fuzz_token_sort_ratio: Token sort resemblance in [0, 1]
11. length_ratio: Min-to-max character length ratio in [0, 1]

Institutional Statutory Context:
12. same_institution: 1.0 if complaints pertain to the identical institution, else 0.0
13. same_category: 1.0 if complaints share the same statutory grievance category, else 0.0
"""

import numpy as np
from typing import Dict, Any, List
from rapidfuzz import fuzz

FEATURE_NAMES = [
    "cosine_similarity",
    "l1_distance",
    "l2_distance",
    "diff_mean",
    "diff_max",
    "diff_std",
    "prod_mean",
    "prod_std",
    "fuzz_token_set_ratio",
    "fuzz_token_sort_ratio",
    "length_ratio",
    "same_institution",
    "same_category"
]


def extract_pair_features(
    emb_a: np.ndarray,
    emb_b: np.ndarray,
    text_a: str,
    text_b: str,
    institution_id_a: Any = None,
    institution_id_b: Any = None,
    category_a: str = "",
    category_b: str = ""
) -> np.ndarray:
    """
    Constructs a 13-dimensional feature vector for a pair of complaints.
    """
    u = np.asarray(emb_a, dtype=np.float32)
    v = np.asarray(emb_b, dtype=np.float32)

    # 1. Cosine similarity
    norm_u = np.linalg.norm(u)
    norm_v = np.linalg.norm(v)
    if norm_u > 0 and norm_v > 0:
        cos_sim = float(np.dot(u, v) / (norm_u * norm_v))
    else:
        cos_sim = 0.0

    # 2. Geometric differences
    diff = np.abs(u - v)
    l1_dist = float(np.sum(diff))
    l2_dist = float(np.linalg.norm(diff))
    diff_mean = float(np.mean(diff))
    diff_max = float(np.max(diff))
    diff_std = float(np.std(diff))

    # 3. Element-wise product interaction
    prod = u * v
    prod_mean = float(np.mean(prod))
    prod_std = float(np.std(prod))

    # 4. Lexical token metrics
    clean_a = (text_a or "").strip()
    clean_b = (text_b or "").strip()
    
    set_ratio = fuzz.token_set_ratio(clean_a, clean_b) / 100.0
    sort_ratio = fuzz.token_sort_ratio(clean_a, clean_b) / 100.0

    len_a = len(clean_a)
    len_b = len(clean_b)
    len_ratio = (min(len_a, len_b) + 1.0) / (max(len_a, len_b) + 1.0)

    # 5. Institutional & Category Context
    same_inst = 1.0 if (institution_id_a is not None and institution_id_b is not None and institution_id_a == institution_id_b) else 0.0
    
    cat_a = (category_a or "").strip().lower()
    cat_b = (category_b or "").strip().lower()
    same_cat = 1.0 if (cat_a and cat_b and cat_a == cat_b) else 0.0

    features = np.array([
        cos_sim,
        l1_dist,
        l2_dist,
        diff_mean,
        diff_max,
        diff_std,
        prod_mean,
        prod_std,
        set_ratio,
        sort_ratio,
        len_ratio,
        same_inst,
        same_cat
    ], dtype=np.float32)

    return features


def explain_features(features: np.ndarray) -> Dict[str, float]:
    """Returns a named dictionary of extracted features."""
    return {name: round(float(val), 4) for name, val in zip(FEATURE_NAMES, features)}


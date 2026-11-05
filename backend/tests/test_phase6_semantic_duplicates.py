"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: MPNet-768 + SVM Duplicate Complaint Detection Test Suite

Rigorously verifies:
1. MPNet-768 embedding shape (768-dim, L2-normalized).
2. Edge Case 1: Empty and whitespace-only complaint text.
3. Edge Case 2: Very short complaints (< 15 characters).
4. Edge Case 3: Long and multi-paragraph complaint descriptions (> 1000 characters).
5. Edge Case 4: Near-identical wording (syntactic duplicates).
6. Edge Case 5: Paraphrased wording with identical statutory meaning (semantic duplicates).
7. Edge Case 6: Same institution but unrelated issues (hard negatives - must NOT be duplicate).
8. Edge Case 7: Same category but unrelated issues across different institutions.
9. Feature engineering pipeline consistency and feature count.
10. Model artifact presence and deserialization integrity.
"""

import os
import pytest
import numpy as np

from app.services.mpnet_encoder import get_mpnet_encoder, EMBEDDING_DIM
from app.services.pairwise_features import extract_pair_features, FEATURE_NAMES, explain_features
from app.services.svm_classifier import get_svm_classifier


@pytest.fixture(scope="module")
def encoder():
    return get_mpnet_encoder()


@pytest.fixture(scope="module")
def classifier():
    return get_svm_classifier()


def test_1_mpnet_embedding_shape_and_normalization(encoder):
    """Verifies that MPNet produces 768-dimensional L2-normalized vectors."""
    text = "Students forced to pay unapproved Rs 65,000 capitation fee under caution deposit without receipt."
    emb = encoder.encode_single(text, normalize=True)

    assert isinstance(emb, np.ndarray)
    assert emb.shape == (768,)
    norm = float(np.linalg.norm(emb))
    assert pytest.approx(norm, 0.001) == 1.0


def test_2_empty_and_whitespace_text_handling(encoder, classifier):
    """Verifies graceful handling of empty or whitespace-only inputs without crashing."""
    emb_empty = encoder.encode_single("", normalize=True)
    emb_spaces = encoder.encode_single("   \n\t  ", normalize=True)

    assert emb_empty.shape == (768,)
    assert np.all(emb_empty == 0.0)
    assert np.all(emb_spaces == 0.0)

    # Classifier prediction with empty string should not crash and should yield distinct (0)
    res = classifier.predict_pair(
        text_a="",
        text_b="Legitimate complaint description",
        institution_id_a=1,
        institution_id_b=1
    )
    assert res["is_duplicate"] is False
    assert res["decision_tier"] == "DISTINCT_MATTERS"


def test_3_very_short_complaints_handling(encoder, classifier):
    """Verifies handling of concise or abrupt complaint statements."""
    short_a = "Fees unpaid."
    short_b = "No salary paid."
    
    emb_a = encoder.encode_single(short_a)
    emb_b = encoder.encode_single(short_b)
    
    assert emb_a.shape == (768,)
    assert emb_b.shape == (768,)
    
    res = classifier.predict_pair(
        text_a=short_a,
        text_b=short_b,
        institution_id_a=1,
        institution_id_b=2,
        category_a="Faculty Salary",
        category_b="Faculty Salary"
    )
    assert "duplicate_probability" in res
    assert 0.0 <= res["duplicate_probability"] <= 1.0


def test_4_long_descriptions_handling(encoder, classifier):
    """Verifies encoding and classification of complex, multi-paragraph complaint descriptions."""
    long_desc_1 = (
        "The administration of the technical institute has systematically demanded arbitrary cash contributions "
        "from final-year computer science students prior to issuing hall tickets and examination admit cards. "
        "Over 140 students in the Department of Computer Engineering were issued verbal notices demanding an additional "
        "contingency infrastructure surcharge of Rs 45,000 per student. No formal fee structure was ever notified "
        "in the mandatory AICTE approval disclosure handbook. When students raised objections with the Academic Dean, "
        "their internal laboratory project assessments were arbitrarily withheld. Furthermore, the college refuses to "
        "disclose the ledger of bank deposits and insists on immediate cash handovers without issuing valid receipt vouchers. "
    ) * 3

    long_desc_2 = (
        "Institutional authorities are unlawfully collecting unapproved cash sums from B.Tech final semester candidates. "
        "College demanded Rs 45,000 as miscellaneous infrastructure fee before granting hall ticket clearance. "
        "Students protesting the illegal surcharge faced academic threats regarding internal marks. "
        "Transactions are conducted exclusively in cash with complete denial of official stamped receipts."
    )

    assert len(long_desc_1) > 1000

    emb_long = encoder.encode_single(long_desc_1)
    assert emb_long.shape == (768,)

    res = classifier.predict_pair(
        text_a=long_desc_1,
        text_b=long_desc_2,
        institution_id_a=1,
        institution_id_b=1,
        category_a="Fees and Financial Issues",
        category_b="Fees and Financial Issues"
    )
    assert res["is_duplicate"] is True or res["duplicate_probability"] >= 0.50
    assert res["explainability"]["same_institution"] is True


def test_5_similar_wording_syntactic_duplicates(classifier):
    """Verifies detection of syntactic duplicates with very similar wording."""
    text_a = "College administration demanded Rs 50,000 cash for 3rd semester registration without any formal receipt."
    text_b = "College demanded extra Rs 50,000 cash for third semester registration without issuing any formal receipt."

    res = classifier.predict_pair(
        text_a=text_a,
        text_b=text_b,
        institution_id_a=1,
        institution_id_b=1,
        category_a="Fees and Financial Issues",
        category_b="Fees and Financial Issues"
    )
    assert res["duplicate_probability"] >= 0.60
    assert res["explainability"]["cosine_similarity"] >= 0.85


def test_6_different_wording_semantic_duplicates(classifier):
    """
    CRITICAL TEST: Verifies that MPNet+SVM detects duplicates where phrasing
    differs substantially but the core allegation and violation are identical.
    """
    # Complaint 1: Legal / Administrative style
    text_a = (
        "The governing body of the engineering college has committed severe breach of regulatory norms by "
        "demanding seventy thousand rupees from newly matriculated students under the guise of an unapproved building development levy. "
        "Official cash receipts are withheld."
    )
    # Complaint 2: Citizen / Parent narrative style
    text_b = (
        "My son got admission in first year. The institute principal forced us to hand over Rs 70,000 in cash for college "
        "construction work and refused to provide any stamped voucher or receipt for the payment."
    )

    res = classifier.predict_pair(
        text_a=text_a,
        text_b=text_b,
        institution_id_a=1,
        institution_id_b=1,
        category_a="Fee Overcharging & Capitation Fee",
        category_b="Fee Overcharging & Capitation Fee"
    )

    # Must detect as duplicate or high overlap despite disjoint phrasing
    assert res["duplicate_probability"] >= 0.55
    assert res["explainability"]["same_institution"] is True


def test_7_hard_negatives_same_institution_unrelated_issues(classifier):
    """
    CRITICAL TEST: Verifies that complaints from the SAME institution but concerning
    COMPLETELY DIFFERENT violations are classified as DISTINCT matters (label = 0).
    """
    # Incident A: Severe hostel physical bullying
    text_a = "Junior hostel inmates subjected to brutal ragging by senior students in hostel block B. Warden took no action."
    # Incident B: Library deficiency
    text_b = "Central college library lacks mandatory IEEE research subscriptions and digital journal access for M.Tech students."

    res = classifier.predict_pair(
        text_a=text_a,
        text_b=text_b,
        institution_id_a=1,
        institution_id_b=1,
        category_a="Anti-Ragging",
        category_b="Library Deficiency"
    )

    assert res["is_duplicate"] is False
    assert res["duplicate_probability"] < 0.50
    assert res["decision_tier"] == "DISTINCT_MATTERS"


def test_8_same_category_across_different_institutions(classifier):
    """Verifies that generic complaints from different institutions are not conflated."""
    # College 1 in Delhi
    text_a = "Delhi Institute of Advanced Technology demanded extra lab fees in cash."
    # College 2 in Bangalore
    text_b = "Karnataka Institute of Technology demanded extra computer lab fees in cash."

    res = classifier.predict_pair(
        text_a=text_a,
        text_b=text_b,
        institution_id_a=1,
        institution_id_b=5,
        category_a="Fees and Financial Issues",
        category_b="Fees and Financial Issues"
    )

    assert res["explainability"]["same_institution"] is False
    assert res["is_duplicate"] is False or res["decision_tier"] != "HIGH_CONFIDENCE_DUPLICATE"


def test_9_feature_vector_completeness(encoder):
    """Verifies that the pairwise feature pipeline constructs exactly 13 features with valid values."""
    e1 = encoder.encode_single("First complaint text.")
    e2 = encoder.encode_single("Second complaint text.")

    feats = extract_pair_features(
        emb_a=e1,
        emb_b=e2,
        text_a="First complaint text.",
        text_b="Second complaint text.",
        institution_id_a=1,
        institution_id_b=1,
        category_a="Academic",
        category_b="Academic"
    )

    assert len(feats) == len(FEATURE_NAMES) == 13
    assert not np.isnan(feats).any()
    assert not np.isinf(feats).any()


def test_10_model_artifacts_integrity():
    """Verifies that all serialized model artifacts exist and have valid structure."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    model_dir = os.path.join(base_dir, "app", "ml_models")

    assert os.path.exists(os.path.join(model_dir, "svm_duplicate_model.joblib"))
    assert os.path.exists(os.path.join(model_dir, "feature_scaler.joblib"))
    assert os.path.exists(os.path.join(model_dir, "embedding_config.json"))
    assert os.path.exists(os.path.join(model_dir, "label_mapping.json"))
    assert os.path.exists(os.path.join(model_dir, "training_metadata.json"))
    assert os.path.exists(os.path.join(model_dir, "evaluation_results.json"))


# NyayaNiti — Phase 6 Data Quality Report
## AICTE Duplicate Complaint Detection Preprocessing

**Document Reference:** `AICTE/NN/PHASE6/DATA-QUAL-001`  
**Execution Date:** 2026-11-04 12:56:26 UTC  
**Verification Result:** **PASS (ZERO VIOLATIONS)**

---

### 1. Data Integrity Checks

| Verification Check | Standard | Result | Violations |
| :--- | :--- | :--- | :--- |
| **Missing Values** | Zero nulls in required schema fields | **PASS** | 0 nulls detected |
| **Whitespace Normalization** | No raw `\n`, `\t`, non-breaking spaces | **PASS** | 100% normalized |
| **Text Minimum Length** | Descriptions ≥ 15 characters | **PASS** | 0 short records |
| **Individual Deduplication** | Canonical representation of complaint text | **PASS** | 455 redundant rows filtered |
| **Self-Pair Prohibition** | $id_1 \neq id_2$ in all pairs | **PASS** | 0 self-pairs |
| **Canonical Pair Ordering** | $id_1 < id_2$ deterministic string order | **PASS** | 0 order inversions |
| **Reciprocal Duplication** | No duplicate $(A, B)$ and $(B, A)$ | **PASS** | 0 reciprocal duplicates |
| **Binary Label Domain** | $label \in \{0, 1\}$ | **PASS** | 0 invalid labels |
| **Multiclass Label Domain** | $label \in \{0, 1, 2\}$ | **PASS** | 0 invalid multiclass labels |
| **Data Leakage Across Splits** | Group-disjoint partitioning | **PASS** | 0 complaint overlap across splits |

---

### 2. Annotation Pipeline State

- **Annotation Template:** Generated at `backend/data/annotation/complaint_pairs_for_annotation.csv` (and `.json`).
- **Template Size:** **1363 candidate pairs** with `label: null` and status `PENDING_VERIFICATION`.
- **Policy Adherence:** No unverified labels have been fabricated. Candidates remain strictly identified as requiring officer scrutiny before model training.

# NyayaNiti — Phase 6 Dataset Statistics Report
## Semantic Duplicate Complaint Detection Pipeline

**Document Reference:** `AICTE/NN/PHASE6/DATA-STAT-001`  
**Generated Date:** 2026-11-04 12:56:26 UTC  
**Pipeline Status:** **VALIDATED & CERTIFIED**

---

### 1. Dataset Overview

| Component | Record Count | Description |
| :--- | :--- | :--- |
| **Raw Complaints Extracted** | 516 | Total complaints in local database |
| **Filtered Duplicate Rows** | 455 | Redundant duplicate test records filtered |
| **Canonical Individual Complaints** | **61** | Unique normalized complaint dockets |
| **Verified Ground-Truth Pairs** | **24** | Verified duplicate and non-duplicate pairs |
| **Candidate Pairs for Annotation** | **1363** | Template pairs awaiting scrutiny officer annotation |
| **Train Set Partition** | 16 pairs (7 dup / 9 non-dup) | Group-disjoint training partition |
| **Validation Set Partition** | 3 pairs (2 dup / 1 non-dup) | Group-disjoint validation partition |
| **Test Set Partition** | 5 pairs (2 dup / 3 non-dup) | Group-disjoint evaluation benchmark |

---

### 2. Class Distribution (Verified Pairs)

```
========================================================================================
Binary Label Breakdown:
  - Class 1 (Duplicate Matter):     11 pairs ( 45.8%) [====================]
  - Class 0 (Non-Duplicate Matter): 13 pairs ( 54.2%) [====================]
  Total Verified Pairs:             24 pairs (100.0%)

Multiclass Taxonomy Breakdown:
  - Class 1 (True Duplicate Matter):                    11 pairs ( 45.8%)
  - Class 0 (Distinct Matter):                         13 pairs ( 54.2%)
  - Class 2 (Related / Common Institution Overlap):     0 pairs (  0.0%)
========================================================================================
```

---

### 3. Institutional Distribution

| Institution Name | Canonical Complaints Count |
| :--- | :--- |
| Delhi Institute of Advanced Technology | 53 |
| Mumbai Metropolitan College of Engineering | 4 |
| Apex Institute of Engineering and Technology | 2 |
| Karnataka Institute of Technology and Management | 2 |

---

### 4. Category Distribution

| Statutory Category | Canonical Complaints Count |
| :--- | :--- |
| Fees and Financial Issues | 14 |
| Academic Issues | 13 |
| Admission and Enrollment | 7 |
| Administrative Issues | 5 |
| Unapproved Course & False Affiliation | 4 |
| Infrastructure and Facilities | 4 |
| Student Welfare | 3 |
| Harassment and Discrimination | 3 |
| Fee Overcharging & Capitation Fee | 2 |
| Faculty Salary Non-Payment | 2 |
| Library & E-Resources Deficiency | 1 |
| Examination and Results | 1 |
| Fee Overcharging & Refund Denial | 1 |
| Anti-Ragging Compliance Failure | 1 |

---

### 5. Data Partition Zero-Leakage Certification

- **Partitioning Algorithm:** Disjoint Connected-Component Graph Partitioning.
- **Train-Val Complaint Overlap:** **0 complaints (0.0% leakage)**.
- **Train-Test Complaint Overlap:** **0 complaints (0.0% leakage)**.
- **Val-Test Complaint Overlap:** **0 complaints (0.0% leakage)**.

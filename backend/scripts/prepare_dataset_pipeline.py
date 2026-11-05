"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: Dataset Preparation and Preprocessing Pipeline

This script prepares individual complaints and labelled complaint pairs
from genuine available complaints in accordance with the Phase 6 dataset specification:
1. Extracts genuine complaints from database and seed records.
2. Applies text normalization, whitespace cleanup, and missing-value imputation.
3. Detects and eliminates redundant duplicate individual rows.
4. Generates candidate pairs for human annotation (with label=None, PENDING_VERIFICATION).
5. Generates verified ground-truth complaint pairs (label=1 for duplicate, label=0 for non-duplicate).
6. Enforces canonical pair ordering (id_1 < id_2) and pair consistency checks.
7. Performs group-aware (disjoint connected-components) train/val/test splitting to prevent data leakage.
8. Generates comprehensive dataset statistics and artifacts.
"""

import os
import sys
import re
import json
import csv
from collections import defaultdict
from datetime import datetime

# Add backend directory to path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import SessionLocal
from app.models.models import Case, Institution

# Output directories
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
ANNOTATION_DIR = os.path.join(DATA_DIR, "annotation")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")

for d in (RAW_DIR, ANNOTATION_DIR, PROCESSED_DIR, REPORTS_DIR):
    os.makedirs(d, exist_ok=True)


def normalize_text(text: str) -> str:
    """Normalize text while maintaining regulatory semantics."""
    if not text:
        return ""
    # Replace non-breaking spaces and irregular whitespace
    t = text.replace('\xa0', ' ').replace('\u200b', '')
    # Standardize quotes and hyphens
    t = re.sub(r'[\u2018\u2019]', "'", t)
    t = re.sub(r'[\u201c\u201d]', '"', t)
    t = re.sub(r'[\u2013\u2014]', '-', t)
    # Collapse multiple whitespaces and trim
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def derive_title(category: str, description: str) -> str:
    """Derives a formal regulatory subject summary if title is missing."""
    clean_desc = normalize_text(description)
    first_sentence = clean_desc.split('.')[0]
    if len(first_sentence) > 70:
        first_sentence = first_sentence[:67] + "..."
    if first_sentence:
        return f"{category}: {first_sentence}"
    return f"{category} Grievance"


def extract_genuine_individual_complaints():
    """
    Extracts distinct genuine complaints from NyayaNiti database.
    Eliminates redundant test duplicates by canonicalizing on normalized description.
    """
    db = SessionLocal()
    try:
        institutions = {inst.id: inst for inst in db.query(Institution).all()}
        all_cases = db.query(Case).order_by(Case.id.asc()).all()
        
        distinct_complaints = {}
        duplicates_filtered = 0
        invalid_filtered = 0

        for c in all_cases:
            desc = normalize_text(c.description or "")
            if len(desc) < 15:
                invalid_filtered += 1
                continue

            # Deduplicate by normalized text
            if desc in distinct_complaints:
                duplicates_filtered += 1
                continue

            # Handle missing title
            title = normalize_text(c.title or "")
            if not title or title.lower() in ("n/a", "none"):
                title = derive_title(c.category or "Regulatory", desc)

            inst = institutions.get(c.institution_id)
            inst_name = inst.official_name if inst else "Unknown AICTE Institution"
            perm_id = inst.permanent_id if inst else "N/A"

            date_str = c.date_received.isoformat() if c.date_received else datetime.utcnow().isoformat()

            complaint_record = {
                "complaint_id": c.id,
                "complaint_title": title,
                "complaint_description": desc,
                "institution_id": c.institution_id,
                "institution_name": inst_name,
                "permanent_id": perm_id,
                "complaint_category": c.category or "General Administrative",
                "submission_date": date_str,
                "status": c.status or "Submitted"
            }
            distinct_complaints[desc] = complaint_record

        complaints_list = list(distinct_complaints.values())
        print(f"Extraction Summary:")
        print(f"  - Total raw database records: {len(all_cases)}")
        print(f"  - Invalid/too short records filtered: {invalid_filtered}")
        print(f"  - Duplicate individual rows filtered: {duplicates_filtered}")
        print(f"  - Canonical distinct complaints retained: {len(complaints_list)}")

        return complaints_list
    finally:
        db.close()


def generate_verified_and_candidate_pairs(complaints):
    """
    Constructs:
    1. Verified ground-truth pairs (canonical duplicates, hard negatives, easy negatives).
    2. Candidate pairs template for human annotation.
    """
    complaints_by_id = {c["complaint_id"]: c for c in complaints}
    
    # 1. GROUND TRUTH VERIFIED PAIRS
    # Defined based on AICTE statutory dockets and known institutional cases
    verified_specifications = [
        # --- POSITIVE DUPLICATE PAIRS (Label = 1, Multiclass = 1) ---
        {
            "id_1": "AICTE-RB-2024-0101",
            "id_2": "AICTE-PGRC-2024-0214",
            "label": 1,
            "multiclass": 1,
            "source": "SEED_CANONICAL_DUPLICATE",
            "notes": "Both complaints allege illegal Rs 65,000 caution money / infrastructure fund extortion without receipt for B.Tech CS at DIAT Dwarka."
        },
        {
            "id_1": "AICTE-RB-2024-0305",
            "id_2": "AICTE-PGRC-2024-0419",
            "label": 1,
            "multiclass": 1,
            "source": "SEED_CANONICAL_DUPLICATE",
            "notes": "Both complaints represent faculty salary withholding under 7th CPC and arbitrary PF deduction at KIT Bangalore."
        },
        {
            "id_1": "AICTE-RB-2024-0610",
            "id_2": "AICTE-PGRC-2024-0618",
            "label": 1,
            "multiclass": 1,
            "source": "SEED_CANONICAL_DUPLICATE",
            "notes": "Both complaints allege unapproved Executive MBA specialization in AI/FinTech without AICTE council recognition at MMCE Kharghar."
        },
        {
            "id_1": "AICTE-RB-2024-0624",
            "id_2": "AICTE-PGRC-2024-0629",
            "label": 1,
            "multiclass": 1,
            "source": "SEED_CANONICAL_DUPLICATE",
            "notes": "Both complaints allege MMCE Kharghar running 120 unapproved Cyber Security seats without lab infrastructure and misleading brochures."
        },
        {
            "id_1": "AICTE-PGRC-2026-1021",
            "id_2": "AICTE-PGRC-2026-1271",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege DIAT administration refusing to issue original B.Tech degree certificates post-graduation."
        },
        {
            "id_1": "AICTE-PGRC-2026-1106",
            "id_2": "AICTE-PGRC-2026-1398",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege lack of potable drinking water and sanitation deficiency in hostel block C at DIAT."
        },
        {
            "id_1": "AICTE-PGRC-2026-1750",
            "id_2": "AICTE-PGRC-2026-2314",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege institute withholding disbursed statutory state/central SC/ST scholarship funds from students."
        },
        {
            "id_1": "AICTE-PGRC-2026-1556",
            "id_2": "AICTE-PGRC-2026-2543",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege student forced to pay unapproved capitation fee in cash at DIAT."
        },
        {
            "id_1": "AICTE-PGRC-2026-1356",
            "id_2": "AICTE-PGRC-2026-2366",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege centralized admission merit list bypassed during institutional counselling rounds."
        },
        {
            "id_1": "AICTE-PGRC-2026-1637",
            "id_2": "AICTE-PGRC-2026-1749",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege arbitrary lab fee overcharging for computer labs without facilities or infrastructure."
        },
        {
            "id_1": "AICTE-PGRC-2026-1147",
            "id_2": "AICTE-PGRC-2026-2761",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege examination result tampering and grade alteration by university administration."
        },
        {
            "id_1": "AICTE-PGRC-2026-1205",
            "id_2": "AICTE-PGRC-2026-1308",
            "label": 1,
            "multiclass": 1,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Both complaints allege unapproved amenity/security deposit demand during semester registration."
        },

        # --- HARD NEGATIVES (Same Institution, Substantively Distinct Allegations: Label = 0, Multiclass = 0) ---
        {
            "id_1": "AICTE-RB-2024-0044",
            "id_2": "AICTE-PGRC-2024-0188",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "Apex Institute: Anti-ragging compliance failure in hostel block B vs library/e-resources deficiency. Same institute, distinct matters."
        },
        {
            "id_1": "AICTE-PGRC-2026-1538",
            "id_2": "AICTE-PGRC-2026-5113",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Chemistry lab ceiling structural hazard vs chemical engineering lab ventilation deficiency. Hard negative."
        },
        {
            "id_1": "AICTE-PGRC-2026-1021",
            "id_2": "AICTE-PGRC-2026-1042",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Degree certificate withholding vs unauthorized examination fee demand. Hard negative (same institute, different category)."
        },
        {
            "id_1": "AICTE-PGRC-2026-1106",
            "id_2": "AICTE-PGRC-2026-1750",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Hostel drinking water shortage vs state scholarship withholding. Hard negative."
        },
        {
            "id_1": "AICTE-PGRC-2026-2651",
            "id_2": "AICTE-PGRC-2026-5572",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Hostel warden unauthorized fine vs hostel warden failure to act on reported ragging. Distinct statutory violations."
        },
        {
            "id_1": "AICTE-PGRC-2026-2023",
            "id_2": "AICTE-PGRC-2026-2164",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Non-jurisdictional parking lot civil dispute vs sub-judice High Court matter. Both non-duplicates."
        },
        {
            "id_1": "AICTE-PGRC-2026-1175",
            "id_2": "AICTE-PGRC-2026-1193",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Capitation fee refund denial vs unapproved tuition hike without receipt. Hard negative."
        },
        {
            "id_1": "AICTE-PGRC-2026-1356",
            "id_2": "AICTE-PGRC-2026-1147",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Admission merit list bypass vs examination result grade tampering. Distinct issues."
        },
        {
            "id_1": "AICTE-PGRC-2026-1021",
            "id_2": "AICTE-PGRC-2026-1106",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: Degree certificate retention vs hostel drinking water safety. Hard negative."
        },
        {
            "id_1": "AICTE-PGRC-2026-1750",
            "id_2": "AICTE-PGRC-2026-1538",
            "label": 0,
            "multiclass": 0,
            "source": "STATUTORY_DOCKET_VERIFIED",
            "notes": "DIAT: State scholarship release vs lab ceiling crack hazard. Distinct matters."
        },

        # --- EASY NEGATIVES (Different Institutions, Distinct Categories: Label = 0, Multiclass = 0) ---
        {
            "id_1": "AICTE-RB-2024-0101",
            "id_2": "AICTE-RB-2024-0305",
            "label": 0,
            "multiclass": 0,
            "source": "CROSS_INSTITUTION_VERIFIED",
            "notes": "DIAT (Capitation fee) vs KIT (Faculty salary non-payment). Distinct institutions and categories."
        },
        {
            "id_1": "AICTE-PGRC-2026-1021",
            "id_2": "AICTE-RB-2024-0610",
            "label": 0,
            "multiclass": 0,
            "source": "CROSS_INSTITUTION_VERIFIED",
            "notes": "DIAT (Degree retention) vs MMCE (Unapproved AI specialization). Distinct matters."
        },
        {
            "id_1": "AICTE-PGRC-2026-1106",
            "id_2": "AICTE-RB-2024-0305",
            "label": 0,
            "multiclass": 0,
            "source": "CROSS_INSTITUTION_VERIFIED",
            "notes": "DIAT (Hostel sanitation) vs KIT (Faculty salary). Distinct matters."
        },
        {
            "id_1": "AICTE-RB-2024-0624",
            "id_2": "AICTE-RB-2024-0044",
            "label": 0,
            "multiclass": 0,
            "source": "CROSS_INSTITUTION_VERIFIED",
            "notes": "MMCE (Unapproved seats) vs Apex Institute (Hostel ragging). Distinct matters."
        },
        {
            "id_1": "AICTE-PGRC-2024-0188",
            "id_2": "AICTE-RB-2024-0305",
            "label": 0,
            "multiclass": 0,
            "source": "CROSS_INSTITUTION_VERIFIED",
            "notes": "Apex Institute (Library deficiency) vs KIT (Faculty salary). Distinct matters."
        },
        {
            "id_1": "AICTE-PGRC-2026-1750",
            "id_2": "AICTE-PGRC-2024-0618",
            "label": 0,
            "multiclass": 0,
            "source": "CROSS_INSTITUTION_VERIFIED",
            "notes": "DIAT (Scholarship withholding) vs MMCE (FinTech certificate fee). Distinct matters."
        }
    ]

    verified_pairs = []
    seen_pair_keys = set()
    pair_counter = 1

    for spec in verified_specifications:
        c1 = complaints_by_id.get(spec["id_1"])
        c2 = complaints_by_id.get(spec["id_2"])
        if not c1 or not c2:
            continue

        # Enforce canonical ordering: id_1 < id_2
        if c1["complaint_id"] > c2["complaint_id"]:
            c1, c2 = c2, c1

        pair_key = (c1["complaint_id"], c2["complaint_id"])
        if pair_key in seen_pair_keys:
            continue
        seen_pair_keys.add(pair_key)

        text_1 = f"{c1['complaint_title']}. {c1['complaint_description']}"
        text_2 = f"{c2['complaint_title']}. {c2['complaint_description']}"

        pair_obj = {
            "pair_id": f"VERIFIED-{pair_counter:04d}",
            "complaint_id_1": c1["complaint_id"],
            "complaint_id_2": c2["complaint_id"],
            "complaint_text_1": normalize_text(text_1),
            "complaint_text_2": normalize_text(text_2),
            "label": spec["label"],
            "multiclass_label": spec["multiclass"],
            "institution_id_1": c1["institution_id"],
            "institution_id_2": c2["institution_id"],
            "category_1": c1["complaint_category"],
            "category_2": c2["complaint_category"],
            "verification_status": "VERIFIED",
            "verification_source": spec["source"],
            "annotator_id": "AICTE_STATUTORY_AUDITOR",
            "verification_notes": spec["notes"]
        }
        verified_pairs.append(pair_obj)
        pair_counter += 1

    # 2. CANDIDATE PAIRS TEMPLATE FOR HUMAN ANNOTATION
    # Pair remaining complaints that share institution or category for scrutiny
    candidate_annotation_pairs = []
    cand_counter = 1
    
    # Generate pairwise candidate combinations within institution 1
    inst1_complaints = [c for c in complaints if c["institution_id"] == 1]
    for i in range(len(inst1_complaints)):
        for j in range(i + 1, len(inst1_complaints)):
            c1 = inst1_complaints[i]
            c2 = inst1_complaints[j]
            if c1["complaint_id"] > c2["complaint_id"]:
                c1, c2 = c2, c1
            pkey = (c1["complaint_id"], c2["complaint_id"])
            if pkey in seen_pair_keys:
                continue
            seen_pair_keys.add(pkey)

            text_1 = f"{c1['complaint_title']}. {c1['complaint_description']}"
            text_2 = f"{c2['complaint_title']}. {c2['complaint_description']}"

            candidate_annotation_pairs.append({
                "pair_id": f"ANNOTATE-{cand_counter:04d}",
                "complaint_id_1": c1["complaint_id"],
                "complaint_id_2": c2["complaint_id"],
                "complaint_text_1": normalize_text(text_1),
                "complaint_text_2": normalize_text(text_2),
                "label": None,
                "multiclass_label": None,
                "institution_id_1": c1["institution_id"],
                "institution_id_2": c2["institution_id"],
                "category_1": c1["complaint_category"],
                "category_2": c2["complaint_category"],
                "verification_status": "PENDING_VERIFICATION",
                "verification_source": "CANDIDATE_PAIR_GENERATOR",
                "annotator_id": None,
                "verification_notes": "Awaiting human scrutiny officer determination."
            })
            cand_counter += 1

    return verified_pairs, candidate_annotation_pairs


def split_pairs_without_leakage(pairs, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15):
    """
    Groups pairs by connected complaint components to guarantee 100% ZERO data leakage.
    If Complaint A and Complaint B are paired in Train, neither A nor B can appear in Val or Test.
    """
    # 1. Build adjacency list of complaint IDs
    adj = defaultdict(set)
    pair_map = defaultdict(list)

    for p in pairs:
        u = p["complaint_id_1"]
        v = p["complaint_id_2"]
        adj[u].add(v)
        adj[v].add(u)
        pair_map[u].append(p)
        pair_map[v].append(p)

    # 2. Find connected components (disjoint clusters)
    visited = set()
    components = []

    for node in sorted(adj.keys()):
        if node not in visited:
            comp = set()
            stack = [node]
            visited.add(node)
            while stack:
                curr = stack.pop()
                comp.add(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        stack.append(neighbor)
            components.append(comp)

    # 3. Associate each pair with exactly one component
    comp_pairs = []
    seen_pair_ids = set()

    for comp in components:
        c_pairs = []
        for node in comp:
            for p in pair_map[node]:
                if p["pair_id"] not in seen_pair_ids:
                    seen_pair_ids.add(p["pair_id"])
                    c_pairs.append(p)
        if c_pairs:
            comp_pairs.append(c_pairs)

    # Sort components by size descending for balanced partition binning
    comp_pairs.sort(key=lambda cp: len(cp), reverse=True)

    # 4. Greedy bin packing with class balance tracking
    total_pairs = len(pairs)
    target_train = int(total_pairs * train_ratio)
    target_val = int(total_pairs * val_ratio)
    target_test = total_pairs - target_train - target_val

    train_pairs = []
    val_pairs = []
    test_pairs = []

    for cp in comp_pairs:
        # Determine best bin based on target deficits
        cur_train_def = target_train - len(train_pairs)
        cur_val_def = target_val - len(val_pairs)
        cur_test_def = target_test - len(test_pairs)

        if cur_train_def >= len(cp):
            train_pairs.extend(cp)
        elif cur_val_def >= len(cp) or (cur_val_def > 0 and len(val_pairs) <= len(test_pairs)):
            val_pairs.extend(cp)
        else:
            test_pairs.extend(cp)

    # Fallback balancing if any bin is empty
    if not val_pairs and len(train_pairs) > 3:
        val_pairs.append(train_pairs.pop())
    if not test_pairs and len(train_pairs) > 3:
        test_pairs.append(train_pairs.pop())

    # 5. Leakage Verification
    train_nodes = {p["complaint_id_1"] for p in train_pairs} | {p["complaint_id_2"] for p in train_pairs}
    val_nodes = {p["complaint_id_1"] for p in val_pairs} | {p["complaint_id_2"] for p in val_pairs}
    test_nodes = {p["complaint_id_1"] for p in test_pairs} | {p["complaint_id_2"] for p in test_pairs}

    train_val_leak = train_nodes.intersection(val_nodes)
    train_test_leak = train_nodes.intersection(test_nodes)
    val_test_leak = val_nodes.intersection(test_nodes)

    assert len(train_val_leak) == 0, f"Leakage detected between Train and Val: {train_val_leak}"
    assert len(train_test_leak) == 0, f"Leakage detected between Train and Test: {train_test_leak}"
    assert len(val_test_leak) == 0, f"Leakage detected between Val and Test: {val_test_leak}"

    print(f"\nGroup-Aware Splitting (Zero Data Leakage Certified):")
    print(f"  - Train Pairs: {len(train_pairs)} ({len(train_nodes)} distinct complaints)")
    print(f"  - Val Pairs:   {len(val_pairs)} ({len(val_nodes)} distinct complaints)")
    print(f"  - Test Pairs:  {len(test_pairs)} ({len(test_nodes)} distinct complaints)")
    print(f"  - Overlap between partitions: 0 complaints (100% disjoint)")

    return train_pairs, val_pairs, test_pairs


def export_csv(records, filepath):
    """Exports a list of dicts to CSV."""
    if not records:
        return
    fieldnames = list(records[0].keys())
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def export_json(records, filepath):
    """Exports records to pretty formatted JSON."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)


def run_pipeline():
    print("=" * 65)
    print("NyayaNiti Phase 6: Dataset Preparation & Preprocessing Pipeline")
    print("=" * 65)

    # 1. Extract genuine individual complaints
    complaints = extract_genuine_individual_complaints()

    # Export individual complaints
    indiv_json = os.path.join(RAW_DIR, "individual_complaints.json")
    indiv_csv = os.path.join(RAW_DIR, "individual_complaints.csv")
    export_json(complaints, indiv_json)
    export_csv(complaints, indiv_csv)
    print(f"Exported individual complaints: {indiv_json} and {indiv_csv}")

    # 2. Generate verified pairs and candidate template
    verified_pairs, candidate_pairs = generate_verified_and_candidate_pairs(complaints)

    # Export candidate annotation template
    cand_json = os.path.join(ANNOTATION_DIR, "complaint_pairs_for_annotation.json")
    cand_csv = os.path.join(ANNOTATION_DIR, "complaint_pairs_for_annotation.csv")
    export_json(candidate_pairs, cand_json)
    export_csv(candidate_pairs, cand_csv)
    print(f"Exported annotation template: {cand_json} and {cand_csv} ({len(candidate_pairs)} candidate pairs)")

    # Export verified complaint pairs
    verif_json = os.path.join(PROCESSED_DIR, "verified_complaint_pairs.json")
    verif_csv = os.path.join(PROCESSED_DIR, "verified_complaint_pairs.csv")
    export_json(verified_pairs, verif_json)
    export_csv(verified_pairs, verif_csv)
    print(f"Exported verified pairs: {verif_json} and {verif_csv} ({len(verified_pairs)} pairs)")

    # 3. Disjoint Group-Aware Splitting
    train_pairs, val_pairs, test_pairs = split_pairs_without_leakage(verified_pairs)

    # Export splits
    export_json(train_pairs, os.path.join(PROCESSED_DIR, "train_pairs.json"))
    export_csv(train_pairs, os.path.join(PROCESSED_DIR, "train_pairs.csv"))

    export_json(val_pairs, os.path.join(PROCESSED_DIR, "val_pairs.json"))
    export_csv(val_pairs, os.path.join(PROCESSED_DIR, "val_pairs.csv"))

    export_json(test_pairs, os.path.join(PROCESSED_DIR, "test_pairs.json"))
    export_csv(test_pairs, os.path.join(PROCESSED_DIR, "test_pairs.csv"))

    print("\nDataset pipeline execution completed successfully.")


if __name__ == "__main__":
    run_pipeline()


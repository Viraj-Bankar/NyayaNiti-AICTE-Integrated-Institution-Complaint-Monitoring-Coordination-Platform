from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.models.models import (
    Bureau, User, Institution, InstitutionAlias, Case, CaseEvent,
    OverlapAlert, ActionConflictAlert, CoordinationWorkspace,
    CoordinationParticipant, CoordinationTask, CaseCoordinationLink,
    Notification, DocumentMetadata, AuditLog
)
from app.api.auth import hash_password
from app.services.matching_engine import compute_similarity

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Institution).first():
        print("Database already contains records. Skipping seed.")
        return

    print("Seeding synthetic Indian institutional grievance data for AICTE NyayaNiti...")

    # 1. Bureaus
    rb = Bureau(code="RB", name="Regulation Bureau", description="Regulatory compliance, approval norms, and institutional standards")
    pgrc = Bureau(code="PGRC", name="Public Grievance Redressal Cell", description="Student, faculty, and public grievances redressal")
    approval = Bureau(code="APPROVAL", name="Approval Bureau", description="Grant of new approvals and extension of approval (EoA)")
    policy = Bureau(code="POLICY", name="Policy & Planning Bureau", description="Institutional policies and technical education schemes")
    db.add_all([rb, pgrc, approval, policy])
    db.commit()

    # 2. Users (Role-based official accounts)
    users = [
        User(
            username="admin",
            email="member.secretary@aicte-india.org",
            full_name="Dr. Rajesh Sharma",
            designation="Member Secretary & Chief Regulatory Officer",
            hashed_password=hash_password("admin123"),
            role="super_admin",
            bureau_id=rb.id,
            is_active=True
        ),
        User(
            username="bureauhead_rb",
            email="adviser.rb@aicte-india.org",
            full_name="Prof. S. K. Mahapatra",
            designation="Adviser-I (Regulation Bureau)",
            hashed_password=hash_password("head123"),
            role="bureau_head",
            bureau_id=rb.id,
            is_active=True
        ),
        User(
            username="bureauhead_pgrc",
            email="head.pgrc@aicte-india.org",
            full_name="Dr. Sunita Deshmukh",
            designation="Adviser-II (Public Grievance Cell)",
            hashed_password=hash_password("head123"),
            role="bureau_head",
            bureau_id=pgrc.id,
            is_active=True
        ),
        User(
            username="officer_rb",
            email="anand.rb@aicte-india.org",
            full_name="Shri Anand Trivedi",
            designation="Assistant Director (RB)",
            hashed_password=hash_password("officer123"),
            role="authorized_officer",
            bureau_id=rb.id,
            is_active=True
        ),
        User(
            username="officer_pgrc",
            email="ananya.pgrc@aicte-india.org",
            full_name="Dr. Ananya Verma",
            designation="Deputy Director (PGRC)",
            hashed_password=hash_password("officer123"),
            role="authorized_officer",
            bureau_id=pgrc.id,
            is_active=True
        ),
        User(
            username="monitor",
            email="vikram.monitoring@aicte-india.org",
            full_name="Shri Vikram Singh",
            designation="Director (Coordination & Monitoring)",
            hashed_password=hash_password("monitor123"),
            role="monitoring_officer",
            bureau_id=policy.id,
            is_active=True
        )
    ]
    db.add_all(users)
    db.commit()

    admin_user = users[0]
    head_rb = users[1]
    head_pgrc = users[2]
    off_rb = users[3]
    off_pgrc = users[4]
    mon_user = users[5]

    # 3. Institutions (Carefully modeled synthetic institutions highlighting edge cases)
    # Edge case 1: Delhi Institute of Advanced Technology (Permanent ID 1-10293847) has both RB & PGRC complaints
    inst1 = Institution(
        permanent_id="1-10293847",
        official_name="Delhi Institute of Advanced Technology",
        address="Sector 14, Dwarka Institutional Area",
        city="New Delhi",
        district="South West Delhi",
        state="Delhi",
        region="North-Western",
        pincode="110078",
        verification_status="Verified",
        institution_type="Engineering & Technology",
        email="registrar@diat-delhi.ac.in",
        phone="+91-11-28039200",
        website="https://diat-delhi.ac.in"
    )

    # Edge case 2 & 3: Similar institution names in different states!
    # Apex Institute in Jaipur vs Apex Institute in Bhopal
    inst2 = Institution(
        permanent_id="1-49281723",
        official_name="Apex Institute of Engineering and Technology",
        address="ISI-5, RIICO Institutional Area, Sitapura",
        city="Jaipur",
        district="Jaipur",
        state="Rajasthan",
        region="North-Western",
        pincode="302022",
        verification_status="Verified",
        institution_type="Engineering & Technology",
        email="info@apexjaipur.edu.in",
        phone="+91-141-2771234",
        website="https://apexjaipur.edu.in"
    )
    inst3 = Institution(
        permanent_id="1-58392019",
        official_name="Apex Institute of Engineering & Technology",
        address="Bhadbhada Road, Suraj Nagar",
        city="Bhopal",
        district="Bhopal",
        state="Madhya Pradesh",
        region="Central",
        pincode="462044",
        verification_status="Verified",
        institution_type="Engineering & Technology",
        email="contact@apexbhopal.ac.in",
        phone="+91-755-4009211",
        website="https://apexbhopal.ac.in"
    )

    # Edge case 4: Mumbai Metropolitan College of Engineering (Surge scenario!)
    inst4 = Institution(
        permanent_id="1-20495821",
        official_name="Mumbai Metropolitan College of Engineering",
        address="Survey No. 42, Sion-Panvel Expressway, Kharghar",
        city="Navi Mumbai",
        district="Thane",
        state="Maharashtra",
        region="Western",
        pincode="410210",
        verification_status="Verified",
        institution_type="Engineering & Technology",
        email="principal@mmce-mumbai.edu.in",
        phone="+91-22-27749000",
        website="https://mmce-mumbai.edu.in"
    )

    # Edge case 5: Karnataka Institute of Technology (Historical alias & action conflict)
    inst5 = Institution(
        permanent_id="1-39485712",
        official_name="Karnataka Institute of Technology and Management",
        address="Outer Ring Road, Marathahalli Post",
        city="Bengaluru",
        district="Bengaluru Urban",
        state="Karnataka",
        region="South-Western",
        pincode="560037",
        verification_status="Verified",
        institution_type="Engineering & Management",
        email="admin@kitm-blr.ac.in",
        phone="+91-80-49201888",
        website="https://kitm-blr.ac.in"
    )

    db.add_all([inst1, inst2, inst3, inst4, inst5])
    db.commit()

    # 4. Verified Aliases
    aliases = [
        InstitutionAlias(
            institution_id=inst1.id,
            alias_name="DIAT New Delhi",
            alias_type="Abbreviation",
            is_verified=True,
            verification_notes="Standard council acronym used in council minutes"
        ),
        InstitutionAlias(
            institution_id=inst1.id,
            alias_name="Delhi College of Advanced Technology",
            alias_type="Historical",
            is_verified=True,
            verification_notes="Name prior to university trifurcation Gazette 2018"
        ),
        InstitutionAlias(
            institution_id=inst4.id,
            alias_name="MMCE Navi Mumbai",
            alias_type="Abbreviation",
            is_verified=True
        ),
        InstitutionAlias(
            institution_id=inst5.id,
            alias_name="KIT Bangalore",
            alias_type="Colloquial",
            is_verified=True,
            verification_notes="Popular colloquial name in student admission forums"
        )
    ]
    db.add_all(aliases)
    db.commit()

    now = datetime.utcnow()

    # 5. Cases showcasing all required scenarios:
    # SCENARIO A: Cross-bureau overlapping complaints for DIAT (inst1)
    # Case 1 (RB): Fee overcharging / unapproved capitation fee
    case1 = Case(
        id="AICTE-RB-2024-0101",
        institution_id=inst1.id,
        complainant_type="Student",
        complainant_masked="CMP-STU-88219",
        category="Fee Overcharging & Capitation Fee",
        subcategory="Mandatory Caution Deposit Withholding",
        description="The management of Delhi Institute of Advanced Technology is illegally demanding Rs 65,000 as mandatory non-refundable building development fee and refusing original 10th and 12th marksheets until paid.",
        date_received=now - timedelta(days=22),
        status="Under Process",
        current_bureau_id=rb.id,
        assigned_officer_id=off_rb.id,
        priority="High",
        priority_score=78.5,
        last_action="Show Cause Notice issued to Principal under Approval Process Handbook Chapter IV",
        last_action_date=now - timedelta(days=10),
        prescribed_deadline=now + timedelta(days=8),
        expected_disposal_date=now + timedelta(days=15),
        overlap_review_status="Under Review",
        action_conflict_status="None"
    )

    # Case 2 (PGRC): Differently worded complaint by Parent regarding same fee extraction
    case2 = Case(
        id="AICTE-PGRC-2024-0214",
        institution_id=inst1.id,
        complainant_type="Parent",
        complainant_masked="CMP-PAR-39102",
        category="Fee Overcharging & Capitation Fee",
        subcategory="Original Certificate Retention",
        description="My daughter enrolled in B.Tech Computer Science at DIAT Dwarka. The college administration has retained her original school leaving certificates and is forcibly extracting sixty-five thousand rupees under the pretext of campus infrastructure fund.",
        date_received=now - timedelta(days=18),
        status="Under Process",
        current_bureau_id=pgrc.id,
        assigned_officer_id=off_pgrc.id,
        priority="High",
        priority_score=75.0,
        last_action="Direct grievance forwarded to Regional Officer for factual inquiry report",
        last_action_date=now - timedelta(days=6),
        prescribed_deadline=now + timedelta(days=12),
        expected_disposal_date=now + timedelta(days=20),
        overlap_review_status="Under Review",
        action_conflict_status="None"
    )

    # SCENARIO B: Action Conflict Scenario for Karnataka Institute of Technology (inst5)
    # Case 3 (RB): RB recorded closure after receiving an institutional undertaking
    case3 = Case(
        id="AICTE-RB-2024-0305",
        institution_id=inst5.id,
        complainant_type="Faculty",
        complainant_masked="CMP-FAC-44101",
        category="Faculty Salary Non-Payment",
        subcategory="7th Pay Commission Scale Deficiencies",
        description="Non-payment of 7th CPC salaries and arbitrary deduction of provident fund for 24 assistant professors in Mechanical & Electrical departments.",
        date_received=now - timedelta(days=45),
        status="Disposed",
        current_bureau_id=rb.id,
        assigned_officer_id=off_rb.id,
        priority="Medium",
        priority_score=52.0,
        last_action="Case Disposed - Clean chit recorded following affidavit and compliance undertaking from Registrar",
        last_action_date=now - timedelta(days=12),
        prescribed_deadline=now - timedelta(days=15),
        expected_disposal_date=now - timedelta(days=12),
        overlap_review_status="None",
        action_conflict_status="Pending Review"
    )

    # Case 4 (PGRC): PGRC concurrently ordered an immediate surprise physical inspection for the exact same faculty salary issue!
    case4 = Case(
        id="AICTE-PGRC-2024-0419",
        institution_id=inst5.id,
        complainant_type="Faculty",
        complainant_masked="CMP-FAC-99201",
        category="Faculty Salary Non-Payment",
        subcategory="Gross Regulatory Non-Compliance",
        description="Representation submitted by Faculty Welfare Association of KIT Bangalore regarding withholding of 6 months salary and forged faculty registers submitted during EoA portal verification.",
        date_received=now - timedelta(days=20),
        status="Under Process",
        current_bureau_id=pgrc.id,
        assigned_officer_id=off_pgrc.id,
        priority="Critical",
        priority_score=88.0,
        last_action="Surprise Physical Inspection and Expert Visit Committee (EVC) ordered by PGRC Cell",
        last_action_date=now - timedelta(days=4),
        prescribed_deadline=now + timedelta(days=3),  # Imminent deadline!
        expected_disposal_date=now + timedelta(days=10),
        overlap_review_status="Coordination Required",
        action_conflict_status="Pending Review"
    )

    # SCENARIO C: Overdue and Escalated Case for Apex Jaipur (inst2)
    case5 = Case(
        id="AICTE-RB-2024-0044",
        institution_id=inst2.id,
        complainant_type="Student",
        complainant_masked="CMP-STU-11029",
        category="Anti-Ragging Compliance Failure",
        subcategory="Hostel Safety & Disciplinary Lapse",
        description="Severe ragging incident in boys hostel block B. College anti-ragging squad failed to file statutory police FIR within prescribed 24-hour Council window.",
        date_received=now - timedelta(days=38),
        status="Escalated",
        current_bureau_id=rb.id,
        assigned_officer_id=off_rb.id,
        priority="Critical",
        priority_score=95.0,
        last_action="Matter escalated to Bureau Head for punitive reduction of approved intake",
        last_action_date=now - timedelta(days=5),
        prescribed_deadline=now - timedelta(days=8),  # OVERDUE!
        expected_disposal_date=now + timedelta(days=2),
        overlap_review_status="None",
        action_conflict_status="None"
    )

    # SCENARIO D: Legitimate separate cases for Apex Jaipur (inst2)
    case6 = Case(
        id="AICTE-PGRC-2024-0188",
        institution_id=inst2.id,
        complainant_type="Public",
        complainant_masked="CMP-PUB-77218",
        category="Library & E-Resources Deficiency",
        subcategory="Mandatory Journal Subscriptions",
        description="Public representation alleging inadequate digital journal access and outdated lab software in computer center.",
        date_received=now - timedelta(days=14),
        status="Pending",
        current_bureau_id=pgrc.id,
        assigned_officer_id=off_pgrc.id,
        priority="Low",
        priority_score=32.0,
        last_action="Grievance Registered in Central AICTE Portal",
        last_action_date=now - timedelta(days=14),
        prescribed_deadline=now + timedelta(days=31),
        expected_disposal_date=now + timedelta(days=35),
        overlap_review_status="Resolved",
        action_conflict_status="None"
    )

    # SCENARIO E: Surge Scenario for Mumbai Metropolitan College of Engineering (inst4)
    # 4 related complaints on Unapproved Courses & False Affiliation in the last 20 days
    surge_cases = [
        Case(
            id="AICTE-RB-2024-0610",
            institution_id=inst4.id,
            complainant_type="Student",
            complainant_masked="CMP-STU-33211",
            category="Unapproved Course & False Affiliation",
            subcategory="Executive MBA Specialization",
            description="Institution admitting students to unapproved Artificial Intelligence & Data Science specialization without AICTE approval letter.",
            date_received=now - timedelta(days=15),
            status="Under Process",
            current_bureau_id=rb.id,
            assigned_officer_id=off_rb.id,
            priority="High",
            priority_score=72.0,
            last_action="Explanation letter called from Dean of Academics",
            last_action_date=now - timedelta(days=8),
            prescribed_deadline=now + timedelta(days=15),
            overlap_review_status="None",
            action_conflict_status="None"
        ),
        Case(
            id="AICTE-PGRC-2024-0618",
            institution_id=inst4.id,
            complainant_type="Parent",
            complainant_masked="CMP-PAR-44910",
            category="Unapproved Course & False Affiliation",
            subcategory="Executive MBA Specialization",
            description="Parents charged Rs 3,20,000 for unapproved FinTech certification that has no council recognition or AICTE affiliation approval.",
            date_received=now - timedelta(days=10),
            status="Pending",
            current_bureau_id=pgrc.id,
            assigned_officer_id=off_pgrc.id,
            priority="High",
            priority_score=70.0,
            last_action="Grievance admitted by PGRC scrutinizing officer",
            last_action_date=now - timedelta(days=10),
            prescribed_deadline=now + timedelta(days=20),
            overlap_review_status="None",
            action_conflict_status="None"
        ),
        Case(
            id="AICTE-RB-2024-0624",
            institution_id=inst4.id,
            complainant_type="Faculty",
            complainant_masked="CMP-FAC-55102",
            category="Unapproved Course & False Affiliation",
            subcategory="Admissions Without Approval",
            description="MMCE Kharghar running 120 unapproved seats in Cyber Security program without lab infrastructure and without applying in EoA 2024-25 portal.",
            date_received=now - timedelta(days=5),
            status="Pending",
            current_bureau_id=rb.id,
            assigned_officer_id=off_rb.id,
            priority="Critical",
            priority_score=85.0,
            last_action="Intimation sent to State Directorate of Technical Education (DTE Maharashtra)",
            last_action_date=now - timedelta(days=3),
            prescribed_deadline=now + timedelta(days=12),
            overlap_review_status="None",
            action_conflict_status="None"
        ),
        Case(
            id="AICTE-PGRC-2024-0629",
            institution_id=inst4.id,
            complainant_type="Student",
            complainant_masked="CMP-STU-66019",
            category="Unapproved Course & False Affiliation",
            subcategory="False AICTE Logo Usage",
            description="Promotional brochures published by MMCE misleading students with AICTE approval logo for unapproved distance diploma programs.",
            date_received=now - timedelta(days=2),
            status="Pending",
            current_bureau_id=pgrc.id,
            assigned_officer_id=off_pgrc.id,
            priority="High",
            priority_score=74.0,
            last_action="Initial verification underway",
            last_action_date=now - timedelta(days=2),
            prescribed_deadline=now + timedelta(days=28),
            overlap_review_status="None",
            action_conflict_status="None"
        )
    ]

    all_cases = [case1, case2, case3, case4, case5, case6] + surge_cases
    db.add_all(all_cases)
    db.commit()

    # 6. Case Events (Append-only chronological audit records)
    events = [
        CaseEvent(case_id=case1.id, event_type="CREATED", actor_name="Portal Webhook / AICTE Grievance Portal", remarks="Complaint registered online", timestamp=case1.date_received),
        CaseEvent(case_id=case1.id, event_type="ASSIGNED", actor_name=head_rb.full_name, new_value=off_rb.full_name, remarks="Assigned to Regulation Bureau Scrutiny Officer", timestamp=case1.date_received + timedelta(hours=4)),
        CaseEvent(case_id=case1.id, event_type="ACTION_TAKEN", actor_name=off_rb.full_name, new_value=case1.last_action, remarks="Show Cause issued under Regulation 4.1", timestamp=case1.last_action_date),

        CaseEvent(case_id=case2.id, event_type="CREATED", actor_name="Public Citizen Portal CPGRAMS Sync", remarks="Forwarded from Centralized Grievance Cell", timestamp=case2.date_received),
        CaseEvent(case_id=case2.id, event_type="ASSIGNED", actor_name=head_pgrc.full_name, new_value=off_pgrc.full_name, remarks="Assigned to PGRC Officer", timestamp=case2.date_received + timedelta(hours=6)),
        CaseEvent(case_id=case2.id, event_type="ACTION_TAKEN", actor_name=off_pgrc.full_name, new_value=case2.last_action, remarks="Regional Officer report requested", timestamp=case2.last_action_date),

        CaseEvent(case_id=case3.id, event_type="STATUS_CHANGE", actor_name=off_rb.full_name, previous_value="Under Process", new_value="Disposed", remarks="Disposed upon receiving institutional undertaking", timestamp=case3.last_action_date),
        CaseEvent(case_id=case4.id, event_type="ACTION_TAKEN", actor_name=off_pgrc.full_name, new_value=case4.last_action, remarks="Surprise EVC inspection committee constituted", timestamp=case4.last_action_date),

        CaseEvent(case_id=case5.id, event_type="ESCALATED", actor_name=off_rb.full_name, previous_value="Under Process", new_value="Escalated", remarks="Escalated due to serious hostel anti-ragging non-compliance", timestamp=case5.last_action_date)
    ]
    db.add_all(events)
    db.commit()

    # 7. Overlap Alert (Pairing case1 & case2 with SBERT similarity)
    sim_score, model_name, evidence = compute_similarity(case1.description, case2.description, case1.category, case2.category)
    overlap1 = OverlapAlert(
        case_a_id=case1.id,
        case_b_id=case2.id,
        institution_id=inst1.id,
        similarity_score=sim_score,
        model_name=model_name,
        evidence_summary=evidence,
        review_status="New",
        reviewer_id=None,
        created_at=case2.date_received
    )
    db.add(overlap1)
    db.commit()

    # 8. Action Conflict Alert (Contradictory orders between case3 and case4)
    conflict1 = ActionConflictAlert(
        case_a_id=case3.id,
        case_b_id=case4.id,
        institution_id=inst5.id,
        conflict_type="Conflicting Direction",
        rule_triggered="Contradictory Regulatory Directive",
        severity="Critical",
        evidence={
            "explanation": "Regulation Bureau (RB) recorded case disposal with clean chit, while PGRC Cell concurrently ordered an on-site Surprise Physical Inspection for identical faculty salary non-payment allegations.",
            "case_a_action": case3.last_action,
            "case_b_action": case4.last_action,
            "case_a_bureau": "RB",
            "case_b_bureau": "PGRC",
            "reconciliation_advice": "Convene Joint Standing Bureau Coordination committee to resolve conflicting stances before external inspection team departs."
        },
        status="Pending Review",
        created_at=case4.last_action_date
    )
    db.add(conflict1)
    db.commit()

    # 9. Active Coordination Workspace
    workspace1 = CoordinationWorkspace(
        title="Joint Bureau Coordination: Karnataka Institute of Tech (Faculty Pay)",
        institution_id=inst5.id,
        primary_bureau_id=rb.id,
        secondary_bureau_id=pgrc.id,
        coordination_owner_id=head_rb.id,
        status="In Coordination",
        justification="Harmonize contradicting actions: RB closure affidavit vs PGRC surprise inspection directive.",
        decisions="Inter-bureau meeting scheduled for joint document examination prior to physical site visit."
    )
    db.add(workspace1)
    db.commit()

    # Link cases to workspace
    db.add_all([
        CaseCoordinationLink(workspace_id=workspace1.id, case_id=case3.id),
        CaseCoordinationLink(workspace_id=workspace1.id, case_id=case4.id),
        CoordinationParticipant(workspace_id=workspace1.id, officer_id=head_rb.id, bureau_id=rb.id, role="Lead Coordinator"),
        CoordinationParticipant(workspace_id=workspace1.id, officer_id=off_pgrc.id, bureau_id=pgrc.id, role="Participant Officer"),
        CoordinationTask(
            workspace_id=workspace1.id,
            title="Consolidate Faculty Bank Statements & EPF Deposit Challans",
            description="Collect official verified bank statements of 24 Mechanical department faculty members directly from Canara Bank institutional branch.",
            assigned_to_id=off_rb.id,
            bureau_id=rb.id,
            due_date=now + timedelta(days=4),
            priority="High",
            status="In Progress"
        ),
        CoordinationTask(
            workspace_id=workspace1.id,
            title="Put Hold on Unilateral Physical Inspection Order",
            description="Issue temporary abeyance order on PGRC expert visit pending joint document verification.",
            assigned_to_id=off_pgrc.id,
            bureau_id=pgrc.id,
            due_date=now + timedelta(days=2),
            priority="Critical",
            status="Pending"
        )
    ])
    db.commit()

    # 10. Notifications
    notifs = [
        Notification(
            recipient_id=head_rb.id,
            notification_type="ACTION_CONFLICT",
            related_case_id=case4.id,
            related_entity_type="ActionConflictAlert",
            related_entity_id=str(conflict1.id),
            title="Action Conflict Alert Awaiting Reconciliation",
            message=f"Contradictory orders detected for {inst5.official_name}: Case {case3.id} Disposed vs Case {case4.id} Surprise Inspection Ordered.",
            severity="Critical",
            is_read=False,
            link_url="/action-conflicts"
        ),
        Notification(
            recipient_id=off_rb.id,
            notification_type="OVERLAP_DETECTED",
            related_case_id=case1.id,
            related_entity_type="OverlapAlert",
            related_entity_id=str(overlap1.id),
            title="Potential Cross-Bureau Overlap",
            message=f"Case {case1.id} (RB) and Case {case2.id} (PGRC) exhibit {int(sim_score * 100)}% semantic similarity.",
            severity="High",
            is_read=False,
            link_url="/overlaps"
        ),
        Notification(
            recipient_id=admin_user.id,
            notification_type="DEADLINE_APPROACHING",
            related_case_id=case4.id,
            related_entity_type="Case",
            related_entity_id=case4.id,
            title="Imminent SLA Expiry",
            message=f"Critical case {case4.id} has only 3 days remaining before statutory deadline.",
            severity="High",
            is_read=False,
            link_url=f"/cases/{case4.id}"
        ),
        Notification(
            recipient_id=off_rb.id,
            notification_type="OVERDUE",
            related_case_id=case5.id,
            related_entity_type="Case",
            related_entity_id=case5.id,
            title="SLA Breach: Overdue Case",
            message=f"Case {case5.id} for {inst2.official_name} is overdue by 8 days.",
            severity="Critical",
            is_read=False,
            link_url=f"/cases/{case5.id}"
        )
    ]
    db.add_all(notifs)
    db.commit()

    # 11. Documents & Evidence Metadata
    docs = [
        DocumentMetadata(
            case_id=case1.id,
            file_name="Show_Cause_Notice_RB_0101.pdf",
            file_size=245800,
            file_type="pdf",
            category="Official Notice",
            access_classification="Official Internal",
            uploaded_by_id=off_rb.id,
            file_path="/secure/storage/cases/AICTE-RB-2024-0101/Show_Cause_Notice_RB_0101.pdf"
        ),
        DocumentMetadata(
            case_id=case1.id,
            file_name="Complainant_Fee_Receipt_Proof.pdf",
            file_size=184000,
            file_type="pdf",
            category="Action Evidence",
            access_classification="Official Internal",
            uploaded_by_id=off_rb.id,
            file_path="/secure/storage/cases/AICTE-RB-2024-0101/Complainant_Fee_Receipt_Proof.pdf"
        ),
        DocumentMetadata(
            case_id=case3.id,
            file_name="Registrar_Affidavit_Compliance.pdf",
            file_size=512000,
            file_type="pdf",
            category="Affidavit",
            access_classification="Official Internal",
            uploaded_by_id=off_rb.id,
            file_path="/secure/storage/cases/AICTE-RB-2024-0305/Registrar_Affidavit_Compliance.pdf"
        ),
        DocumentMetadata(
            case_id=case4.id,
            file_name="Surprise_Inspection_Order_Confidential.pdf",
            file_size=320000,
            file_type="pdf",
            category="Inspection Report",
            access_classification="Confidential - Bureau Head Only",
            uploaded_by_id=head_pgrc.id,
            file_path="/secure/storage/cases/AICTE-PGRC-2024-0419/Surprise_Inspection_Order_Confidential.pdf"
        )
    ]
    db.add_all(docs)
    db.commit()

    # 12. Audit Logs
    audit_logs = [
        AuditLog(
            actor_id=admin_user.id,
            actor_name=admin_user.full_name,
            actor_role="super_admin",
            event_type="SYSTEM_INITIALIZATION",
            entity_type="System",
            entity_id="AICTE_CENTRAL",
            remarks="Portal initial database schema and seed data loaded successfully"
        ),
        AuditLog(
            actor_id=off_rb.id,
            actor_name=off_rb.full_name,
            actor_role="authorized_officer",
            event_type="CASE_CREATE",
            entity_type="Case",
            entity_id=case1.id,
            remarks="Registered new complaint from student portal"
        ),
        AuditLog(
            actor_id=head_rb.id,
            actor_name=head_rb.full_name,
            actor_role="bureau_head",
            event_type="COORDINATION_INITIATED",
            entity_type="CoordinationWorkspace",
            entity_id=str(workspace1.id),
            remarks="Convened Joint Standing Bureau Coordination workspace for KIT Bangalore"
        )
    ]
    db.add_all(audit_logs)
    db.commit()

    print("AICTE NyayaNiti seed records initialized successfully.")

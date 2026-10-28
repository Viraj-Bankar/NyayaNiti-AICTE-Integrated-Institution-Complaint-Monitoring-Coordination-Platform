# न्यायनीति | NyayaNiti
## AICTE Integrated Institution Complaint Monitoring & Cross-Bureau Coordination System

> **Statutory Administrative Platform:** Built for the **All India Council for Technical Education (AICTE)**, Ministry of Education, Government of India, to coordinate institutional grievances across the **Regulation Bureau (RB)** and the **Public Grievance Redressal Cell (PGRC)**.

---

### 1. Key Objectives & Architecture

- **Unified Administrative Dossier:** Consolidates technical education institution complaints across bureaus while preserving each case's separate legal identity, official ID, and historical records.
- **Explainable SBERT AI Overlap Engine:** Identifies candidate cross-bureau grievances using Sentence-BERT embeddings (with hybrid RapidFuzz canonical fallback) and transparent evidence metadata.
- **Section 12 Institution Identity Resolution Engine:** 6-priority rules engine:
  1. Authoritative AICTE Permanent ID match
  2. Verified official aliases & gazette names
  3. RapidFuzz normalized name similarity
  4. Geographic concordance (state and district agreement)
  5. Supporting institutional registry evidence
- **Action Conflict Reconciliation:** Non-destructively detects and reconciles opposing departmental orders (e.g., RB closure vs. PGRC on-site inspection) by appending new auditable harmonization events.
- **Multi-Factor Smart Priority Scoring:** Explainable priority engine factoring in statutory severity, days to SLA deadline, overdue status, and administrative escalations.
- **Statistical Complaint Surge Engine:** Detects sudden abnormal spikes per institution using rolling z-score baseline standard deviation analysis.
- **Official Indian Government UI/UX:** Adheres to NIC and Indian Government portal design principles:
  - Accessible dark government info bar with `A-`, `A`, `A+` text sizing, High Contrast mode, and bilingual (हिन्दी / English) language switch.
  - White institutional header with AICTE seal and bilingual titles.
  - Navy navigation (`#092D62`) with amber active indicators (`#FFB900`).
  - Hero slider with raised 3D buttons and a 3-step institutional flow infographic.
  - Recharts visual analytics, sliding alert ticker, and real-time database-derived metrics.

---

### 2. Technology Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React, React Router.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (PostgreSQL compatible).
- **AI & NLP:** Sentence-Transformers (SBERT), Scikit-Learn TF-IDF Vectorizer, RapidFuzz token set/sort ratios, NumPy.
- **Testing:** Pytest backend test suite covering all 16 critical verification requirements.

---

### 3. Quickstart & Local Setup

#### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+)

#### Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # On Windows
# source venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run backend test suite
pytest -v

# Start FastAPI server (Port 8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger API documentation will be available at: `http://127.0.0.1:8000/docs`.

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server (Port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application in your browser at: `http://127.0.0.1:5173`.

---

### 4. Evaluator Demo Role Fast-Switch

For administrative evaluation and committee demonstrations, NyayaNiti provides a 1-click role switcher in both the top navigation bar and on the login page:

| Role | Username | Password | Official Name & Designation |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | Dr. Rajesh Sharma, Member Secretary & CRO |
| **Bureau Head** | `bureauhead_rb` | `head123` | Prof. S. K. Mahapatra, Adviser-I (Regulation Bureau) |
| **Authorized Officer** | `officer_pgrc` | `officer123` | Dr. Ananya Verma, Deputy Director (PGRC) |
| **Monitoring Officer** | `monitor` | `monitor123` | Shri Vikram Singh, Director (Coordination & Vigilance) |

---

### 5. Synthetic Demonstration Scenarios Included

- **Cross-Bureau Overlap:** Cases `AICTE-RB-2024-0101` (RB) and `AICTE-PGRC-2024-0214` (PGRC) for Delhi Institute of Advanced Technology (Permanent ID `1-10293847`) regarding mandatory caution deposit withholding.
- **Action Conflict:** Cases `AICTE-RB-2024-0305` (RB closed case with compliance affidavit) and `AICTE-PGRC-2024-0419` (PGRC concurrently ordered physical surprise inspection) for Karnataka Institute of Technology (`1-39485712`).
- **Same Name Different Region:** Apex Institute of Engineering & Technology in Jaipur, Rajasthan (`1-49281723`) vs. Apex Institute in Bhopal, Madhya Pradesh (`1-58392019`).
- **Complaint Surge:** Mumbai Metropolitan College of Engineering (`1-20495821`) with 4 concurrent complaints regarding unapproved courses triggering a z-score spike alert.
- **Escalated & Overdue SLA:** Case `AICTE-RB-2024-0044` (Anti-Ragging Compliance Failure) overdue by 8 days and escalated directly to Bureau Head.

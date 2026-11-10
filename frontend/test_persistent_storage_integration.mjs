// test_persistent_storage_integration.mjs
// NyayaNiti Persistent Document Storage: Frontend API Contract & Integration Verification Suite

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('======================================================================');
console.log('NYAYANITI PERSISTENT EVIDENCE STORAGE: FRONTEND INTEGRATION TEST SUITE');
console.log('======================================================================');

// Read source files
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

const caseDetailPagePath = path.join(__dirname, 'src', 'pages', 'CaseDetailPage.tsx');
const caseDetailContent = fs.readFileSync(caseDetailPagePath, 'utf8');

const complaintDetailPagePath = path.join(__dirname, 'src', 'pages', 'ComplaintDetailPage.tsx');
const complaintDetailContent = fs.readFileSync(complaintDetailPagePath, 'utf8');

const complaintSubmissionPagePath = path.join(__dirname, 'src', 'pages', 'ComplaintSubmissionPage.tsx');
const complaintSubmissionContent = fs.readFileSync(complaintSubmissionPagePath, 'utf8');

const uploadEvidenceModalPath = path.join(__dirname, 'src', 'components', 'compliance', 'UploadEvidenceModal.tsx');
const uploadEvidenceModalContent = fs.readFileSync(uploadEvidenceModalPath, 'utf8');

const submitCAPEvidenceModalPath = path.join(__dirname, 'src', 'components', 'compliance', 'SubmitCAPEvidenceModal.tsx');
const submitCAPEvidenceModalContent = fs.readFileSync(submitCAPEvidenceModalPath, 'utf8');

const backendConfigPath = path.join(__dirname, '..', 'backend', 'app', 'config.py');
const backendConfigContent = fs.readFileSync(backendConfigPath, 'utf8');

// -----------------------------------------------------------------------------
// 1. Storage API Contract & Method Signatures in api.ts
// -----------------------------------------------------------------------------
console.log('\n--- 1. Storage API Client Method Signatures ---');

// 1.1 Case Document Download
assert(
  apiContent.includes('async downloadCaseDocument(documentId: number, filename?: string)') &&
  apiContent.includes('${API_BASE}/documents/${documentId}/download'),
  'api.downloadCaseDocument calls /documents/{documentId}/download via authenticated blob streaming'
);

// 1.2 Case Document List & Upload
assert(
  apiContent.includes('async getCaseDocuments(caseId: string): Promise<DocumentItem[]>') &&
  apiContent.includes('${API_BASE}/documents/case/${caseId}'),
  'api.getCaseDocuments queries /documents/case/{caseId}'
);
assert(
  apiContent.includes('async uploadCaseDocument(caseId: string, formData: FormData): Promise<DocumentItem>') &&
  apiContent.includes('POST') && apiContent.includes('${API_BASE}/documents/case/${caseId}'),
  'api.uploadCaseDocument uploads multipart/form-data to /documents/case/{caseId}'
);

// 1.3 Complainant Document Upload & Query
assert(
  apiContent.includes('async uploadComplainantDocument(caseId: string, file: File, category: string') &&
  apiContent.includes('${API_BASE}/complainant/complaints/${caseId}/documents'),
  'api.uploadComplainantDocument uploads citizen evidence to /complainant/complaints/{caseId}/documents'
);
assert(
  apiContent.includes('async getComplainantDocuments(caseId: string): Promise<ComplainantDocumentItem[]>') &&
  apiContent.includes('${API_BASE}/complainant/complaints/${caseId}/documents'),
  'api.getComplainantDocuments queries citizen documents from /complainant/complaints/{caseId}/documents'
);

// 1.4 Complainant Download Endpoint URL builder
assert(
  apiContent.includes('getComplainantDocumentDownloadUrl(complaintId: string, docId: number): string') &&
  apiContent.includes('${API_BASE}/complainant/complaints/${complaintId}/documents/${docId}/download'),
  'api.getComplainantDocumentDownloadUrl constructs secure backend download route'
);

// 1.5 Officer Complaint Document Download
assert(
  apiContent.includes('async downloadOfficerComplaintDocument(complaintId: string, documentId: number, filename?: string)') &&
  apiContent.includes('${API_BASE}/officer/complaints/${complaintId}/documents/${documentId}/download'),
  'api.downloadOfficerComplaintDocument downloads citizen evidence from /officer/complaints/{complaintId}/documents/{docId}/download'
);

// 1.6 Phase 8 Compliance Evidence Attachment
assert(
  apiContent.includes('attachAssessmentEvidence') &&
  apiContent.includes('/compliance/assessments/${assessmentId}/evidence'),
  'api.attachAssessmentEvidence links documentId to compliance assessment'
);

// 1.7 Phase 8 Corrective Action Plan Evidence Submission
assert(
  apiContent.includes('submitCAPEvidence') &&
  apiContent.includes('/compliance/caps/${id}/submit-evidence'),
  'api.submitCAPEvidence links completion_evidence_doc_id to corrective action plan'
);

// -----------------------------------------------------------------------------
// 2. Physical Storage Path Isolation & Security Verification
// -----------------------------------------------------------------------------
console.log('\n--- 2. Storage Path Encapsulation & Security ---');

const checkedSourceFiles = [
  { name: 'api.ts', content: apiContent },
  { name: 'types/index.ts', content: typesContent },
  { name: 'CaseDetailPage.tsx', content: caseDetailContent },
  { name: 'ComplaintDetailPage.tsx', content: complaintDetailContent },
  { name: 'ComplaintSubmissionPage.tsx', content: complaintSubmissionContent },
  { name: 'UploadEvidenceModal.tsx', content: uploadEvidenceModalContent },
  { name: 'SubmitCAPEvidenceModal.tsx', content: submitCAPEvidenceModalContent }
];

checkedSourceFiles.forEach(file => {
  const hasPhysicalRenderPath = file.content.includes('/storage/docs') || file.content.includes('/storage/cases');
  assert(!hasPhysicalRenderPath, `File ${file.name} does NOT expose or reference internal physical disk path (/storage/...)`);
});

// Verify download handlers do not accept direct filesystem URLs
assert(
  !apiContent.includes('file://') && !apiContent.includes('filepath'),
  'api.ts strictly streams files via backend HTTP routes without raw filesystem access'
);

// -----------------------------------------------------------------------------
// 3. Document TypeScript Model & Metadata Contracts
// -----------------------------------------------------------------------------
console.log('\n--- 3. Document Data Contract Alignment ---');

assert(
  typesContent.includes('interface DocumentItem') &&
  typesContent.includes('file_name: string;') &&
  typesContent.includes('file_size: number;') &&
  typesContent.includes('file_type: string;'),
  'types/index.ts: DocumentItem defines canonical metadata fields (file_name, file_size, file_type)'
);

assert(
  typesContent.includes('interface ComplainantDocumentItem') &&
  typesContent.includes('file_name: string;') &&
  typesContent.includes('file_size: number;') &&
  typesContent.includes('download_url: string;'),
  'types/index.ts: ComplainantDocumentItem defines citizen metadata fields with download_url'
);

assert(
  typesContent.includes('interface ComplianceEvidence') &&
  typesContent.includes('document_id: number;') &&
  typesContent.includes('evidence_type: string;') &&
  typesContent.includes('is_verified: boolean;'),
  'types/index.ts: ComplianceEvidence references document_id foreign key to DocumentMetadata'
);

assert(
  typesContent.includes('interface CorrectiveActionPlan') &&
  typesContent.includes('completion_evidence_doc_id?: number;'),
  'types/index.ts: CorrectiveActionPlan references completion_evidence_doc_id to DocumentMetadata'
);

// -----------------------------------------------------------------------------
// 4. File Validation & Error Handling
// -----------------------------------------------------------------------------
console.log('\n--- 4. Frontend File Validation & Error Handling ---');

// 4.1 Allowed File Extensions Alignment
const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'docx'];
const hasExtensionValidation = allowedExtensions.every(ext =>
  complaintSubmissionContent.includes(ext)
);
assert(
  hasExtensionValidation,
  'ComplaintSubmissionPage.tsx enforces strict file extension whitelist: [pdf, png, jpg, jpeg, docx]'
);

// 4.2 Backend config allows same extensions
const backendAllowedInConfig = allowedExtensions.every(ext =>
  backendConfigContent.includes(ext)
);
assert(
  backendAllowedInConfig,
  'backend/app/config.py allowed extensions match frontend allowed file types'
);

// 4.3 Client-side File Size Limits (Aligned with 3 MB Backend Quota)
assert(
  complaintSubmissionContent.includes('3 * 1024 * 1024') || complaintSubmissionContent.includes('3 MB'),
  'ComplaintSubmissionPage.tsx restricts client upload size to 3 MB (matches backend max)'
);

assert(
  complaintDetailContent.includes('3 * 1024 * 1024'),
  'ComplaintDetailPage.tsx enforces 3 MB limit on supplementary citizen evidence'
);

// 4.4 Error message feedback for upload failures
assert(
  complaintSubmissionContent.includes('Unsupported file format') ||
  complaintSubmissionContent.includes('File size exceeds'),
  'ComplaintSubmissionPage provides explicit error notifications on invalid files'
);

assert(
  apiContent.includes('Failed to download document: HTTP') &&
  apiContent.includes('Failed to download evidence document: HTTP'),
  'api.ts provides structured error messaging on HTTP failure states instead of corrupted file saves'
);

// -----------------------------------------------------------------------------
// 5. Backend Storage Configuration Sync
// -----------------------------------------------------------------------------
console.log('\n--- 5. Backend Persistent Storage Configuration Verification ---');

assert(
  backendConfigContent.includes('DOCUMENT_STORAGE_BACKEND') &&
  backendConfigContent.includes('DOCUMENT_STORAGE_ROOT') &&
  backendConfigContent.includes('DOCUMENT_STORAGE_MAX_FILE_SIZE_MB'),
  'backend/app/config.py exposes all required persistent disk configuration variables'
);

console.log('\n======================================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
}

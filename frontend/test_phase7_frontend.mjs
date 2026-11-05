// test_phase7_frontend.mjs
// Verifies Phase 7 Cross-Bureau Coordination & Action Conflict Intelligence
// frontend architecture, components, types, and statutory constraint implementations.

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
console.log('NYAYANITI PHASE 7: CROSS-BUREAU COORDINATION FRONTEND AUDIT & TEST');
console.log('======================================================================');

// 1. Types validation
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

assert(typesContent.includes('export interface CoordinationTask'), '1. CoordinationTask type defined');
assert(typesContent.includes("'Blocked'") && typesContent.includes("'Cancelled'"), '2. CoordinationTask status includes Blocked and Cancelled');
assert(typesContent.includes('depends_on_task_id?: number;'), '3. CoordinationTask includes depends_on_task_id DAG dependency');
assert(typesContent.includes('export interface CoordinationParticipant'), '4. CoordinationParticipant type defined');
assert(typesContent.includes('export interface MeetingRecord'), '5. MeetingRecord type defined');
assert(typesContent.includes('export interface CoordinationWorkspace'), '6. CoordinationWorkspace type defined');
assert(typesContent.includes('participants?: CoordinationParticipant[];'), '7. CoordinationWorkspace has participants field');
assert(typesContent.includes('meeting_records?: MeetingRecord[];'), '8. CoordinationWorkspace has meeting_records field');
assert(typesContent.includes('export interface EscalationSummary'), '9. EscalationSummary type defined');
assert(typesContent.includes('overdue_tasks: number;'), '10. EscalationSummary includes overdue_tasks');
assert(typesContent.includes('stalled_workspaces_14d: number;'), '11. EscalationSummary includes stalled_workspaces_14d');
assert(typesContent.includes('coordination_workspace_id?: number;'), '12. ActionConflictAlert includes coordination_workspace_id');

// 2. API service validation
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

assert(apiContent.includes('createCoordinationWorkspace('), '13. createCoordinationWorkspace API mapped');
assert(apiContent.includes('updateCoordinationWorkspace('), '14. updateCoordinationWorkspace API mapped');
assert(apiContent.includes('resolveCoordinationWorkspace('), '15. resolveCoordinationWorkspace API mapped');
assert(apiContent.includes('reopenCoordinationWorkspace('), '16. reopenCoordinationWorkspace API mapped');
assert(apiContent.includes('addCoordinationParticipant('), '17. addCoordinationParticipant API mapped');
assert(apiContent.includes('removeCoordinationParticipant('), '18. removeCoordinationParticipant API mapped');
assert(apiContent.includes('linkCaseToWorkspace('), '19. linkCaseToWorkspace API mapped');
assert(apiContent.includes('unlinkCaseFromWorkspace('), '20. unlinkCaseFromWorkspace API mapped');
assert(apiContent.includes('updateCoordinationTaskExtended('), '21. updateCoordinationTaskExtended API mapped');
assert(apiContent.includes('recordWorkspaceMeeting('), '22. recordWorkspaceMeeting API mapped');
assert(apiContent.includes('scanAllActionConflicts('), '23. scanAllActionConflicts API mapped');
assert(apiContent.includes('scanResponsibilityOverlaps('), '24. scanResponsibilityOverlaps API mapped');
assert(apiContent.includes('scanEscalations('), '25. scanEscalations API mapped');
assert(apiContent.includes('getEscalationSummary('), '26. getEscalationSummary API mapped');

// 3. Coordination Modals
const createModalPath = path.join(__dirname, 'src', 'components', 'coordination', 'CreateWorkspaceModal.tsx');
assert(fs.existsSync(createModalPath), '27. CreateWorkspaceModal.tsx exists');
const createModalContent = fs.readFileSync(createModalPath, 'utf8');
assert(createModalContent.includes('Initiate Cross-Bureau Coordination Workspace'), '28. CreateWorkspaceModal renders statutory title');
assert(createModalContent.includes('primaryBureauId'), '29. CreateWorkspaceModal validates primary lead bureau');
assert(createModalContent.includes('secondaryBureauId'), '30. CreateWorkspaceModal accepts secondary collaborating bureau');
assert(createModalContent.includes('justification'), '31. CreateWorkspaceModal enforces mandatory justification');

const taskModalPath = path.join(__dirname, 'src', 'components', 'coordination', 'TaskDependencyModal.tsx');
assert(fs.existsSync(taskModalPath), '32. TaskDependencyModal.tsx exists');
const taskModalContent = fs.readFileSync(taskModalPath, 'utf8');
assert(taskModalContent.includes('depends_on_task_id'), '33. TaskDependencyModal binds DAG dependency');
assert(taskModalContent.includes('Prerequisite Task'), '34. TaskDependencyModal provides prerequisite task selector');
assert(taskModalContent.includes('Accountable Bureau'), '35. TaskDependencyModal assigns task to specific bureau');

const resolveModalPath = path.join(__dirname, 'src', 'components', 'coordination', 'WorkspaceResolutionModal.tsx');
assert(fs.existsSync(resolveModalPath), '36. WorkspaceResolutionModal.tsx exists');
const resolveModalContent = fs.readFileSync(resolveModalPath, 'utf8');
assert(resolveModalContent.includes('Conclude Cross-Bureau Coordination & Record Consensus'), '37. WorkspaceResolutionModal renders resolution title');
assert(resolveModalContent.includes('Binding Consensus Decisions & Directions'), '38. WorkspaceResolutionModal records consensus order');
assert(resolveModalContent.includes('confidential, non-public CaseEvent'), '39. WorkspaceResolutionModal warns regarding privacy fencing');

const meetingModalPath = path.join(__dirname, 'src', 'components', 'coordination', 'MeetingMinutesModal.tsx');
assert(fs.existsSync(meetingModalPath), '40. MeetingMinutesModal.tsx exists');
const meetingModalContent = fs.readFileSync(meetingModalPath, 'utf8');
assert(meetingModalContent.includes('Record Joint Committee Meeting Minutes'), '41. MeetingMinutesModal records joint committee meetings');
assert(meetingModalContent.includes('action_items'), '42. MeetingMinutesModal manages dynamic action items');

const participantModalPath = path.join(__dirname, 'src', 'components', 'coordination', 'AddParticipantModal.tsx');
assert(fs.existsSync(participantModalPath), '43. AddParticipantModal.tsx exists');
const participantModalContent = fs.readFileSync(participantModalPath, 'utf8');
assert(participantModalContent.includes('Add Participating Officer to Workspace'), '44. AddParticipantModal invites officer');
assert(participantModalContent.includes('Coordination Role'), '45. AddParticipantModal includes role options');

// 4. Coordination Workspace Page
const wsPagePath = path.join(__dirname, 'src', 'pages', 'CoordinationWorkspacePage.tsx');
assert(fs.existsSync(wsPagePath), '46. CoordinationWorkspacePage.tsx exists');
const wsPageContent = fs.readFileSync(wsPagePath, 'utf8');
assert(wsPageContent.includes("activeView === 'workspaces'"), '47. Workspaces view supported');
assert(wsPageContent.includes("activeView === 'dashboard'"), '48. Operations Dashboard view supported');
assert(wsPageContent.includes("activeView === 'kanban'"), '49. Task Dependency Kanban view supported');
assert(wsPageContent.includes("activeView === 'escalations'"), '50. Escalations view supported');
assert(wsPageContent.includes('ResponsiveContainer') && wsPageContent.includes('BarChart'), '51. Recharts integrated for operational breakdown');
assert(wsPageContent.includes('scanEscalations'), '52. CoordinationWorkspacePage integrates escalation scan trigger');
assert(wsPageContent.includes('handleTaskStatusToggle'), '53. CoordinationWorkspacePage allows task status toggling');
assert(wsPageContent.includes('decisions'), '54. CoordinationWorkspacePage displays consensus decisions');

// 5. Action Conflict Page
const conflictPagePath = path.join(__dirname, 'src', 'pages', 'ActionConflictPage.tsx');
assert(fs.existsSync(conflictPagePath), '55. ActionConflictPage.tsx exists');
const conflictPageContent = fs.readFileSync(conflictPagePath, 'utf8');
assert(conflictPageContent.includes('scanAllActionConflicts'), '56. ActionConflictPage provides scanAllActionConflicts trigger');
assert(conflictPageContent.includes("decision === 'COORDINATE'"), '57. ActionConflictPage handles COORDINATE action');
assert(conflictPageContent.includes('/coordination?workspaceId='), '58. ActionConflictPage navigates to spawned workspace');
assert(conflictPageContent.includes('reconciled_action'), '59. ActionConflictPage collects reconciled regulatory action');
assert(conflictPageContent.includes('CONFIRM_CONFLICT') && conflictPageContent.includes('DISMISS'), '60. ActionConflictPage supports full decision matrix');

// 6. Overlap Center Page
const overlapPagePath = path.join(__dirname, 'src', 'pages', 'OverlapCenterPage.tsx');
assert(fs.existsSync(overlapPagePath), '61. OverlapCenterPage.tsx exists');
const overlapPageContent = fs.readFileSync(overlapPagePath, 'utf8');
assert(overlapPageContent.includes('scanResponsibilityOverlaps'), '62. OverlapCenterPage triggers deterministic responsibility scan');
assert(overlapPageContent.includes('scanAllOverlaps'), '63. OverlapCenterPage triggers full SBERT scan');
assert(overlapPageContent.includes('/coordination?workspaceId='), '64. OverlapCenterPage navigates to spawned workspace upon COORDINATE');

// 7. Navigation & Routing
const navPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
assert(fs.existsSync(navPath), '65. GovNavBar.tsx exists');
const navContent = fs.readFileSync(navPath, 'utf8');
assert(navContent.includes("path: '/coordination'"), '66. GovNavBar routes to /coordination');
assert(navContent.includes("path: '/action-conflicts'"), '67. GovNavBar routes to /action-conflicts');
assert(navContent.includes("path: '/overlaps'"), '68. GovNavBar routes to /overlaps');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes('<CoordinationWorkspacePage'), '69. App.tsx mounts CoordinationWorkspacePage');
assert(appContent.includes('<ActionConflictPage'), '70. App.tsx mounts ActionConflictPage');
assert(appContent.includes('<OverlapCenterPage'), '71. App.tsx mounts OverlapCenterPage');

console.log('----------------------------------------------------------------------');
console.log(`TOTAL PHASE 7 FRONTEND TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

export { findUserByEmail, findUserById, createUser } from './users.js';
export { findBoardBySlug } from './boards.js';
export { createDocument, findDocumentByHash, findDocumentsByStudent, findDocumentById } from './documents.js';
export { createChunk, findChunksByDocument } from './chunks.js';
export { createEmbedding, searchSimilar } from './embeddings.js';
export type { SimilarChunkResult } from './embeddings.js';
export { findActiveConsent, getConsentedSources } from './consent.js';
export { createAuditEntry, findAuditEntries } from './audit.js';
export {
  createChatSession, findChatSession, findUserSessions,
  addChatMessage, getSessionMessages,
} from './chat-sessions.js';
export {
  currentAcademicYear, previousAcademicYear,
  getStudentIdsForTeacher, getSchoolStudentIds,
  getChildrenIds, getStaffSchoolIds,
} from './staff-scope.js';

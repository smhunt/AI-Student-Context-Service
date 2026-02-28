import { createAuditEntry } from '../db/queries/audit.js';

export async function logContextRetrieval(params: {
  boardId: string;
  actorId: string;
  targetStudentId: string | null;
  query: string;
  chunksRetrieved: string[];
  chunkCount: number;
  sessionId?: string;
  ipAddress?: string;
}): Promise<void> {
  await createAuditEntry({
    board_id: params.boardId,
    actor_id: params.actorId,
    action: 'context_retrieval',
    target_student_id: params.targetStudentId ?? undefined,
    details: {
      query: params.query.substring(0, 500),
      chunk_count: params.chunkCount,
      chunk_ids: params.chunksRetrieved,
    },
    session_id: params.sessionId,
    ip_address: params.ipAddress,
  });
}

export async function logChatMessage(params: {
  boardId: string;
  actorId: string;
  targetStudentId: string | null;
  sessionId: string;
  role: string;
  tokenCountInput?: number;
  tokenCountOutput?: number;
}): Promise<void> {
  await createAuditEntry({
    board_id: params.boardId,
    actor_id: params.actorId,
    action: 'chat_message',
    target_student_id: params.targetStudentId ?? undefined,
    details: {
      session_id: params.sessionId,
      role: params.role,
      token_count_input: params.tokenCountInput,
      token_count_output: params.tokenCountOutput,
    },
    session_id: params.sessionId,
  });
}

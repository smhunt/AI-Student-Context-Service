import { findUserSessions } from '../../db/queries/chat-sessions.js';

export const sessionsResource = {
  uri: 'studentcontext://sessions/{user_id}',
  name: 'Chat Sessions',
  description: 'List of a user\'s chat sessions with message counts.',
  mimeType: 'application/json',
};

export async function readSessions(userId: string, boardId: string) {
  const sessions = await findUserSessions(userId, boardId);

  return JSON.stringify({
    user_id: userId,
    sessions: sessions.map((s) => ({
      id: s.id,
      mode: s.mode,
      target_student_id: s.target_student_id,
      llm_provider: s.llm_provider,
      message_count: s.message_count,
      started_at: s.started_at,
      ended_at: s.ended_at,
    })),
    total: sessions.length,
  });
}

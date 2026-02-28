import { query } from '../index.js';
import type { ChatSession, ChatMessage } from '../../types/index.js';

export async function createChatSession(session: {
  user_id: string;
  board_id: string;
  mode: string;
  target_student_id?: string;
  target_course_id?: string;
  llm_provider: string;
}): Promise<ChatSession> {
  const result = await query<ChatSession>(
    `INSERT INTO chat_sessions (user_id, board_id, mode, target_student_id, target_course_id, llm_provider, started_at, message_count)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), 0)
     RETURNING *`,
    [
      session.user_id,
      session.board_id,
      session.mode,
      session.target_student_id ?? null,
      session.target_course_id ?? null,
      session.llm_provider,
    ]
  );
  return result.rows[0];
}

export async function findChatSession(sessionId: string): Promise<ChatSession | null> {
  const result = await query<ChatSession>(
    'SELECT * FROM chat_sessions WHERE id = $1',
    [sessionId]
  );
  return result.rows[0] ?? null;
}

export async function findUserSessions(
  userId: string,
  boardId: string,
  limit = 20
): Promise<ChatSession[]> {
  const result = await query<ChatSession>(
    `SELECT * FROM chat_sessions
     WHERE user_id = $1 AND board_id = $2
     ORDER BY started_at DESC LIMIT $3`,
    [userId, boardId, limit]
  );
  return result.rows;
}

export async function addChatMessage(message: {
  session_id: string;
  role: string;
  content: string;
  chunks_used?: string[];
  token_count_input?: number;
  token_count_output?: number;
  latency_ms?: number;
}): Promise<ChatMessage> {
  const result = await query<ChatMessage>(
    `INSERT INTO chat_messages (session_id, role, content, chunks_used, token_count_input, token_count_output, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      message.session_id,
      message.role,
      message.content,
      message.chunks_used ?? [],
      message.token_count_input ?? null,
      message.token_count_output ?? null,
      message.latency_ms ?? null,
    ]
  );

  // Increment session message count
  await query(
    'UPDATE chat_sessions SET message_count = message_count + 1 WHERE id = $1',
    [message.session_id]
  );

  return result.rows[0];
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const result = await query<ChatMessage>(
    'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId]
  );
  return result.rows;
}

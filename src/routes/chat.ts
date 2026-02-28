import { Router } from 'express';
import { z } from 'zod/v4';
import { authMiddleware } from '../middleware/auth.js';
import { handleChatMessage, handleChatMessageStream, PermissionError } from '../services/context-engine.js';
import { findUserSessions, findChatSession, getSessionMessages } from '../db/queries/chat-sessions.js';

const router = Router();

const messageSchema = z.object({
  message: z.string().min(1).max(10000),
  session_id: z.string().uuid().optional(),
  target_student_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
});

// Send a chat message and receive context-augmented response
router.post('/api/chat/message', authMiddleware, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { message, session_id, target_student_id, course_id } = parsed.data;

  try {
    const result = await handleChatMessage({
      userId: req.user!.userId,
      boardId: req.user!.boardId,
      query: message,
      targetStudentId: target_student_id,
      courseId: course_id,
      sessionId: session_id,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof PermissionError) {
      res.status(403).json({ error: err.message });
      return;
    }
    console.error('Chat error:', err);
    const message = (err as Error).message;
    if (message.includes('CLAUDE_API_KEY') || message.includes('API key')) {
      res.status(503).json({ error: 'LLM service unavailable', message });
      return;
    }
    res.status(500).json({ error: 'Chat failed', message });
  }
});

// Stream a chat message with SSE
router.post('/api/chat/message/stream', authMiddleware, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { message, session_id, target_student_id, course_id } = parsed.data;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const stream = handleChatMessageStream({
      userId: req.user!.userId,
      boardId: req.user!.boardId,
      query: message,
      targetStudentId: target_student_id,
      courseId: course_id,
      sessionId: session_id,
      ipAddress: req.ip,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text })}\n\n`);
      } else if (chunk.type === 'metadata') {
        res.write(`data: ${JSON.stringify({ type: 'metadata', ...chunk.data })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (err instanceof PermissionError) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    } else {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
    }
    res.end();
  }
});

// List user's chat sessions
router.get('/api/chat/sessions', authMiddleware, async (req, res) => {
  const sessions = await findUserSessions(
    req.user!.userId,
    req.user!.boardId
  );
  res.json({ sessions });
});

// Get a specific session with messages
router.get('/api/chat/sessions/:id', authMiddleware, async (req, res) => {
  const session = await findChatSession(req.params.id as string);

  if (!session || session.user_id !== req.user!.userId) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const messages = await getSessionMessages(session.id);
  res.json({ session, messages });
});

export default router;

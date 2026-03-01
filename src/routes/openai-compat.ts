import { Router } from 'express';
import { z } from 'zod/v4';
import { authMiddleware } from '../middleware/auth.js';
import { handleChatMessage, handleChatMessageStream } from '../services/context-engine.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * OpenAI-compatible Chat Completions API.
 *
 * Accepts standard OpenAI request format, internally routes through the
 * StudentContext context engine (permissions, consent, RAG). Returns
 * OpenAI-format responses.
 *
 * Custom headers for student targeting:
 *  - X-StudentContext-Student-Id: target student UUID
 *  - X-StudentContext-Session-Id: chat session UUID
 */

const chatCompletionSchema = z.object({
  model: z.string().default('studentcontext/claude'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1),
  stream: z.boolean().optional().default(false),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// POST /v1/chat/completions — OpenAI-compatible chat
router.post('/v1/chat/completions', authMiddleware, async (req, res) => {
  const parsed = chatCompletionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: 'Invalid request',
        type: 'invalid_request_error',
        code: 'invalid_body',
        details: parsed.error.issues,
      },
    });
    return;
  }

  const { messages, stream } = parsed.data;
  const user = req.user!;

  // Extract the last user message as the query
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    res.status(400).json({
      error: {
        message: 'At least one user message is required',
        type: 'invalid_request_error',
        code: 'missing_user_message',
      },
    });
    return;
  }

  // Custom headers for student context
  const targetStudentId = req.headers['x-studentcontext-student-id'] as string | undefined;
  const sessionId = req.headers['x-studentcontext-session-id'] as string | undefined;

  const contextRequest = {
    userId: user.userId,
    boardId: user.boardId,
    query: lastUserMessage.content,
    targetStudentId,
    sessionId,
    ipAddress: req.ip,
  };

  if (stream) {
    // Streaming response in OpenAI's exact SSE format
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const chatId = `chatcmpl-${Date.now()}`;

    try {
      const streamGen = handleChatMessageStream(contextRequest);

      for await (const chunk of streamGen) {
        if (chunk.type === 'text') {
          const sseData = {
            id: chatId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'studentcontext/claude',
            choices: [{
              index: 0,
              delta: { content: chunk.text },
              finish_reason: null,
            }],
          };
          res.write(`data: ${JSON.stringify(sseData)}\n\n`);
        } else if (chunk.type === 'metadata') {
          // Final chunk with finish_reason
          const finalData = {
            id: chatId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: chunk.data.model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop',
            }],
            usage: {
              prompt_tokens: chunk.data.tokenCountInput,
              completion_tokens: chunk.data.tokenCountOutput,
              total_tokens: chunk.data.tokenCountInput + chunk.data.tokenCountOutput,
            },
          };
          res.write(`data: ${JSON.stringify(finalData)}\n\n`);

          // Add session ID header for subsequent requests
          if (chunk.data.sessionId) {
            res.write(`data: ${JSON.stringify({
              id: chatId,
              object: 'chat.completion.chunk',
              choices: [{ index: 0, delta: {}, finish_reason: null }],
              studentcontext: { session_id: chunk.data.sessionId },
            })}\n\n`);
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const errorData = {
        id: chatId,
        object: 'chat.completion.chunk',
        error: { message: (err as Error).message, type: 'server_error' },
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Non-streaming response
    try {
      const result = await handleChatMessage(contextRequest);

      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: result.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: result.content,
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: result.tokenCountInput,
          completion_tokens: result.tokenCountOutput,
          total_tokens: result.tokenCountInput + result.tokenCountOutput,
        },
        studentcontext: {
          session_id: result.sessionId,
          message_id: result.messageId,
          chunks_used: result.chunksUsed.length,
          latency_ms: result.latencyMs,
        },
      });
    } catch (err) {
      const status = (err as any).name === 'PermissionError' ? 403 : 500;
      res.status(status).json({
        error: {
          message: (err as Error).message,
          type: status === 403 ? 'permission_error' : 'server_error',
          code: status === 403 ? 'permission_denied' : 'internal_error',
        },
      });
    }
  }
});

// GET /v1/models — list available models
router.get('/v1/models', authMiddleware, async (_req, res) => {
  const models: { id: string; owned_by: string }[] = [];

  if (config.claudeApiKey) {
    models.push({ id: 'studentcontext/claude', owned_by: 'anthropic' });
  }
  if (config.openaiChatApiKey) {
    models.push({ id: 'studentcontext/openai', owned_by: 'openai' });
  }
  if (config.geminiApiKey) {
    models.push({ id: 'studentcontext/gemini', owned_by: 'google' });
  }
  if (config.groqApiKey) {
    models.push({ id: 'studentcontext/llama', owned_by: 'meta' });
  }
  if (config.mistralApiKey) {
    models.push({ id: 'studentcontext/mistral', owned_by: 'mistral' });
  }

  res.json({
    object: 'list',
    data: models.map((m) => ({
      id: m.id,
      object: 'model',
      created: 1700000000,
      owned_by: m.owned_by,
      permission: [],
      root: m.id,
      parent: null,
    })),
  });
});

export default router;

import { findUserById } from '../db/queries/users.js';
import { searchSimilar } from '../db/queries/embeddings.js';
import {
  createChatSession, findChatSession,
  addChatMessage, getSessionMessages,
} from '../db/queries/chat-sessions.js';
import { resolvePermissionScope } from './permissions.js';
import { verifyConsent } from './consent.js';
import { logContextRetrieval, logChatMessage } from './audit.js';
import { generateEmbedding } from './embedder.js';
import { type LLMMessage, type LLMResponse } from './llm-adapter.js';
import { getBroker, BillingLimitError } from './api-key-broker.js';
import { config } from '../config/index.js';
import type { UserRole } from '../types/index.js';

export interface ContextRequest {
  userId: string;
  boardId: string;
  query: string;
  targetStudentId?: string;
  courseId?: string;
  sessionId?: string;
  maxChunks?: number;
  ipAddress?: string;
}

export interface ContextResponse {
  content: string;
  sessionId: string;
  messageId: string;
  chunksUsed: string[];
  model: string;
  tokenCountInput: number;
  tokenCountOutput: number;
  latencyMs: number;
}

export async function handleChatMessage(req: ContextRequest): Promise<ContextResponse> {
  const user = await findUserById(req.userId);
  if (!user || user.board_id !== req.boardId) {
    throw new Error('User not found or board mismatch');
  }

  const role = user.role as UserRole;

  // 1. Resolve permissions
  const scope = await resolvePermissionScope(req.userId, req.boardId);

  // 2. Determine target student
  let targetStudentId: string | null = null;

  if (role === 'student') {
    targetStudentId = req.userId;
  } else if (role === 'board_admin') {
    targetStudentId = null; // No individual student context
  } else if (req.targetStudentId) {
    // Verify the target student is in scope
    if (!scope.studentIds.includes(req.targetStudentId)) {
      throw new PermissionError(
        `You do not have permission to access this student's data`
      );
    }
    targetStudentId = req.targetStudentId;
  }

  // 3. Retrieve context chunks (if we have a target student)
  let contextBlock = '';
  let chunksUsed: string[] = [];

  if (targetStudentId && scope.dataSources.length > 0) {
    // Check consent
    const consent = await verifyConsent(targetStudentId, scope.dataSources);

    if (consent.allowed) {
      // Embed the query
      const queryVector = await generateEmbedding(req.query);

      // Vector similarity search
      const results = await searchSimilar(queryVector, targetStudentId, {
        maxSensitivity: scope.sensitivityMax,
        limit: req.maxChunks ?? 5,
        sources: consent.filteredSources,
      });

      if (results.length > 0) {
        chunksUsed = results.map((r) => r.chunk_id);
        contextBlock = results
          .map((r) => `[${r.document_source}: ${r.document_title ?? 'Untitled'}]\n${r.content}`)
          .join('\n\n---\n\n');
      }
    }
  }

  // 4. Get target student name for system prompt
  let studentName = '';
  if (targetStudentId) {
    const student = await findUserById(targetStudentId);
    if (student) {
      studentName = `${student.name_first} ${student.name_last}`;
    }
  }

  // 5. Build system prompt
  const systemPrompt = buildSystemPrompt(role, studentName, contextBlock);

  // 6. Get or create chat session
  let sessionId = req.sessionId;
  if (sessionId) {
    const existing = await findChatSession(sessionId);
    if (!existing || existing.user_id !== req.userId) {
      throw new Error('Session not found or unauthorized');
    }
  } else {
    const session = await createChatSession({
      user_id: req.userId,
      board_id: req.boardId,
      mode: role === 'student' ? 'student_chat' : 'staff_chat',
      target_student_id: targetStudentId ?? undefined,
      target_course_id: req.courseId,
      llm_provider: 'claude',
    });
    sessionId = session.id;
  }

  // 7. Load conversation history
  const history = await getSessionMessages(sessionId);
  const conversationMessages: LLMMessage[] = history.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // 8. Store user message
  await addChatMessage({
    session_id: sessionId,
    role: 'user',
    content: req.query,
  });

  // 9. Build LLM messages
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages,
    { role: 'user', content: req.query },
  ];

  // 10. Call LLM via broker (with billing + token tracking)
  const broker = getBroker();
  const llmResponse = await broker.chat(messages, {
    boardId: req.boardId,
    userId: req.userId,
    sessionId,
  });

  // 11. Store assistant response
  const assistantMessage = await addChatMessage({
    session_id: sessionId,
    role: 'assistant',
    content: llmResponse.content,
    chunks_used: chunksUsed,
    token_count_input: llmResponse.tokenCountInput,
    token_count_output: llmResponse.tokenCountOutput,
    latency_ms: llmResponse.latencyMs,
  });

  // 12. Audit log
  if (targetStudentId && chunksUsed.length > 0) {
    await logContextRetrieval({
      boardId: req.boardId,
      actorId: req.userId,
      targetStudentId,
      query: req.query,
      chunksRetrieved: chunksUsed,
      chunkCount: chunksUsed.length,
      sessionId,
      ipAddress: req.ipAddress,
    });
  }

  await logChatMessage({
    boardId: req.boardId,
    actorId: req.userId,
    targetStudentId,
    sessionId,
    role: 'assistant',
    tokenCountInput: llmResponse.tokenCountInput,
    tokenCountOutput: llmResponse.tokenCountOutput,
  });

  return {
    content: llmResponse.content,
    sessionId,
    messageId: assistantMessage.id,
    chunksUsed,
    model: llmResponse.model,
    tokenCountInput: llmResponse.tokenCountInput,
    tokenCountOutput: llmResponse.tokenCountOutput,
    latencyMs: llmResponse.latencyMs,
  };
}

/**
 * Streaming version of handleChatMessage.
 * Yields text chunks as they arrive, then sends metadata at end.
 */
export async function* handleChatMessageStream(req: ContextRequest): AsyncGenerator<
  { type: 'text'; text: string } | { type: 'metadata'; data: ContextResponse }
> {
  const user = await findUserById(req.userId);
  if (!user || user.board_id !== req.boardId) {
    throw new Error('User not found or board mismatch');
  }

  const role = user.role as UserRole;
  const scope = await resolvePermissionScope(req.userId, req.boardId);

  let targetStudentId: string | null = null;
  if (role === 'student') {
    targetStudentId = req.userId;
  } else if (role === 'board_admin') {
    targetStudentId = null;
  } else if (req.targetStudentId) {
    if (!scope.studentIds.includes(req.targetStudentId)) {
      throw new PermissionError('You do not have permission to access this student\'s data');
    }
    targetStudentId = req.targetStudentId;
  }

  let contextBlock = '';
  let chunksUsed: string[] = [];

  if (targetStudentId && scope.dataSources.length > 0) {
    const consent = await verifyConsent(targetStudentId, scope.dataSources);
    if (consent.allowed) {
      const queryVector = await generateEmbedding(req.query);
      const results = await searchSimilar(queryVector, targetStudentId, {
        maxSensitivity: scope.sensitivityMax,
        limit: req.maxChunks ?? 5,
        sources: consent.filteredSources,
      });
      if (results.length > 0) {
        chunksUsed = results.map((r) => r.chunk_id);
        contextBlock = results
          .map((r) => `[${r.document_source}: ${r.document_title ?? 'Untitled'}]\n${r.content}`)
          .join('\n\n---\n\n');
      }
    }
  }

  let studentName = '';
  if (targetStudentId) {
    const student = await findUserById(targetStudentId);
    if (student) studentName = `${student.name_first} ${student.name_last}`;
  }

  const systemPrompt = buildSystemPrompt(role, studentName, contextBlock);

  let sessionId = req.sessionId;
  if (sessionId) {
    const existing = await findChatSession(sessionId);
    if (!existing || existing.user_id !== req.userId) {
      throw new Error('Session not found or unauthorized');
    }
  } else {
    const session = await createChatSession({
      user_id: req.userId,
      board_id: req.boardId,
      mode: role === 'student' ? 'student_chat' : 'staff_chat',
      target_student_id: targetStudentId ?? undefined,
      target_course_id: req.courseId,
      llm_provider: config.llmProvider,
    });
    sessionId = session.id;
  }

  const history = await getSessionMessages(sessionId);
  const conversationMessages: LLMMessage[] = history.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  await addChatMessage({ session_id: sessionId, role: 'user', content: req.query });

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages,
    { role: 'user', content: req.query },
  ];

  const broker = getBroker();
  const brokerOpts = { boardId: req.boardId, userId: req.userId, sessionId };

  const stream = broker.chatStream(messages, brokerOpts);
  let llmResponse: LLMResponse | undefined;

  {
    while (true) {
      const { value, done } = await stream.next();
      if (done) {
        llmResponse = value as LLMResponse;
        break;
      }
      yield { type: 'text', text: value as string };
    }

    if (llmResponse) {
      const assistantMessage = await addChatMessage({
        session_id: sessionId,
        role: 'assistant',
        content: llmResponse.content,
        chunks_used: chunksUsed,
        token_count_input: llmResponse.tokenCountInput,
        token_count_output: llmResponse.tokenCountOutput,
        latency_ms: llmResponse.latencyMs,
      });

      if (targetStudentId && chunksUsed.length > 0) {
        await logContextRetrieval({
          boardId: req.boardId, actorId: req.userId, targetStudentId,
          query: req.query, chunksRetrieved: chunksUsed, chunkCount: chunksUsed.length,
          sessionId, ipAddress: req.ipAddress,
        });
      }

      await logChatMessage({
        boardId: req.boardId, actorId: req.userId, targetStudentId,
        sessionId, role: 'assistant',
        tokenCountInput: llmResponse.tokenCountInput,
        tokenCountOutput: llmResponse.tokenCountOutput,
      });

      yield {
        type: 'metadata',
        data: {
          content: llmResponse.content,
          sessionId,
          messageId: assistantMessage.id,
          chunksUsed,
          model: llmResponse.model,
          tokenCountInput: llmResponse.tokenCountInput,
          tokenCountOutput: llmResponse.tokenCountOutput,
          latencyMs: llmResponse.latencyMs,
        },
      };
    }
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

function buildSystemPrompt(
  role: UserRole,
  studentName: string,
  contextBlock: string
): string {
  const contextSection = contextBlock
    ? `\n\n## Student Academic Context\n\nThe following is retrieved from ${studentName}'s academic records. Use this to personalize your response:\n\n${contextBlock}`
    : '';

  switch (role) {
    case 'student':
      return `You are a helpful, encouraging learning companion for ${studentName || 'a student'} at Thames Valley District School Board. You help students understand their coursework, review concepts, and build on their demonstrated knowledge.

Guidelines:
- Be warm, supportive, and encouraging
- Build on what the student has already demonstrated in their work
- Never reveal raw grades or marks directly — instead reference their strengths and growth areas
- If they ask about their performance, describe it in terms of understanding and skill development
- Suggest specific next steps or practice areas based on their demonstrated knowledge
- Keep responses focused and age-appropriate${contextSection}`;

    case 'teacher':
      return `You are a classroom intelligence assistant for a teacher at Thames Valley District School Board. You provide actionable insights about student progress, help generate report card comments, and identify patterns in student performance.

Guidelines:
- Use professional, clinical language appropriate for educator-to-educator communication
- Provide specific, evidence-based observations drawn from student records
- Highlight both strengths and areas for growth with actionable recommendations
- Be aware of IEP accommodations and learning plans when available
- Support differentiated instruction by identifying student-specific needs
- Help draft report card comments that are specific and evidence-based${contextSection}`;

    case 'guidance_counsellor':
      return `You are a counsellor support assistant at Thames Valley District School Board. You have access to comprehensive student records including sensitive documents. Help provide holistic student support.

Guidelines:
- Consider the whole student — academic, social-emotional, and behavioral
- Flag concerning patterns (attendance drops, grade declines) proactively
- Reference IEPs, psychological assessments, and guidance notes when relevant
- Maintain a supportive, professional tone
- Help plan interventions and support strategies${contextSection}`;

    case 'principal':
    case 'vice_principal':
      return `You are a school administration assistant at Thames Valley District School Board. You help school leaders monitor student progress, identify school-wide patterns, and support informed decision-making.

Guidelines:
- Provide a school-wide perspective on student achievement
- Identify patterns and trends across classrooms
- Support data-informed decisions about resource allocation and interventions
- Maintain awareness of all sensitivity levels including restricted records
- Help with reporting and compliance requirements${contextSection}`;

    case 'supply_teacher':
      return `You are a classroom support assistant helping a supply teacher at Thames Valley District School Board. You provide basic student context for today's class to support effective instruction.

Guidelines:
- Provide only basic, need-to-know information about students
- Focus on learning styles, classroom routines, and current topics
- Do not share sensitive or restricted information
- Keep responses practical and immediately actionable${contextSection}`;

    case 'parent':
      return `You are a family-friendly learning assistant at Thames Valley District School Board. You help parents understand their child's academic progress and how to support learning at home.

Guidelines:
- Use clear, non-jargon language that parents can easily understand
- Be encouraging and highlight areas of growth
- Suggest specific ways parents can support learning at home
- Only reference standard academic information (grades, assignments, report cards)
- Do not reveal sensitive or restricted educational records${contextSection}`;

    case 'board_admin':
      return `You are an education analytics assistant for Thames Valley District School Board administrators. You help with aggregate data analysis and board-level decision making.

Guidelines:
- Provide aggregate-level insights only — do not reference individual student data
- Support data-informed policy and resource allocation decisions
- Help with reporting, compliance, and strategic planning
- If asked about individual students, explain that individual context is not available at the board admin level`;

    default:
      return `You are an educational assistant at Thames Valley District School Board. Respond helpfully within your authorized access level.${contextSection}`;
  }
}

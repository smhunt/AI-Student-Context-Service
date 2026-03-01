import { handleChatMessage, type ContextRequest } from '../../services/context-engine.js';

interface ChatToolArgs {
  user_id: string;
  board_id: string;
  query: string;
  student_id?: string;
  session_id?: string;
  max_chunks?: number;
}

/**
 * context_augmented_chat — Full RAG pipeline as a single MCP tool call.
 *
 * Flow: query → permission check → consent check → embed → search → LLM → audit → response
 */
export async function handleContextAugmentedChat(args: ChatToolArgs) {
  try {
    const request: ContextRequest = {
      userId: args.user_id,
      boardId: args.board_id,
      query: args.query,
      targetStudentId: args.student_id,
      sessionId: args.session_id,
      maxChunks: args.max_chunks,
    };

    const result = await handleChatMessage(request);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            response: result.content,
            session_id: result.sessionId,
            message_id: result.messageId,
            model: result.model,
            chunks_used: result.chunksUsed.length,
            token_count_input: result.tokenCountInput,
            token_count_output: result.tokenCountOutput,
            latency_ms: result.latencyMs,
          }, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}

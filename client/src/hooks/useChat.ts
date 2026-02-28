import { useState, useCallback, useRef } from 'react';
import { sendMessage, sendMessageStream, getSessions, getSession, type ChatResponse, type ChatSession, type ChatMessageRecord } from '../api/client.js';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunksUsed?: string[];
  latencyMs?: number | null;
  createdAt: string;
  streaming?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingMsgId = useRef<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const { sessions } = await getSessions();
      setSessions(sessions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const { messages: msgs } = await getSession(sessionId);
      setActiveSessionId(sessionId);
      setMessages(msgs.map(toDisplayMessage));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const send = useCallback(async (text: string, targetStudentId?: string) => {
    if (!text.trim() || sending) return;
    setError(null);
    setSending(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMsg: DisplayMessage = {
      id: tempId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res: ChatResponse = await sendMessage({
        message: text,
        session_id: activeSessionId ?? undefined,
        target_student_id: targetStudentId,
      });

      if (!activeSessionId) {
        setActiveSessionId(res.sessionId);
      }

      const assistantMsg: DisplayMessage = {
        id: res.messageId,
        role: 'assistant',
        content: res.content,
        chunksUsed: res.chunksUsed,
        latencyMs: res.latencyMs,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError((err as Error).message);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [activeSessionId, sending]);

  const sendStreaming = useCallback(async (text: string, targetStudentId?: string) => {
    if (!text.trim() || sending || streaming) return;
    setError(null);
    setSending(true);
    setStreaming(true);

    // Optimistic user message
    const tempUserId = `temp-${Date.now()}`;
    const userMsg: DisplayMessage = {
      id: tempUserId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    // Placeholder assistant message for streaming
    const streamId = `stream-${Date.now()}`;
    streamingMsgId.current = streamId;
    const streamMsg: DisplayMessage = {
      id: streamId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, streamMsg]);

    try {
      await sendMessageStream(
        {
          message: text,
          session_id: activeSessionId ?? undefined,
          target_student_id: targetStudentId,
        },
        // onText — append streaming chunk
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === streamId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        // onMetadata — finalize message with real data
        (meta) => {
          if (!activeSessionId && meta.sessionId) {
            setActiveSessionId(meta.sessionId);
          }
          setMessages(prev =>
            prev.map(m =>
              m.id === streamId
                ? {
                    ...m,
                    id: meta.messageId,
                    content: meta.content,
                    chunksUsed: meta.chunksUsed,
                    latencyMs: meta.latencyMs,
                    streaming: false,
                  }
                : m
            )
          );
        },
      );
    } catch (err) {
      setError((err as Error).message);
      setMessages(prev => prev.filter(m => m.id !== tempUserId && m.id !== streamId));
    } finally {
      setSending(false);
      setStreaming(false);
      streamingMsgId.current = null;
    }
  }, [activeSessionId, sending, streaming]);

  const newChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sessions,
    activeSessionId,
    sending,
    streaming,
    loadingSessions,
    error,
    send,
    sendStreaming,
    loadSessions,
    loadSession,
    newChat,
  };
}

function toDisplayMessage(m: ChatMessageRecord): DisplayMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    chunksUsed: m.chunks_used,
    latencyMs: m.latency_ms,
    createdAt: m.created_at,
  };
}

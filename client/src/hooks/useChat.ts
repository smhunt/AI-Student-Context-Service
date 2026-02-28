import { useState, useCallback } from 'react';
import { sendMessage, getSessions, getSession, type ChatResponse, type ChatSession, type ChatMessageRecord } from '../api/client.js';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunksUsed?: string[];
  latencyMs?: number | null;
  createdAt: string;
}

export function useChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const send = useCallback(async (text: string) => {
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
      });

      // Set session if new
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
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [activeSessionId, sending]);

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
    loadingSessions,
    error,
    send,
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

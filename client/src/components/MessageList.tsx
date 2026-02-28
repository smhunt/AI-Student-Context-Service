import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DisplayMessage } from '../hooks/useChat.js';

interface Props {
  messages: DisplayMessage[];
  sending: boolean;
  onSuggestionClick?: (text: string) => void;
}

export default function MessageList({ messages, sending, onSuggestionClick }: Props) {
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      // New message arrived — scroll its top into view
      lastMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  // Scroll to typing indicator when it appears
  useEffect(() => {
    if (sending) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sending]);

  if (messages.length === 0 && !sending) {
    return (
      <div className="empty-chat">
        <div className="empty-icon">&#x1F393;</div>
        <h2>StudentContext AI</h2>
        <p>Ask about your coursework, review concepts, or get personalized learning support.</p>
        <div className="suggestions">
          {['How am I doing in math?', 'Help me study for my science test', 'What should I focus on next?'].map(s => (
            <button key={s} onClick={() => onSuggestionClick?.(s)}>{s}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <div key={msg.id} ref={i === messages.length - 1 ? lastMsgRef : undefined} className={`message message-${msg.role}`}>
          <div className="message-avatar">
            {msg.role === 'user' ? 'You' : 'AI'}
          </div>
          <div className="message-body">
            {msg.role === 'assistant' ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            ) : (
              <p>{msg.content}</p>
            )}
            {msg.role === 'assistant' && msg.chunksUsed && msg.chunksUsed.length > 0 && (
              <div className="message-meta">
                {msg.chunksUsed.length} source{msg.chunksUsed.length > 1 ? 's' : ''} used
                {msg.latencyMs != null && <> &middot; {(msg.latencyMs / 1000).toFixed(1)}s</>}
              </div>
            )}
          </div>
        </div>
      ))}
      {sending && (
        <div className="message message-assistant">
          <div className="message-avatar">AI</div>
          <div className="message-body">
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

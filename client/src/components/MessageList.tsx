import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DisplayMessage } from '../hooks/useChat.js';

interface Props {
  messages: DisplayMessage[];
  sending: boolean;
}

export default function MessageList({ messages, sending }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  if (messages.length === 0 && !sending) {
    return (
      <div className="empty-chat">
        <div className="empty-icon">&#x1F393;</div>
        <h2>StudentContext AI</h2>
        <p>Ask about your coursework, review concepts, or get personalized learning support.</p>
        <div className="suggestions">
          <span>How am I doing in math?</span>
          <span>Help me study for my science test</span>
          <span>What should I focus on next?</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map(msg => (
        <div key={msg.id} className={`message message-${msg.role}`}>
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

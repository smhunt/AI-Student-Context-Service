import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DisplayMessage } from '../hooks/useChat.js';
import { useSpeech } from '../hooks/useSpeech.js';

interface Props {
  messages: DisplayMessage[];
  sending: boolean;
  onSuggestionClick?: (text: string) => void;
}

export default function MessageList({ messages, sending, onSuggestionClick }: Props) {
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech();

  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      lastMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

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
      {messages.map((msg, i) => {
        const isAssistant = msg.role === 'assistant';
        const isSpeakingThis = speech.speakingId === msg.id;

        return (
          <div key={msg.id} ref={i === messages.length - 1 ? lastMsgRef : undefined} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {isAssistant ? 'AI' : 'You'}
            </div>
            <div className="message-body">
              {isAssistant ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
              {isAssistant && (
                <div className="message-actions">
                  {speech.available && (
                    <div className="speech-controls">
                      {isSpeakingThis ? (
                        <>
                          <button
                            className="btn-speech active"
                            onClick={speech.togglePause}
                            title={speech.paused ? 'Resume' : 'Pause'}
                          >
                            {speech.paused ? (
                              <SpeakIcon />
                            ) : (
                              <PauseIcon />
                            )}
                          </button>
                          <button
                            className="btn-speech"
                            onClick={speech.stop}
                            title="Stop"
                          >
                            <StopIcon />
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-speech"
                          onClick={() => speech.speak(msg.content, msg.id)}
                          title="Read aloud"
                          disabled={speech.speaking && !isSpeakingThis}
                        >
                          <SpeakIcon />
                        </button>
                      )}
                    </div>
                  )}
                  {msg.chunksUsed && msg.chunksUsed.length > 0 && (
                    <span className="message-meta-inline">
                      {msg.chunksUsed.length} source{msg.chunksUsed.length > 1 ? 's' : ''}
                      {msg.latencyMs != null && <> &middot; {(msg.latencyMs / 1000).toFixed(1)}s</>}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
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

function SpeakIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useChat } from '../hooks/useChat.js';
import MessageList from '../components/MessageList.js';
import MessageInput from '../components/MessageInput.js';
import SessionSidebar from '../components/SessionSidebar.js';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chat = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <div className={`chat-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && (
        <SessionSidebar
          sessions={chat.sessions}
          activeSessionId={chat.activeSessionId}
          loading={chat.loadingSessions}
          onLoadSessions={chat.loadSessions}
          onSelectSession={(id) => {
            chat.loadSession(id);
            setSidebarOpen(false);
          }}
          onNewChat={() => {
            chat.newChat();
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
          userName={`${user.name_first} ${user.name_last}`}
          userRole={user.role}
          onLogout={handleLogout}
        />
      )}

      <main className="chat-main">
        <header className="chat-header">
          <button
            className="btn-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle conversations"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1>StudentContext AI</h1>
          <span className="header-role">
            {user.name_first} &middot; {user.role.replace(/_/g, ' ')}
          </span>
        </header>

        <div className="chat-messages">
          <MessageList messages={chat.messages} sending={chat.sending} onSuggestionClick={chat.send} />
        </div>

        {chat.error && (
          <div className="chat-error">{chat.error}</div>
        )}

        <div className="chat-input-area">
          <MessageInput onSend={chat.send} disabled={chat.sending} />
        </div>
      </main>
    </div>
  );
}

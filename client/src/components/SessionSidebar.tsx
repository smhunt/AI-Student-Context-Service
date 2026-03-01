import { useEffect } from 'react';
import type { ChatSession } from '../api/client.js';
import { ChangelogModal } from './changelog-modal.js';

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  onLoadSessions: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  userName: string;
  userRole: string;
  onLogout: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  educational_assistant: 'EA',
  guidance_counsellor: 'Guidance',
  vice_principal: 'Vice Principal',
  principal: 'Principal',
  board_admin: 'Board Admin',
  parent: 'Parent',
  supply_teacher: 'Supply Teacher',
};

export default function SessionSidebar({
  sessions, activeSessionId, loading,
  onLoadSessions, onSelectSession, onNewChat, onClose,
  userName, userRole, onLogout,
}: Props) {
  useEffect(() => {
    onLoadSessions();
  }, [onLoadSessions]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button className="sidebar-close" onClick={onClose} title="Close sidebar">&times;</button>
      </div>

      <button className="btn-new-chat" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="session-list">
        {loading && <p className="sidebar-loading">Loading...</p>}
        {!loading && sessions.length === 0 && (
          <p className="sidebar-empty">No conversations yet</p>
        )}
        {sessions.map(s => (
          <button
            key={s.id}
            className={`session-item ${s.id === activeSessionId ? 'active' : ''}`}
            onClick={() => onSelectSession(s.id)}
          >
            <span className="session-mode">{s.mode.replace('_', ' ')}</span>
            <span className="session-meta">
              {s.message_count} msg{s.message_count !== 1 ? 's' : ''} &middot; {formatDate(s.started_at)}
            </span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-name">{userName}</span>
          <span className="user-role">{ROLE_LABELS[userRole] ?? userRole}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <ChangelogModal />
          <button className="btn-logout" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </aside>
  );
}

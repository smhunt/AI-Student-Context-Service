import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useAdmin, type AdminTab } from '../hooks/useAdmin.js';
import { getRoleLabel } from '../utils/roles.js';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLen: number): string {
  if (!text) return '--';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'context_retrieval', label: 'Context Retrieval' },
  { value: 'chat_message', label: 'Chat Message' },
  { value: 'consent_grant', label: 'Consent Grant' },
  { value: 'consent_revoke', label: 'Consent Revoke' },
  { value: 'login', label: 'Login' },
  { value: 'data_sync', label: 'Data Sync' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'educational_assistant', label: 'Educational Assistant' },
  { value: 'guidance_counsellor', label: 'Guidance Counsellor' },
  { value: 'vice_principal', label: 'Vice Principal' },
  { value: 'principal', label: 'Principal' },
  { value: 'board_admin', label: 'Board Admin' },
  { value: 'parent', label: 'Parent' },
  { value: 'supply_teacher', label: 'Supply Teacher' },
];

const ITEMS_PER_PAGE = 20;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const admin = useAdmin();

  // Audit filters
  const [auditAction, setAuditAction] = useState('');
  const [auditOffset, setAuditOffset] = useState(0);

  // User filters
  const [userRole, setUserRole] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userOffset, setUserOffset] = useState(0);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleTabChange(tab: AdminTab) {
    admin.setActiveTab(tab);
    if (tab === 'audit') {
      admin.loadAudit({ action: auditAction || undefined, limit: ITEMS_PER_PAGE, offset: 0 });
      setAuditOffset(0);
    } else if (tab === 'users') {
      admin.loadUsers({ role: userRole || undefined, search: userSearch || undefined, limit: ITEMS_PER_PAGE, offset: 0 });
      setUserOffset(0);
    }
  }

  // Reload audit when filters change
  useEffect(() => {
    if (admin.activeTab === 'audit') {
      admin.loadAudit({ action: auditAction || undefined, limit: ITEMS_PER_PAGE, offset: auditOffset });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditAction, auditOffset]);

  // Reload users when filters change
  useEffect(() => {
    if (admin.activeTab === 'users') {
      const timer = setTimeout(() => {
        admin.loadUsers({ role: userRole || undefined, search: userSearch || undefined, limit: ITEMS_PER_PAGE, offset: userOffset });
      }, userSearch ? 300 : 0); // Debounce search
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userSearch, userOffset]);

  if (!user) return null;

  const { stats } = admin;
  const consentTotal = stats
    ? stats.consent_stats.granted + stats.consent_stats.pending + stats.consent_stats.denied + stats.consent_stats.revoked
    : 0;

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-page-header">
        <div className="admin-header-left">
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">StudentContext AI - Board Administration</p>
        </div>
        <div className="admin-header-right">
          <span className="consent-user-info">
            {user.name_first} {user.name_last}
            <span className="consent-user-role">{getRoleLabel(user.role)}</span>
          </span>
          <button className="btn-header-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tab-bar">
        <button
          className={`tab ${admin.activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${admin.activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => handleTabChange('audit')}
        >
          Audit Log
        </button>
        <button
          className={`tab ${admin.activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
        >
          Users
        </button>
      </nav>

      {/* Error */}
      {admin.error && (
        <div className="error-banner" style={{ margin: '16px 20px 0' }}>{admin.error}</div>
      )}

      {/* Content */}
      <main className="admin-content">
        {admin.activeTab === 'overview' && (
          <OverviewTab stats={stats} consentTotal={consentTotal} loading={admin.loading} />
        )}
        {admin.activeTab === 'audit' && (
          <AuditTab
            entries={admin.auditEntries}
            total={admin.auditTotal}
            loading={admin.loading}
            action={auditAction}
            offset={auditOffset}
            onActionChange={(v) => { setAuditAction(v); setAuditOffset(0); }}
            onOffsetChange={setAuditOffset}
          />
        )}
        {admin.activeTab === 'users' && (
          <UsersTab
            users={admin.users}
            total={admin.usersTotal}
            loading={admin.loading}
            role={userRole}
            search={userSearch}
            offset={userOffset}
            onRoleChange={(v) => { setUserRole(v); setUserOffset(0); }}
            onSearchChange={(v) => { setUserSearch(v); setUserOffset(0); }}
            onOffsetChange={setUserOffset}
          />
        )}
      </main>
    </div>
  );
}

/* ---- Overview Tab ---- */
function OverviewTab({ stats, consentTotal, loading }: {
  stats: ReturnType<typeof useAdmin>['stats'];
  consentTotal: number;
  loading: boolean;
}) {
  if (loading && !stats) {
    return (
      <div className="loading-screen" style={{ height: 300 }}>
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="admin-overview">
      {/* Stats grid */}
      <div className="stats-grid">
        <StatCard label="Total Users" value={stats.total_users} icon="users" />
        <StatCard label="Students" value={stats.total_students} icon="student" />
        <StatCard label="Staff" value={stats.total_staff} icon="staff" />
        <StatCard label="Documents" value={stats.total_documents} icon="doc" />
        <StatCard label="Text Chunks" value={stats.total_chunks} icon="chunk" />
        <StatCard label="Embeddings" value={stats.total_embeddings} icon="vector" />
        <StatCard label="Chat Sessions" value={stats.total_sessions} icon="chat" />
        <StatCard label="Messages" value={stats.total_messages} icon="message" />
      </div>

      {/* Consent and Roles row */}
      <div className="admin-detail-row">
        {/* Consent summary */}
        <div className="admin-detail-card">
          <h3>Consent Status</h3>
          <div className="consent-summary-grid">
            <div className="consent-summary-item consent-summary-granted">
              <span className="consent-summary-count">{stats.consent_stats.granted}</span>
              <span className="consent-summary-label">Granted</span>
              {consentTotal > 0 && (
                <span className="consent-summary-pct">
                  {Math.round((stats.consent_stats.granted / consentTotal) * 100)}%
                </span>
              )}
            </div>
            <div className="consent-summary-item consent-summary-pending">
              <span className="consent-summary-count">{stats.consent_stats.pending}</span>
              <span className="consent-summary-label">Pending</span>
              {consentTotal > 0 && (
                <span className="consent-summary-pct">
                  {Math.round((stats.consent_stats.pending / consentTotal) * 100)}%
                </span>
              )}
            </div>
            <div className="consent-summary-item consent-summary-denied">
              <span className="consent-summary-count">{stats.consent_stats.denied}</span>
              <span className="consent-summary-label">Denied</span>
            </div>
            <div className="consent-summary-item consent-summary-revoked">
              <span className="consent-summary-count">{stats.consent_stats.revoked}</span>
              <span className="consent-summary-label">Revoked</span>
            </div>
          </div>
        </div>

        {/* Role breakdown */}
        <div className="admin-detail-card">
          <h3>Users by Role</h3>
          <div className="role-breakdown-list">
            {Object.entries(stats.role_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([role, count]) => (
                <div key={role} className="role-breakdown-row">
                  <span className="role-breakdown-label">{getRoleLabel(role)}</span>
                  <span className="role-breakdown-count">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="admin-detail-card admin-recent-activity">
        <h3>Recent Activity</h3>
        {stats.recent_activity.length === 0 ? (
          <p className="admin-empty-text">No recent activity recorded.</p>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_activity.slice(0, 10).map((entry: any) => (
                <tr key={entry.id}>
                  <td className="audit-date">{formatDate(entry.created_at)}</td>
                  <td>{entry.actor_name || entry.actor_id?.slice(0, 8) || '--'}</td>
                  <td>
                    <span className="audit-action-badge">{entry.action?.replace(/_/g, ' ')}</span>
                  </td>
                  <td>{entry.target_student_name || '--'}</td>
                  <td className="audit-details">
                    {truncate(typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || ''), 60)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const iconMap: Record<string, string> = {
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
    student: 'M22 10v6M2 10l10-5 10 5-10 5z',
    staff: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    chunk: 'M4 7V4h16v3M9 20h6M12 4v16',
    vector: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    message: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
  };

  return (
    <div className="stat-card">
      <div className="stat-card-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconMap[icon] || iconMap.doc} />
        </svg>
      </div>
      <span className="stat-card-value">{formatNumber(value)}</span>
      <span className="stat-card-label">{label}</span>
    </div>
  );
}

/* ---- Audit Tab ---- */
function AuditTab({ entries, total, loading, action, offset, onActionChange, onOffsetChange }: {
  entries: any[];
  total: number;
  loading: boolean;
  action: string;
  offset: number;
  onActionChange: (v: string) => void;
  onOffsetChange: (v: number) => void;
}) {
  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="admin-audit">
      <div className="audit-filters">
        <label className="audit-filter-label">
          Action Type
          <select
            value={action}
            onChange={e => onActionChange(e.target.value)}
            className="audit-filter-select"
          >
            {ACTION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <div className="audit-filter-info">
          {total} {total === 1 ? 'entry' : 'entries'} found
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height: 200 }}>
          <div className="spinner" />
          <p>Loading audit log...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="admin-empty-state">
          <p>No audit entries found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Student</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td className="audit-date">{formatDate(entry.created_at)}</td>
                    <td>{entry.actor_name || '--'}</td>
                    <td>
                      <span className="audit-action-badge">{entry.action?.replace(/_/g, ' ')}</span>
                    </td>
                    <td>{entry.target_student_name || '--'}</td>
                    <td className="audit-details">
                      {truncate(typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || ''), 50)}
                    </td>
                    <td className="audit-ip">{entry.ip_address || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="btn-secondary"
              disabled={offset === 0}
              onClick={() => onOffsetChange(Math.max(0, offset - ITEMS_PER_PAGE))}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              disabled={offset + ITEMS_PER_PAGE >= total}
              onClick={() => onOffsetChange(offset + ITEMS_PER_PAGE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Users Tab ---- */
function UsersTab({ users, total, loading, role, search, offset, onRoleChange, onSearchChange, onOffsetChange }: {
  users: any[];
  total: number;
  loading: boolean;
  role: string;
  search: string;
  offset: number;
  onRoleChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onOffsetChange: (v: number) => void;
}) {
  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="admin-users">
      <div className="audit-filters">
        <label className="audit-filter-label">
          Role
          <select
            value={role}
            onChange={e => onRoleChange(e.target.value)}
            className="audit-filter-select"
          >
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="audit-filter-label">
          Search
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="audit-filter-input"
          />
        </label>
        <div className="audit-filter-info">
          {total} {total === 1 ? 'user' : 'users'} found
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height: 200 }}>
          <div className="spinner" />
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty-state">
          <p>No users found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="audit-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="user-name-cell">{u.name_first} {u.name_last}</td>
                    <td className="user-email-cell">{u.email}</td>
                    <td>
                      <span className="user-role-badge">{getRoleLabel(u.role)}</span>
                    </td>
                    <td>
                      <span className={`user-status-badge ${u.is_active !== false ? 'user-active' : 'user-inactive'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="audit-date">{u.created_at ? formatDate(u.created_at) : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="btn-secondary"
              disabled={offset === 0}
              onClick={() => onOffsetChange(Math.max(0, offset - ITEMS_PER_PAGE))}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              disabled={offset + ITEMS_PER_PAGE >= total}
              onClick={() => onOffsetChange(offset + ITEMS_PER_PAGE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

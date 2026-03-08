import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useConsent } from '../hooks/useConsent.js';
import { getRoleLabel } from '../utils/roles.js';

const DATA_SOURCES = [
  { key: 'google_classroom_assignment', label: 'Google Classroom Assignments' },
  { key: 'google_classroom_submission', label: 'Google Classroom Submissions' },
  { key: 'google_classroom_grade', label: 'Google Classroom Grades' },
  { key: 'sis_report_card', label: 'Report Cards' },
  { key: 'sis_transcript', label: 'Transcripts' },
  { key: 'assessment_eqao', label: 'EQAO Assessments' },
  { key: 'assessment_board', label: 'Board Assessments' },
];

function getStatusLabel(status: string | undefined | null): string {
  switch (status) {
    case 'granted': return 'Granted';
    case 'pending': return 'Pending';
    case 'denied': return 'Denied';
    case 'revoked': return 'Revoked';
    default: return 'No Consent';
  }
}

function getStatusClass(status: string | undefined | null): string {
  switch (status) {
    case 'granted': return 'consent-status-granted';
    case 'pending': return 'consent-status-pending';
    case 'denied': return 'consent-status-denied';
    case 'revoked': return 'consent-status-revoked';
    default: return 'consent-status-none';
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ParentConsent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const consent = useConsent();
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleSelectChild(childId: string) {
    if (consent.selectedChildId === childId) {
      consent.setSelectedChildId(null);
      setSelectedSources([]);
      setShowRevokeConfirm(null);
    } else {
      consent.setSelectedChildId(childId);
      setShowRevokeConfirm(null);
      // Pre-fill sources if consent already granted (filter to only parent-selectable sources)
      const child = consent.children.find(c => c.id === childId);
      const validKeys = DATA_SOURCES.map(s => s.key);
      if (child?.consent?.status === 'granted' && child.consent.data_sources) {
        setSelectedSources(child.consent.data_sources.filter(s => validKeys.includes(s)));
      } else {
        setSelectedSources([]);
      }
    }
  }

  function toggleSource(source: string) {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  }

  function selectAllSources() {
    setSelectedSources(DATA_SOURCES.map(s => s.key));
  }

  function clearAllSources() {
    setSelectedSources([]);
  }

  async function handleGrant(studentId: string) {
    if (selectedSources.length === 0) return;
    await consent.grant(studentId, selectedSources);
  }

  async function handleRevoke(studentId: string) {
    await consent.revoke(studentId);
    setShowRevokeConfirm(null);
    setSelectedSources([]);
  }

  if (!user) return null;

  return (
    <div className="consent-layout">
      {/* Header */}
      <header className="consent-page-header">
        <div className="consent-header-left">
          <h1>Parent Consent Portal</h1>
          <p className="consent-subtitle">StudentContext AI - Thames Valley DSB</p>
        </div>
        <div className="consent-header-right">
          <span className="consent-user-info">
            {user.name_first} {user.name_last}
            <span className="consent-user-role">{getRoleLabel(user.role)}</span>
          </span>
          <button className="btn-header-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="consent-main">
        {/* Explanation */}
        <div className="consent-explanation">
          <div className="consent-explanation-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h2>Control How Your Child's Data Is Used</h2>
            <p>
              The AI learning assistant can use your child's academic records to provide
              personalized support. You have full control over which data sources are
              included. You may grant or revoke consent at any time.
            </p>
          </div>
        </div>

        {/* Error */}
        {consent.error && (
          <div className="error-banner" style={{ marginBottom: 16 }}>{consent.error}</div>
        )}

        {/* Loading */}
        {consent.loading ? (
          <div className="loading-screen" style={{ height: 200 }}>
            <div className="spinner" />
            <p>Loading your children...</p>
          </div>
        ) : consent.children.length === 0 ? (
          <div className="consent-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>No children are linked to your account yet.</p>
            <p className="consent-empty-hint">
              Contact your school's administration to link your children to your account.
            </p>
          </div>
        ) : (
          <div className="consent-children-list">
            {consent.children.map(child => {
              const isSelected = consent.selectedChildId === child.id;
              const status = child.consent?.status;
              const isGranted = status === 'granted';

              return (
                <div key={child.id} className={`consent-card ${isSelected ? 'consent-card-expanded' : ''}`}>
                  {/* Card header - clickable */}
                  <button
                    className="consent-card-header"
                    onClick={() => handleSelectChild(child.id)}
                  >
                    <div className="consent-card-avatar">
                      {child.name_first[0]}{child.name_last[0]}
                    </div>
                    <div className="consent-card-info">
                      <span className="consent-card-name">
                        {child.name_first} {child.name_last}
                      </span>
                      {child.email && (
                        <span className="consent-card-email">{child.email}</span>
                      )}
                    </div>
                    <span className={`consent-status ${getStatusClass(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                    <svg
                      className={`consent-card-chevron ${isSelected ? 'rotated' : ''}`}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div className="consent-card-body">
                      {/* Dates */}
                      {child.consent && (
                        <div className="consent-dates">
                          {child.consent.granted_at && (
                            <div className="consent-date-item">
                              <span className="consent-date-label">Consent granted:</span>
                              <span className="consent-date-value">{formatDate(child.consent.granted_at)}</span>
                            </div>
                          )}
                          {child.consent.revoked_at && (
                            <div className="consent-date-item">
                              <span className="consent-date-label">Consent revoked:</span>
                              <span className="consent-date-value">{formatDate(child.consent.revoked_at)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Currently active sources (when granted) */}
                      {isGranted && child.consent?.data_sources && child.consent.data_sources.length > 0 && (
                        <div className="consent-active-sources">
                          <h4>Currently Approved Data Sources</h4>
                          <div className="consent-active-tags">
                            {child.consent.data_sources.map(src => {
                              const label = DATA_SOURCES.find(d => d.key === src)?.label ?? src;
                              return (
                                <span key={src} className="consent-tag">{label}</span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Data source selection for granting/updating */}
                      <div className="consent-sources-section">
                        <div className="consent-sources-header">
                          <h4>{isGranted ? 'Update Data Sources' : 'Select Data Sources to Approve'}</h4>
                          <div className="consent-sources-actions-mini">
                            <button className="btn-text" onClick={selectAllSources}>Select All</button>
                            <span className="consent-divider">|</span>
                            <button className="btn-text" onClick={clearAllSources}>Clear All</button>
                          </div>
                        </div>
                        <div className="consent-sources">
                          {DATA_SOURCES.map(source => (
                            <label key={source.key} className="consent-source-item">
                              <input
                                type="checkbox"
                                checked={selectedSources.includes(source.key)}
                                onChange={() => toggleSource(source.key)}
                                disabled={consent.actionLoading}
                              />
                              <span className="consent-source-label">{source.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="consent-actions">
                        <button
                          className="btn-primary consent-btn-grant"
                          onClick={() => handleGrant(child.id)}
                          disabled={consent.actionLoading || selectedSources.length === 0}
                        >
                          {consent.actionLoading ? 'Processing...' : isGranted ? 'Update Consent' : 'Grant Consent'}
                        </button>

                        {isGranted && (
                          <>
                            {showRevokeConfirm === child.id ? (
                              <div className="consent-revoke-confirm">
                                <p>Are you sure you want to revoke consent? The AI assistant will no longer use your child's data.</p>
                                <div className="consent-revoke-actions">
                                  <button
                                    className="btn-danger"
                                    onClick={() => handleRevoke(child.id)}
                                    disabled={consent.actionLoading}
                                  >
                                    {consent.actionLoading ? 'Revoking...' : 'Yes, Revoke Consent'}
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    onClick={() => setShowRevokeConfirm(null)}
                                    disabled={consent.actionLoading}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className="btn-danger-outline"
                                onClick={() => setShowRevokeConfirm(child.id)}
                                disabled={consent.actionLoading}
                              >
                                Revoke Consent
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="consent-footer-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <p>
            Your child's data is stored securely in accordance with FIPPA (Freedom of Information
            and Protection of Privacy Act) and Ontario education data standards. You may change
            your consent choices at any time.
          </p>
        </div>
      </main>
    </div>
  );
}

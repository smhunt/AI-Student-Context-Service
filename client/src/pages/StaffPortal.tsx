import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useStaff } from '../hooks/useStaff.js';
import { useChat } from '../hooks/useChat.js';
import { getRoleLabel } from '../utils/roles.js';
import StudentSelector from '../components/StudentSelector.js';
import MessageList from '../components/MessageList.js';
import MessageInput from '../components/MessageInput.js';
import ReportCommentGenerator from '../components/ReportCommentGenerator.js';
import ClassInsights from '../components/ClassInsights.js';

type Tab = 'chat' | 'reports' | 'insights';

export default function StaffPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const staff = useStaff();
  const chat = useChat();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [selectorOpen, setSelectorOpen] = useState(true);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleSelectStudent(s: typeof staff.selectedStudent) {
    staff.setSelectedStudent(s);
    // Reset chat when switching students
    chat.newChat();
  }

  if (!user) return null;

  return (
    <div className={`staff-layout ${selectorOpen ? 'selector-open' : ''}`}>
      {selectorOpen && (
        <div className="staff-sidebar">
          <StudentSelector
            students={staff.students}
            courses={staff.courses}
            selectedStudent={staff.selectedStudent}
            selectedCourseId={staff.selectedCourseId}
            onSelectStudent={handleSelectStudent}
            onSelectCourse={staff.setSelectedCourseId}
            loading={staff.loading}
          />
          <div className="staff-sidebar-footer">
            <div className="user-info">
              <span className="user-name">{user.name_first} {user.name_last}</span>
              <span className="user-role">{getRoleLabel(user.role)}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      )}

      <main className="staff-main">
        <header className="chat-header">
          <button
            className="btn-menu"
            onClick={() => setSelectorOpen(!selectorOpen)}
            title="Toggle student list"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1>Staff Portal</h1>
          {staff.selectedStudent && (
            <span className="header-student">
              {staff.selectedStudent.name_first} {staff.selectedStudent.name_last}
            </span>
          )}
        </header>

        <nav className="tab-bar">
          <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            Chat
          </button>
          <button className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            Report Comments
          </button>
          <button className={`tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
            Class Insights
          </button>
        </nav>

        <div className="staff-content">
          {activeTab === 'chat' && (
            <div className="staff-chat">
              <div className="chat-messages">
                <MessageList messages={chat.messages} sending={chat.sending} onSuggestionClick={(text) => chat.send(text, staff.selectedStudent?.id)} />
              </div>
              {chat.error && <div className="chat-error">{chat.error}</div>}
              <div className="chat-input-area">
                <MessageInput
                  onSend={(text) => {
                    chat.send(text, staff.selectedStudent?.id);
                  }}
                  disabled={chat.sending}
                />
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="staff-tab-content">
              <ReportCommentGenerator
                student={staff.selectedStudent}
                courses={staff.courses}
                selectedCourseId={staff.selectedCourseId}
                result={staff.reportComment}
                loading={staff.reportLoading}
                onGenerate={staff.generateComment}
              />
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="staff-tab-content">
              <ClassInsights
                courseId={staff.selectedCourseId}
                insights={staff.insights}
                loading={staff.insightsLoading}
                onLoad={staff.loadInsights}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

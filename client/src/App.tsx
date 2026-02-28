import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import { isStaffRole } from './utils/roles.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import LoginPage from './pages/LoginPage.js';
import ChatPage from './pages/ChatPage.js';
import StaffPortal from './pages/StaffPortal.js';
import ParentConsent from './pages/ParentConsent.js';
import AdminDashboard from './pages/AdminDashboard.js';
import './styles/index.css';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'parent') return <Navigate to="/consent" replace />;
  if (user.role === 'board_admin') return <Navigate to="/admin" replace />;
  if (isStaffRole(user.role)) return <Navigate to="/staff" replace />;
  return <Navigate to="/chat" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <StaffPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consent"
            element={
              <ProtectedRoute>
                <ParentConsent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRouter />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

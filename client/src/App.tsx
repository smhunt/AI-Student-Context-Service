import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import { isStaffRole } from './utils/roles.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import LoginPage from './pages/LoginPage.js';
import ChatPage from './pages/ChatPage.js';
import StaffPortal from './pages/StaffPortal.js';
import './styles/index.css';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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

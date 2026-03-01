import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import { isClerkAuth } from './auth/index.js';
import { isStaffRole } from './utils/roles.js';
import { ThemeProvider } from './components/ui/theme-provider.js';
import { TooltipProvider } from './components/ui/tooltip.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import LoginPage from './pages/LoginPage.js';
import ChatPage from './pages/ChatPage.js';
import StaffPortal from './pages/StaffPortal.js';
import ParentConsent from './pages/ParentConsent.js';
import AdminDashboard from './pages/AdminDashboard.js';
import './styles/index.css';

// Lazy-load Clerk wrapper — only bundled when Clerk auth is active
const ClerkProviderWrapper = isClerkAuth
  ? lazy(() => import('./auth/ClerkProviderWrapper.js'))
  : null;

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'parent') return <Navigate to="/consent" replace />;
  if (user.role === 'board_admin') return <Navigate to="/admin" replace />;
  if (isStaffRole(user.role)) return <Navigate to="/staff" replace />;
  return <Navigate to="/chat" replace />;
}

function AppRoutes() {
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

export default function App() {
  const content = <AppRoutes />;

  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        {isClerkAuth && ClerkProviderWrapper ? (
          <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
            <ClerkProviderWrapper>{content}</ClerkProviderWrapper>
          </Suspense>
        ) : (
          content
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy loaded pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Boards = lazy(() => import('./pages/Boards'));
const Board = lazy(() => import('./pages/Board'));
const Activity = lazy(() => import('./pages/Activity'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings'));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const MyTeam = lazy(() => import('./pages/MyTeam'));

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center text-secondary">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center text-secondary">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            
            <Route path="/app" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="boards" element={<Boards />} />
              <Route path="boards/:boardId" element={<Board />} />
              <Route path="tasks" element={<MyTasks />} />
              <Route path="activity" element={<Activity />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="team" element={<MyTeam />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/organization" element={<OrganizationSettings />} />
              <Route path="settings/security" element={<SecuritySettings />} />
            </Route>
            {/* Catch all to redirect home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import EmptyState from './components/ui/EmptyState';
import { Sparkles } from 'lucide-react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Boards from './pages/Boards';
import Board from './pages/Board';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import MyTasks from './pages/MyTasks';
import { AuthProvider, useAuth } from './context/AuthContext';

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

// A simple placeholder for the routes inside the shell
function PlaceholderPage({ title, description }) {
  return (
    <div className="bg-surface border border-border rounded-lg min-h-[500px] flex items-center justify-center">
      <EmptyState 
        icon={Sparkles}
        title={title}
        description={description}
        actionLabel="Back to Landing"
        onAction={() => window.location.href = '/'}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
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
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* Catch all to redirect home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

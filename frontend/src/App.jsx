import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';

// Components
import AuthWrapper from './components/AuthWrapper';
import LandingPage from './components/LandingPage';
import CompanyList from './components/CompanyList';
import PreparationPlan from './components/PreparationPlan';
import MockInterviews from './components/MockInterviews';
import ResumeBuilder from './components/ResumeBuilder';
import DiscussionForum from './components/DiscussionForum';
import Profile from './components/Profile';
import AIChatbot from './components/AIChatbot';

// Services
import authService from './services/authService';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

// Main Navigation Bar Component
const MainNavbar = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { icon: '', title: 'Company Drives', path: '/companies', description: 'Browse job opportunities' },
    { icon: '', title: 'Personalized Prep', path: '/preparation', description: 'AI-powered study plans' },
    { icon: '', title: 'Mock Interviews', path: '/mock-interviews', description: 'Practice with AI interviewer' },
    { icon: '', title: 'Resume/ATS Check', path: '/resume-builder', description: 'Optimize your resume' },
    { icon: '', title: 'Discussion Forum', path: '/discussion-forum', description: 'Connect with peers' }
  ];

  return (
    <nav className="main-navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <div className="navbar-brand" onClick={() => navigate('/')}>
            <h2>Connect & Conquer</h2>
          </div>
          <div className="navbar-links">
            {navigationItems.map((item, index) => (
              <button
                key={index}
                className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                title={item.description}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-title">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="navbar-right">
          <div className="user-info">
            <span 
              className="welcome-text clickable-name" 
              onClick={() => navigate('/profile')}
              title="View your profile"
            >
              Welcome, {currentUser?.first_name || currentUser?.username}!
            </span>
            <button onClick={onLogout} className="logout-button">
               Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Main app content for authenticated users
const AuthenticatedApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/auth');
    }
  };

  return (
    <>
      <MainNavbar currentUser={currentUser} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/companies" element={
            <ProtectedRoute>
              <CompanyList />
            </ProtectedRoute>
          } />
          <Route path="/preparation" element={
            <ProtectedRoute>
              <PreparationPlan />
            </ProtectedRoute>
          } />
          <Route path="/mock-interviews" element={
            <ProtectedRoute>
              <MockInterviews />
            </ProtectedRoute>
          } />
          <Route path="/resume-builder" element={
            <ProtectedRoute>
              <ResumeBuilder />
            </ProtectedRoute>
          } />
          <Route path="/discussion-forum" element={
            <ProtectedRoute>
              <DiscussionForum />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuth = authService.isAuthenticated();
      setIsAuthenticated(isAuth);
      setAuthLoading(false);
    };
    checkAuthStatus();
  }, []);

  const handleAuthSuccess = (user) => {
    setIsAuthenticated(true);
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-content">
          <div className="auth-loading-spinner"></div>
          <p>Loading Connect & Conquer...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? 
                <Navigate to="/" replace /> : 
                <AuthWrapper onAuthSuccess={handleAuthSuccess} />
            } 
          />
          
          <Route 
            path="/*" 
            element={
              isAuthenticated ? 
                <AuthenticatedApp /> : 
                <Navigate to="/auth" replace />
            } 
          />
        </Routes>
        
        {/* AI Chatbot - Available on all pages when authenticated */}
        {isAuthenticated && <AIChatbot />}
      </div>
    </Router>
  );
}

export default App;
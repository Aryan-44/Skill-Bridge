import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import Hackathons from './pages/Hackathons';
import AIChatbot from './components/AIChatbot';

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="relative min-h-screen">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile/:uid?"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              }
            />
            <Route
              path="/hackathons"
              element={
                <PrivateRoute>
                  <Hackathons />
                </PrivateRoute>
              }
            />
          </Routes>

          {/* Global Chatbot Floating Button */}
          <AIChatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

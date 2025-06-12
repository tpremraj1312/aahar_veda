import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import AddMeal from './pages/AddMeal';
import AIAnalysis from './pages/AIAnalysis';
import Login from './pages/Login';
import Signup from './pages/Signup';
// import Settings from './pages/Settings';
import DashboardLayout from './pages/DashboardLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token'); // Use localStorage consistently
  const location = useLocation();

  if (!token) {
    // Redirect to login, preserving the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="add-meal" element={<AddMeal />} />
          <Route path="history" element={<History />} />
          <Route path="ai-analysis" element={<AIAnalysis />} />
          {/* <Route path="settings" element={<Settings />} /> */}
          <Route path="" element={<Navigate to="dashboard" replace />} />
        </Route>
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
};

export default App;
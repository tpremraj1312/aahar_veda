import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Home, Camera, History, Settings, Brain } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const DashboardLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log('[handleLogout] Logging out');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-64 bg-indigo-700 text-white p-6"
      >
        <h1 className="text-2xl font-bold mb-8">CalorieWise</h1>
        <nav className="space-y-4">
          {[
            { icon: Home, label: 'Home', to: '/dashboard' },
            { icon: Camera, label: 'Add Meal', to: '/add-meal' },
            { icon: History, label: 'History', to: '/history' },
            { icon: Brain, label: 'AI Analysis', to: '/ai-analysis' },
            { icon: Settings, label: 'Settings', to: '/settings' },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.to}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-indigo-800 transition"
            >
              <item.icon className="w-6 h-6" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-indigo-800 transition w-full"
          >
            <LogOut className="w-6 h-6" />
            <span>Logout</span>
          </button>
        </nav>
      </motion.aside>
      <main className="flex-1 p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
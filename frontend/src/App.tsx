/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { TechnicalDashboard } from './pages/TechnicalDashboard';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Keep path synced with browser URL
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Route protection (only check authentication, NO role restriction)
  useEffect(() => {
    if (!isAuthenticated) {
      if (currentPath !== '/login') {
        navigate('/login');
      }
    } else {
      if (currentPath === '/login') {
        navigate('/');
      }
    }
  }, [isAuthenticated, currentPath]);

  // Render view according to path
  if (!isAuthenticated || currentPath === '/login') {
    return <Login onNavigate={navigate} />;
  }

  // Without role barriers, any user can view any interface:
  if (currentPath === '/customer') {
    return <CustomerDashboard />;
  }

  if (currentPath === '/technical') {
    return <TechnicalDashboard />;
  }

  // Default is the complete unified workspace
  return <AdminDashboard />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

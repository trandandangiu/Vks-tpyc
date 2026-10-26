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
  const { isAuthenticated, role, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [currentSearch, setCurrentSearch] = useState<string>(() => {
    return window.location.search || '';
  });

  // Keep path synced with browser URL
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(window.location.pathname);
    setCurrentSearch(window.location.search);
  };

  // Route protection (only check authentication, NO role restriction)
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (currentPath !== '/login') {
        navigate('/login');
      }
    } else {
      if (currentPath === '/login') {
        navigate('/');
      }
    }
  }, [isAuthenticated, isLoading, currentPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-sm font-bold text-[#B71C1C] animate-pulse">
          Đang kết nối Cơ sở dữ liệu...
        </div>
      </div>
    );
  }

  // Render view according to path
  if (!isAuthenticated || currentPath === '/login') {
    return <Login onNavigate={navigate} />;
  }

  // Without role barriers, any user can view any interface, and '/' routes to role default:
  if (currentPath === '/customer' || (currentPath === '/' && role === 'CUSTOMER')) {
    return <CustomerDashboard key={currentSearch} />;
  }

  if (currentPath === '/technical' || (currentPath === '/' && role === 'TECHNICAL')) {
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

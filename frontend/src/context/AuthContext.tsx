import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; message?: string; role?: UserRole }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => apiClient.getCurrentUser());

  // Load user khi app khởi động
  useEffect(() => {
    const init = async () => {
      const token = apiClient.getToken();
      if (!token) return;
      try {
        const me = await apiClient.me();
        if (me) {
          setUser(me);
        } else {
          apiClient.clearToken();
          setUser(null);
        }
      } catch {
        apiClient.clearToken();
        setUser(null);
      }
    };
    init();
  }, []);

  const login = async (username: string, password?: string) => {
    try {
      const res = await apiClient.login(username, password || '');
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true, role: res.user.role };
      }
      return { success: false, message: 'Đăng nhập thất bại' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối' };
    }
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await apiClient.me();
    if (me) setUser(me);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (u: string, p: string) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  // Accessibility controls
  fontSize: 'sm' | 'md' | 'lg';
  setFontSize: (size: 'sm' | 'md' | 'lg') => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    const token = localStorage.getItem('nyayaniti_token');
    const storedUser = localStorage.getItem('nyayaniti_user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Verify token with backend
        api.getMe()
          .then((verified) => {
            setUser(verified);
            localStorage.setItem('nyayaniti_user', JSON.stringify(verified));
          })
          .catch((err) => {
            // Only clear auth on explicit 401/unauthorized errors
            if (err?.message?.includes('credentials') || err?.message?.includes('expired') || err?.message?.includes('401')) {
              logout();
            }
          })
          .finally(() => setIsLoading(false));
      } catch {
        logout();
        setIsLoading(false);
      }
    } else {
      // Auto-initialize demo evaluator session so charts and data are instantly live
      api.demoLogin('super_admin')
        .then((res) => {
          localStorage.setItem('nyayaniti_token', res.access_token);
          localStorage.setItem('nyayaniti_user', JSON.stringify(res.user));
          setUser(res.user);
        })
        .catch((err) => {
          console.warn('Backend not ready for initial demo login:', err);
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  // Sync high-contrast class to root body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Sync font size class to body
  useEffect(() => {
    document.body.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
    document.body.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  const login = async (u: string, p: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(u, p);
      localStorage.setItem('nyayaniti_token', res.access_token);
      localStorage.setItem('nyayaniti_user', JSON.stringify(res.user));
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (role: string) => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(role);
      localStorage.setItem('nyayaniti_token', res.access_token);
      localStorage.setItem('nyayaniti_user', JSON.stringify(res.user));
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('nyayaniti_token');
    localStorage.removeItem('nyayaniti_user');
    setUser(null);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  const toggleHighContrast = () => setHighContrast(prev => !prev);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        demoLogin,
        logout,
        hasRole,
        fontSize,
        setFontSize,
        highContrast,
        toggleHighContrast,
        language,
        setLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

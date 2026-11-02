import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api, setUnauthorizedHandler } from '../services/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired';

interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionExpired: boolean;
  sessionError: string | null;
  login: (u: string, p: string) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => void;
  clearSessionError: () => void;
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

/**
 * Safely inspect client-side JWT expiration claim without external libraries.
 * Returns true if expired or corrupted; false if exp claim is in the future.
 * Never logs or exposes the raw token.
 */
function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed || typeof parsed.exp !== 'number') {
      return false;
    }
    // Compare epoch seconds to current time
    return parsed.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const clearSessionStorage = useCallback(() => {
    localStorage.removeItem('nyayaniti_token');
    localStorage.removeItem('nyayaniti_user');
  }, []);

  const logout = useCallback(() => {
    clearSessionStorage();
    setUser(null);
    setAuthStatus('unauthenticated');
    setSessionError(null);
  }, [clearSessionStorage]);

  const handleSessionExpired = useCallback(() => {
    clearSessionStorage();
    setUser(null);
    setAuthStatus('expired');
    setSessionError('Your administrative session has expired. Please sign in again.');
  }, [clearSessionStorage]);

  const clearSessionError = useCallback(() => {
    setSessionError(null);
  }, []);

  // ============================================================
  // SECURE AUTHENTICATION INITIALIZATION
  // 1. Never auto-assign super_admin or call demoLogin on startup
  // 2. Validate token against backend /api/auth/me before setting user
  // 3. Clear invalid/expired tokens immediately
  // 4. Set loading=true during check to prevent admin UI flash
  // ============================================================
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);

    const validateExistingSession = async () => {
      setAuthStatus('loading');

      const token = localStorage.getItem('nyayaniti_token');
      if (!token) {
        // No token present: strictly unauthenticated
        clearSessionStorage();
        setUser(null);
        setAuthStatus('unauthenticated');
        return;
      }

      // Check client-side expiration
      if (isJwtExpired(token)) {
        clearSessionStorage();
        setUser(null);
        setAuthStatus('expired');
        setSessionError('Previous session has expired. Please sign in.');
        return;
      }

      // Validate against the server via /api/auth/me
      try {
        const verifiedUser = await api.getMe();
        if (verifiedUser && verifiedUser.id && verifiedUser.role) {
          setUser(verifiedUser);
          localStorage.setItem('nyayaniti_user', JSON.stringify(verifiedUser));
          setAuthStatus('authenticated');
          setSessionError(null);
        } else {
          throw new Error('Incomplete user profile received from authority registry');
        }
      } catch (err: any) {
        // Validation failed: clear tokens and set unauthenticated
        clearSessionStorage();
        setUser(null);

        const errMsg = err?.message || '';
        if (errMsg.includes('401') || errMsg.includes('credentials') || errMsg.includes('expired')) {
          setAuthStatus('expired');
          setSessionError('Your session credentials could not be verified. Please log in.');
        } else {
          // Backend offline or network error: do NOT grant access or auto-login
          setAuthStatus('unauthenticated');
          setSessionError('Authority verification service temporarily unavailable.');
        }
      }
    };

    validateExistingSession();

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSessionStorage, handleSessionExpired]);

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

  // Credential Login (Username / Password)
  const login = async (u: string, p: string) => {
    setAuthStatus('loading');
    setSessionError(null);
    try {
      const res = await api.login(u, p);
      if (!res.access_token || !res.user) {
        throw new Error('Authentication response missing access token or user credentials.');
      }
      localStorage.setItem('nyayaniti_token', res.access_token);
      localStorage.setItem('nyayaniti_user', JSON.stringify(res.user));
      setUser(res.user);
      setAuthStatus('authenticated');
    } catch (err) {
      clearSessionStorage();
      setUser(null);
      setAuthStatus('unauthenticated');
      throw err;
    }
  };

  // Explicit Evaluator Quick Role Selection (Triggered ONLY by manual button click)
  const demoLogin = async (role: string) => {
    setAuthStatus('loading');
    setSessionError(null);
    try {
      const res = await api.demoLogin(role);
      if (!res.access_token || !res.user) {
        throw new Error('Demo switch failed: invalid credentials returned.');
      }
      localStorage.setItem('nyayaniti_token', res.access_token);
      localStorage.setItem('nyayaniti_user', JSON.stringify(res.user));
      setUser(res.user);
      setAuthStatus('authenticated');
    } catch (err) {
      clearSessionStorage();
      setUser(null);
      setAuthStatus('unauthenticated');
      throw err;
    }
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  const toggleHighContrast = () => setHighContrast(prev => !prev);

  const isAuthenticated = authStatus === 'authenticated' && !!user;
  const isLoading = authStatus === 'loading';
  const isSessionExpired = authStatus === 'expired';

  return (
    <AuthContext.Provider
      value={{
        user,
        authStatus,
        isAuthenticated,
        isLoading,
        isSessionExpired,
        sessionError,
        login,
        demoLogin,
        logout,
        clearSessionError,
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

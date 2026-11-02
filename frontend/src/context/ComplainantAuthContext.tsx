import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Complainant, ComplainantRegisterData } from '../types';
import { api } from '../services/api';

export type ComplainantAuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired';

interface ComplainantAuthContextType {
  complainant: Complainant | null;
  authStatus: ComplainantAuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionExpired: boolean;
  sessionError: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: ComplainantRegisterData) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  clearSessionError: () => void;
}

const ComplainantAuthContext = createContext<ComplainantAuthContextType | undefined>(undefined);

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
    return parsed.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const ComplainantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [complainant, setComplainant] = useState<Complainant | null>(null);
  const [authStatus, setAuthStatus] = useState<ComplainantAuthStatus>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);

  const clearSessionStorage = useCallback(() => {
    localStorage.removeItem('nyayaniti_complainant_token');
    localStorage.removeItem('nyayaniti_complainant_user');
  }, []);

  const logout = useCallback(() => {
    clearSessionStorage();
    setComplainant(null);
    setAuthStatus('unauthenticated');
    setSessionError(null);
  }, [clearSessionStorage]);

  const clearSessionError = useCallback(() => {
    setSessionError(null);
  }, []);

  // Validate existing complainant session on startup
  useEffect(() => {
    const validateExistingSession = async () => {
      setAuthStatus('loading');
      const token = localStorage.getItem('nyayaniti_complainant_token');
      if (!token) {
        clearSessionStorage();
        setComplainant(null);
        setAuthStatus('unauthenticated');
        return;
      }

      if (isJwtExpired(token)) {
        clearSessionStorage();
        setComplainant(null);
        setAuthStatus('expired');
        setSessionError('Citizen session has expired. Please log in again.');
        return;
      }

      try {
        const verified = await api.getComplainantMe();
        if (verified && verified.id && verified.email) {
          setComplainant(verified);
          localStorage.setItem('nyayaniti_complainant_user', JSON.stringify(verified));
          setAuthStatus('authenticated');
          setSessionError(null);
        } else {
          throw new Error('Incomplete complainant profile');
        }
      } catch (err: any) {
        clearSessionStorage();
        setComplainant(null);
        const errMsg = err?.message || '';
        if (errMsg.includes('401') || errMsg.includes('credentials') || errMsg.includes('expired')) {
          setAuthStatus('expired');
          setSessionError('Citizen session expired. Please log in.');
        } else {
          setAuthStatus('unauthenticated');
        }
      }
    };

    validateExistingSession();
  }, [clearSessionStorage]);

  const login = async (email: string, pass: string) => {
    setAuthStatus('loading');
    setSessionError(null);
    try {
      const res = await api.complainantLogin(email, pass);
      if (!res.access_token || !res.complainant) {
        throw new Error('Invalid login response from citizen authentication server.');
      }
      localStorage.setItem('nyayaniti_complainant_token', res.access_token);
      localStorage.setItem('nyayaniti_complainant_user', JSON.stringify(res.complainant));
      setComplainant(res.complainant);
      setAuthStatus('authenticated');
    } catch (err) {
      clearSessionStorage();
      setComplainant(null);
      setAuthStatus('unauthenticated');
      throw err;
    }
  };

  const register = async (data: ComplainantRegisterData) => {
    setAuthStatus('loading');
    setSessionError(null);
    try {
      await api.complainantRegister(data);
      // Auto login upon successful registration
      await login(data.email, data.password);
    } catch (err) {
      clearSessionStorage();
      setComplainant(null);
      setAuthStatus('unauthenticated');
      throw err;
    }
  };

  const demoLogin = async () => {
    setAuthStatus('loading');
    setSessionError(null);
    try {
      const res = await api.complainantDemoLogin();
      if (!res.access_token || !res.complainant) {
        throw new Error('Demo login failed: no valid citizen credentials returned.');
      }
      localStorage.setItem('nyayaniti_complainant_token', res.access_token);
      localStorage.setItem('nyayaniti_complainant_user', JSON.stringify(res.complainant));
      setComplainant(res.complainant);
      setAuthStatus('authenticated');
    } catch (err) {
      clearSessionStorage();
      setComplainant(null);
      setAuthStatus('unauthenticated');
      throw err;
    }
  };

  const isAuthenticated = authStatus === 'authenticated' && !!complainant;
  const isLoading = authStatus === 'loading';
  const isSessionExpired = authStatus === 'expired';

  return (
    <ComplainantAuthContext.Provider
      value={{
        complainant,
        authStatus,
        isAuthenticated,
        isLoading,
        isSessionExpired,
        sessionError,
        login,
        register,
        demoLogin,
        logout,
        clearSessionError,
      }}
    >
      {children}
    </ComplainantAuthContext.Provider>
  );
};

export const useComplainantAuth = () => {
  const ctx = useContext(ComplainantAuthContext);
  if (!ctx) throw new Error('useComplainantAuth must be used within a ComplainantAuthProvider');
  return ctx;
};


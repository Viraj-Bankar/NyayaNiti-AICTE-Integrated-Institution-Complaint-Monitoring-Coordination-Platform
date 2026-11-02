import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PublicHeader } from './PublicHeader';
import { AuthenticatedHeader } from './AuthenticatedHeader';

/**
 * GovHeader:
 * Conditional header rendering based on verified authentication state.
 *
 * Requirements:
 * - Use PublicHeader for unauthenticated users.
 * - Use AuthenticatedHeader for authenticated users.
 * - Suppress on citizen portal dashboard where ComplainantHeader is mounted.
 * - Ensure the authentication loading state does not briefly expose private navigation.
 */
export const GovHeader: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // If in protected complainant dashboard, ComplainantHeader is rendered inside the view
  if (location.pathname.startsWith('/complainant/dashboard')) {
    return null;
  }

  // If loading or unauthenticated or session expired, render ONLY PublicHeader
  if (isLoading || !isAuthenticated || !user) {
    return <PublicHeader />;
  }

  return <AuthenticatedHeader />;
};

export default GovHeader;

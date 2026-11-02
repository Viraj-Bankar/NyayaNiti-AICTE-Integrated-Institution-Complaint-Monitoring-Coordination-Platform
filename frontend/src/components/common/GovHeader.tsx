import React from 'react';
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
 * - Ensure the authentication loading state does not briefly expose private navigation.
 * - Do not merely hide private elements with CSS; mount/unmount cleanly.
 */
export const GovHeader: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // If loading or unauthenticated or session expired, render ONLY PublicHeader
  if (isLoading || !isAuthenticated || !user) {
    return <PublicHeader />;
  }

  return <AuthenticatedHeader />;
};

export default GovHeader;

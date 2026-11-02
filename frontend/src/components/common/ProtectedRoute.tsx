import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied } from './AccessDenied';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * ProtectedRoute:
 * Protects operational application routes from unauthenticated public visitors and unauthorized roles.
 *
 * Requirements:
 * 1. While authentication is initializing/loading, display an official loading spinner.
 * 2. If unauthenticated, redirect to `/` (Public Explore page) preserving intended destination in navigation state.
 * 3. If authenticated, verify user's role against `allowedRoles` (if specified).
 * 4. If the role is unauthorized, render official AccessDenied screen with required clearance information.
 * 5. If authenticated & authorized, allow access to children.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <AccessDenied requiredRoles={allowedRoles} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

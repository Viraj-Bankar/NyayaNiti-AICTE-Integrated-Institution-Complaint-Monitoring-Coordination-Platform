import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied } from './AccessDenied';

interface RoleRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

/**
 * RoleRoute:
 * Enforces role-based access control on frontend routes.
 * - Redirects unauthenticated visitors to /login preserving target location.
 * - Displays an official AccessDenied screen if the authenticated user lacks permissions.
 * - Permits super_admin unconditionally.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <AccessDenied requiredRoles={allowedRoles} />;
  }

  return <>{children}</>;
};

export default RoleRoute;


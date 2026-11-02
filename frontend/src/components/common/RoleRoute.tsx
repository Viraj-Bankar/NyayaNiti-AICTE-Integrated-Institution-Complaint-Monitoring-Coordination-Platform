import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

export interface RoleRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

/**
 * RoleRoute:
 * Backward-compatible wrapper delegating to ProtectedRoute with required roles.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  return <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>;
};

export default RoleRoute;

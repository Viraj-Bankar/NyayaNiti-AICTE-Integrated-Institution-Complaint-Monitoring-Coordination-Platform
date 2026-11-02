import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useComplainantAuth } from '../../context/ComplainantAuthContext';
import { useAuth } from '../../context/AuthContext';

export interface ComplainantProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ComplainantProtectedRoute:
 * Guards complainant-only pages (/complainant/home) against unauthenticated access.
 * 
 * Rules:
 * 1. While authentication is loading, display an official loading spinner.
 * 2. If authenticated as a complainant, render children.
 * 3. If authenticated as an officer (and not complainant), redirect to /dashboard.
 * 4. If completely unauthenticated, redirect to /complainant/login with return state.
 */
export const ComplainantProtectedRoute: React.FC<ComplainantProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated: isComplainantAuthenticated, isLoading: isComplainantLoading } = useComplainantAuth();
  const { isAuthenticated: isOfficerAuthenticated, isLoading: isOfficerLoading } = useAuth();
  const location = useLocation();

  if (isComplainantLoading || isOfficerLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62]" />
      </div>
    );
  }

  // 1. Valid complainant session -> Allow access
  if (isComplainantAuthenticated) {
    return <>{children}</>;
  }

  // 2. Officer session attempting to access complainant-only pages -> Redirect to officer workspace
  if (isOfficerAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Unauthenticated public visitor -> Redirect to complainant login
  return <Navigate to="/complainant/login" state={{ from: location }} replace />;
};

export default ComplainantProtectedRoute;

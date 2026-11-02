import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useComplainantAuth } from '../../context/ComplainantAuthContext';

export interface ComplainantProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ComplainantProtectedRoute:
 * Guards citizen grievance portal routes against unauthenticated access.
 * Strictly decoupled from officer ProtectedRoute to prevent role/token confusion.
 */
export const ComplainantProtectedRoute: React.FC<ComplainantProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useComplainantAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/complainant/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ComplainantProtectedRoute;


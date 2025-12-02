import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallbackPath?: string;
}

const defaultRedirect: Record<UserRole, string> = {
  OWNER: '/app/dashboard',
  HELPER: '/helper/today',
  CLIENT: '/client/home',
};

const RoleRoute = ({ allowedRoles, children, fallbackPath }: RoleRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading || (isAuthenticated && !user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user?.role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const target = fallbackPath ?? defaultRedirect[user.role];
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;


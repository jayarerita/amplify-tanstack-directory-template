import { useAuth, type UserRole } from '~/hooks/useAuth';
import { Navigate } from '@tanstack/react-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredGroup?: string;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredGroup, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasGroup, isAdmin } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} />;
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole) && !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <Navigate to="/" />
        </div>
      </div>
    );
  }

  // Check group-based access
  if (requiredGroup && !hasGroup(requiredGroup) && !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <Navigate to="/" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
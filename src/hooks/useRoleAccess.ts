import { useAuth, type UserRole } from './useAuth';

export function useRoleAccess() {
  const { userRole, userGroups, isAuthenticated } = useAuth();

  const canAccessAdmin = (): boolean => {
    if (!isAuthenticated) return false;
    return userRole === 'ADMIN' || userGroups.includes('ADMIN');
  };

  const canManageListings = (): boolean => {
    if (!isAuthenticated) return false;
    return userRole === 'BUSINESS_OWNER' || 
           userRole === 'ADMIN' || 
           userGroups.includes('BUSINESS_OWNER') || 
           userGroups.includes('ADMIN');
  };

  const canModerateContent = (): boolean => {
    if (!isAuthenticated) return false;
    return userRole === 'ADMIN' || userGroups.includes('ADMIN');
  };

  const canSubmitReviews = (): boolean => {
    return isAuthenticated; // All authenticated users can submit reviews
  };

  const canClaimListings = (): boolean => {
    return isAuthenticated; // All authenticated users can claim listings
  };

  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const hasGroup = (group: string): boolean => {
    return userGroups.includes(group);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const hasAnyGroup = (groups: string[]): boolean => {
    return groups.some(group => hasGroup(group));
  };

  return {
    canAccessAdmin,
    canManageListings,
    canModerateContent,
    canSubmitReviews,
    canClaimListings,
    hasRole,
    hasGroup,
    hasAnyRole,
    hasAnyGroup,
    userRole,
    userGroups,
    isAuthenticated,
  };
}
import { useState, useEffect } from 'react';
import { getCurrentUser, signOut, fetchUserAttributes, type AuthUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export type UserRole = 'USER' | 'BUSINESS_OWNER' | 'ADMIN';

export interface AuthState {
  user: AuthUser | null;
  userAttributes: Record<string, any> | null;
  userRole: UserRole | null;
  userGroups: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userAttributes: null,
    userRole: null,
    userGroups: [],
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuthState();

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkAuthState();
          break;
        case 'signedOut':
          setAuthState({
            user: null,
            userAttributes: null,
            userRole: null,
            userGroups: [],
            isLoading: false,
            isAuthenticated: false,
          });
          break;
        case 'tokenRefresh':
          checkAuthState();
          break;
        case 'tokenRefresh_failure':
          setAuthState({
            user: null,
            userAttributes: null,
            userRole: null,
            userGroups: [],
            isLoading: false,
            isAuthenticated: false,
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      
      // Extract user role from custom attribute
      const userRole = (attributes['custom:role'] as UserRole) || 'USER';
      
      // Extract groups from cognito:groups attribute (if available)
      const groups = attributes['cognito:groups'] ? 
        (attributes['cognito:groups'] as string).split(',') : [];

      setAuthState({
        user,
        userAttributes: attributes,
        userRole,
        userGroups: groups,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setAuthState({
        user: null,
        userAttributes: null,
        userRole: null,
        userGroups: [],
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setAuthState({
        user: null,
        userAttributes: null,
        userRole: null,
        userGroups: [],
        isLoading: false,
        isAuthenticated: false,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return authState.userRole === role;
  };

  const hasGroup = (group: string): boolean => {
    return authState.userGroups.includes(group);
  };

  const isAdmin = (): boolean => {
    return hasRole('ADMIN') || hasGroup('ADMIN');
  };

  const isBusinessOwner = (): boolean => {
    return hasRole('BUSINESS_OWNER') || hasGroup('BUSINESS_OWNER') || isAdmin();
  };

  return {
    ...authState,
    logout,
    checkAuthState,
    hasRole,
    hasGroup,
    isAdmin,
    isBusinessOwner,
  };
}

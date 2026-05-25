import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { getDashboardForRole } from '@/lib/rbac';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      try {
        const headers = { 'X-App-Id': appParams.appId, 'Content-Type': 'application/json' };
        if (appParams.token) headers['Authorization'] = `Bearer ${appParams.token}`;
        const resp = await fetch(`/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, { headers });
        
        let publicSettings = null;
        if (resp.ok) {
          publicSettings = await resp.json();
        } else {
          const errData = await resp.json().catch(() => ({}));
          const reason = errData?.extra_data?.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason || 'unknown', message: errData?.message || 'Failed to load app' });
          }
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }
        setAppPublicSettings(publicSettings);
        
        // Always check if the user is authenticated (works via cookie/session too, not just token)
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      // Enrich with app role — prefer role_type on User entity, then Employee.role
      // This ensures supervisor/manager/officer roles resolve correctly after role changes
      const platformRole = currentUser?.role;
      const roleType = currentUser?.role_type;

      if (currentUser?.email) {
        try {
          const matches = await base44.entities.Employee.filter({ email: currentUser.email });
          const employeeRole = matches.length > 0 ? matches[0].role : null;

          // Priority: platform super_admin/admin > role_type > Employee.role > platform role
          // Never downgrade a super_admin or admin — platform role wins for these elevated roles
          if (platformRole === 'super_admin' || roleType === 'super_admin') {
            currentUser.role = 'super_admin';
          } else if (platformRole === 'admin') {
            // Keep admin — only allow role_type to upgrade further (e.g. manager), never downgrade
            const upgradeRole = roleType && roleType !== 'user' ? roleType : null;
            currentUser.role = upgradeRole || 'admin';
          } else {
            const resolvedRole = roleType || employeeRole || platformRole;
            if (resolvedRole && resolvedRole !== 'user') {
              currentUser.role = resolvedRole;
            }
          }
        } catch (e) {
          // Non-fatal — fall back to platform role, never downgrade admin/super_admin
          console.warn('Could not fetch Employee role:', e.message);
          if (platformRole === 'super_admin' || roleType === 'super_admin') {
            currentUser.role = 'super_admin';
          } else if (platformRole === 'admin') {
            currentUser.role = roleType && roleType !== 'user' ? roleType : 'admin';
          } else if (roleType && roleType !== 'user') {
            currentUser.role = roleType;
          }
        }
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const markOnboardingComplete = async () => {
    if (!user) return;
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      setUser({ ...user, onboarding_completed: true });
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
    }
  };

  const getRoleDashboard = () => {
    if (!user) return '/';
    // user.role is already fully resolved in checkUserAuth (super_admin is never downgraded)
    const userRole = user.role || 'employee';
    return `/${getDashboardForRole(userRole)}`;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Save last page before logout (for post-re-login restoration)
      const lastPage = window.location.pathname;
      if (lastPage !== '/' && lastPage !== '/login' && lastPage !== '/LandingPage') {
        sessionStorage.setItem('nps_last_page', lastPage);
      }
      base44.auth.logout('/');
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Save last page before clearing session (for post-login restoration)
    const lastPage = window.location.pathname;
    if (lastPage !== '/' && lastPage !== '/login' && lastPage !== '/LandingPage') {
      sessionStorage.setItem('nps_last_page', lastPage);
    }
    window.location.href = "/Login";
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      markOnboardingComplete,
      getRoleDashboard
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
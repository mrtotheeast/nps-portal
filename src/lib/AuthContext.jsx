import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { getDashboardForRole } from '@/lib/rbac';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser) => {
    try {
      setIsLoadingAuth(true);
      const { data: profile } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const resolvedUser = {
        ...authUser,
        ...profile,
        email: authUser.email,
        role: profile?.role || 'employee',
      };

      setUser(resolvedUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Still set authenticated even if profile fetch fails
      setUser({ ...authUser, role: 'employee' });
      setIsAuthenticated(true);
      setAuthChecked(true);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user);
    }
  };

  const checkAppState = async () => {
    await checkUserAuth();
  };

  const markOnboardingComplete = async () => {
    if (!user) return;
    try {
      await supabase.from('user_profile')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      setUser({ ...user, onboarding_completed: true });
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
    }
  };

  const getRoleDashboard = () => {
    if (!user) return '/';
    const userRole = user.role || 'employee';
    return `/${getDashboardForRole(userRole)}`;
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/Login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/Login';
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

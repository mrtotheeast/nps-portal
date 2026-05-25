import { supabase } from './supabaseClient';

const authMe = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', user.id)
    .single();
  return { ...user, ...profile, email: user.email };
};

const authLogout = async (redirectUrl) => {
  await supabase.auth.signOut();
  window.location.href = redirectUrl || '/Login';
};

export const base44 = {
  auth: {
    me: authMe,
    logout: authLogout,
    redirectToLogin: () => { window.location.href = '/Login'; },
    updateMe: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: result } = await supabase
        .from('user_profile')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();
      return result;
    },
  },
  entities: new Proxy({}, {
    get: (_, entityName) => ({
      filter: async () => [],
      list: async () => [],
      get: async () => null,
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
    })
  }),
  functions: new Proxy({}, {
    get: (_, fnName) => async () => ({ success: false, message: 'Backend function not yet migrated' })
  }),
};

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './useAuth';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
      return null;
    }

    setProfileError(null);
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) setProfile(await loadProfile(sessionUser.id));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Awaiting a client call inside this callback deadlocks supabase-js.
      setTimeout(async () => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        setProfile(sessionUser ? await loadProfile(sessionUser.id) : null);
        if (!sessionUser) setProfileError(null);
        setLoading(false);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      const loadedProfile = await loadProfile(data.user.id);
      setUser(data.user);
      setProfile(loadedProfile);
      return { user: data.user, profile: loadedProfile };
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await loadProfile(user.id));
  }, [user, loadProfile]);

  const value = {
    user,
    profile,
    profileError,
    loading,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

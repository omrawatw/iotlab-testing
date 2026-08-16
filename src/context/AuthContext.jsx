import { createContext, useContext, useEffect, useState } from 'react';
import { watchAuthState, signIn, signOutAdmin } from '../supabase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = watchAuthState((u, admin) => {
      setUser(u);
      setIsAdmin(admin);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user,
    isAdmin,
    loading,
    login: signIn,
    logout: signOutAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

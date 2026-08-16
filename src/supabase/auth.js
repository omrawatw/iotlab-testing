import { supabase } from './config';

/**
 * Admin accounts are provisioned manually (Supabase SQL Editor or Table
 * Editor) — there is no public sign-up flow. Admin status is checked via
 * the is_admin() database function (see supabase/schema.sql) rather than
 * reading the `admins` table directly from the browser: that table has
 * Row Level Security enabled with no policies at all, so a direct client
 * read is always blocked regardless of who's asking. is_admin() is a
 * SECURITY DEFINER function, so it can check membership on the table's
 * behalf without the table itself ever being readable from the client.
 */
async function checkIsAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return data === true;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error('This account is not authorized for admin access.');
  }
  return data.user;
}

export function signOutAdmin() {
  return supabase.auth.signOut();
}

/** Subscribes to auth state; callback receives (user, isAdmin). */
export function watchAuthState(callback) {
  async function resolve(session) {
    const user = session?.user || null;
    if (!user) return callback(null, false);
    try {
      const isAdmin = await checkIsAdmin();
      callback(user, isAdmin);
    } catch (err) {
      console.error('Admin check failed:', err);
      callback(user, false);
    }
  }

  supabase.auth.getSession().then(({ data }) => resolve(data.session));
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => resolve(session));
  return () => sub.subscription.unsubscribe();
}

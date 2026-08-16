import { createClient } from '@supabase/supabase-js';

// Read from Supabase Dashboard -> Project Settings -> API. The anon key is
// safe to expose in the browser bundle by design — Row Level Security
// (supabase/schema.sql) is what actually restricts what it can read/write,
// the same way the Firebase config object wasn't the real security
// boundary before.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

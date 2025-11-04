/**
 * supabaseClient.ts
 *
 * Initializes and exports a Supabase client for use across the app.
 *
 * Constants:
 * - supabaseUrl: string — Supabase project URL from environment variables
 * - supabaseAnonKey: string — Supabase anon key from environment variables
 *
 * Export:
 * - supabase: SupabaseClient — configured client for querying the database
 *
 * Notes:
 * - Safe to use on both server and client
 * - Pulls credentials from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Always create a Supabase client — server-side safe
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

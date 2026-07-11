import { createClient } from '@supabase/supabase-js';

// Placeholders keep createClient from throwing at import when env is unset
// (e.g. CI builds without secrets, or local-first dev). Real usage is always
// gated by isSupabaseConfigured(), so the placeholders are never contacted.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role (bypasses RLS).
// Use ONLY for admin operations: user creation, schema migrations, embedding ingestion.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Whether server-side persistence is available (Supabase configured).
 * When false, the app runs local-first and routes degrade to graceful no-ops.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * @deprecated Legacy anon/RLS server client. The custom-JWT auth model means
 * `auth.uid()` is null and RLS rejects these queries — prefer `getServerDb()`
 * (service-role + app-enforced scoping). Retained only for older modules that
 * still import it (mentor-engine, retrieval).
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * The canonical server-side data client.
 *
 * AUTHORIZATION MODEL (decided in Phase 0): the app authenticates with its own
 * JWT (see lib/auth.ts), NOT Supabase Auth — so Postgres `auth.uid()` is always
 * null and RLS policies keyed on it would reject every query. We therefore use
 * the service-role client for all server data access and treat **explicit
 * `.eq('user_id', userId)` scoping in this data layer as the authorization
 * boundary**. RLS remains enabled in the schema as defense-in-depth for any
 * future Supabase-Auth surface, but must never be relied on here.
 *
 * Returns `null` when Supabase isn't configured so callers stay local-first.
 */
export function getServerDb() {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

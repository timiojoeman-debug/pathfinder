-- Pin search_path on the four functions the Supabase security advisor flags
-- as having a mutable search_path.
--
-- Pinned to `public`, not '': the pgvector extension and its operators live in
-- the public schema, so an empty search_path would break the vector function.
--
-- Signatures are the ones that exist in production. Note the RAG function there
-- is match_methodology_chunks(vector, integer, character varying); the repo's
-- 0004_rag_functions defines match_methodology(vector(1536), float, int) instead
-- (already pinned), and the app calls match_methodology. They are different
-- functions, so this alters the production one as it stands.
alter function public.ai_usage_daily(p_days integer) set search_path = public;
alter function public.match_methodology_chunks(query_embedding vector, match_count integer, filter_topic character varying) set search_path = public;
alter function public.rate_limit_hit(p_key text, p_window_ms bigint) set search_path = public;
alter function public.record_error(p_message text, p_context jsonb) set search_path = public;

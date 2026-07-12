-- RAG retrieval support for methodology_chunks.
--
-- Adds the unique key the embedding upsert relies on, plus the similarity
-- search function the app actually calls (src/lib/ai/retrieval.ts →
-- rpc('match_methodology', ...)). Applied out-of-band during RAG setup and
-- captured here so a fresh project reproduces the deployed state.
--
-- Idempotent: constraint guarded by a catalog check, function via create-or-replace.

-- Unique title so embedDocumentChunks()'s upsert(onConflict:'title') works and re-runs cleanly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'methodology_chunks_title_key'
  ) then
    alter table methodology_chunks add constraint methodology_chunks_title_key unique (title);
  end if;
end $$;

-- Cosine-similarity retrieval over the embedded methodology chunks.
-- Signature matches the app call: (query_embedding, match_threshold, match_count).
-- search_path pinned to public so the vector operators + table resolve.
create or replace function match_methodology(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) returns table (title varchar, chunk_text text, similarity float)
language sql stable
set search_path = public
as $$
  select mc.title, mc.chunk_text,
         1 - (mc.embedding <=> query_embedding) as similarity
  from public.methodology_chunks mc
  where mc.embedding is not null
    and 1 - (mc.embedding <=> query_embedding) > match_threshold
  order by mc.embedding <=> query_embedding
  limit match_count
$$;

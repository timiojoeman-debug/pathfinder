-- Cross-device persistence: the full client working-state blob (the same slice
-- the browser persists to localStorage). The app treats localStorage as a cache
-- of this column, hydrating it on login so a user's journey follows them across
-- devices. Normalized per-domain tables remain the query surface; this is the
-- fast whole-state snapshot.
alter table profiles add column if not exists client_state jsonb default '{}';

-- Every write of a home's save gets its own random id as well as the next
-- revision number. A device saves "over revision N, which was write X"; if the
-- database was ever restored from a backup and the numbers come round again,
-- the id still tells the two apart and the device is asked instead of
-- writing over someone else's save.
alter table home_saves add column save_id uuid not null default gen_random_uuid();

-- Copies of a home that were put aside, so a home replaced by mistake (the
-- wrong choice on a new device, a stale tab) can be put back from any device.
-- A copy is kept when a save replaces one that is more than ten minutes old,
-- when a device says it is replacing the server's copy on purpose, and when a
-- device hands over its own copy before taking the server's instead. Each
-- home keeps its newest copies up to forty and up to a size budget
-- (server/home-saves.mjs).
create table home_history (
  id bigint generated always as identity primary key,
  home_id bigint not null references homes (id) on delete cascade,
  -- 'server': the save that was on the server; 'device': a device's own copy.
  source text not null check (source in ('server', 'device')),
  -- The server revision it was, for a server copy.
  revision bigint,
  doc jsonb not null check (jsonb_typeof(doc) = 'object'),
  -- When this copy was saved, and when it was put aside.
  saved_at timestamptz not null,
  kept_at timestamptz not null default now(),
  kept_by bigint references accounts (id) on delete set null,
  -- Measured when kept, so listing never has to open the documents: the
  -- size counts against the home's budget; works and notes help a person
  -- recognise the copy.
  bytes integer not null check (bytes >= 0),
  works integer not null default 0,
  notes integer not null default 0,
  -- Put aside on purpose (a choice, a device handing its copy over), not
  -- just because it had sat ten minutes: these are the last to go.
  on_purpose boolean not null default false
);

create index home_history_newest on home_history (home_id, kept_at desc, id desc);

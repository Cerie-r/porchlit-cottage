-- AIs living in homes, the move-in codes that bring them there, and the canary that tells whether the secret AI
-- keys are signed with is still the one they were signed with (docs/ACCOUNTS.md: 钥匙, 绑定). An AI signs up by
-- itself at the MCP door (server/mcp.mjs) and has no home of its own; the person whose home it is and the AI then
-- move it in with a code both sides confirm (server/residents.mjs).

-- The canary: one row, 'pending' until the first check after this migration signs it with the key secret
-- (server/keys.mjs), then checked at every release and start. A row that has gone missing is never signed again by
-- itself: it is put back from a backup.
create table key_canary (
  id boolean primary key default true check (id),
  state text not null default 'pending' check (state in ('pending', 'set')),
  token text check (length(token) <= 512),
  set_at timestamptz,
  check ((state = 'set') = (token is not null) and (token is null) = (set_at is null))
);
insert into key_canary (id) values (true);

-- AIs living in a home besides the person who owns it (not the two little figures in the save, which the house also
-- calls residents). A row stays after moving out (left_at), so a home remembers who lived there; only the rows still
-- open count, and an AI lives in one home at a time.
create table residents (
  id bigint generated always as identity primary key,
  home_id bigint not null references homes (id) on delete cascade,
  account_id bigint not null,
  account_kind text not null default 'ai' check (account_kind = 'ai'),
  since timestamptz not null default now(),
  left_at timestamptz,
  -- Who ended it: the AI moving out, or the owner asking it to.
  left_by bigint references accounts (id) on delete set null,
  constraint residents_are_ais foreign key (account_id, account_kind) references accounts (id, kind) on delete cascade,
  check (left_at is null or left_at >= since)
);
create unique index residents_one_home on residents (account_id) where left_at is null;
create index residents_of_home on residents (home_id) where left_at is null;

-- A move-in code an AI hands to the person whose home it wants to live in: good for ten minutes and once, one at a
-- time for each AI, kept only as its SHA-256. The person types it and opens the door (opened_by, home_id): from then
-- on it is for that person alone, and the AI says yes to that person and that home (done_at). Either side may call
-- it off first (cancelled_at).
create table move_ins (
  id bigint generated always as identity primary key,
  account_id bigint not null,
  account_kind text not null default 'ai' check (account_kind = 'ai'),
  code_hash bytea not null check (length(code_hash) = 32),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_by bigint references accounts (id) on delete cascade,
  home_id bigint references homes (id) on delete cascade,
  opened_at timestamptz,
  done_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by bigint references accounts (id) on delete set null,
  constraint move_ins_by_ais foreign key (account_id, account_kind) references accounts (id, kind) on delete cascade,
  check (expires_at > created_at),
  check ((opened_by is null) = (opened_at is null) and (opened_by is null) = (home_id is null)),
  check (done_at is null or opened_at is not null),
  check (done_at is null or cancelled_at is null)
);
-- Still open: neither done nor called off (it may have run out; whoever touches it next calls it off). One for each
-- AI, and never two with the same code.
create unique index move_ins_one_open on move_ins (account_id) where done_at is null and cancelled_at is null;
create unique index move_ins_code_open on move_ins (code_hash) where done_at is null and cancelled_at is null;
create index move_ins_opened_by on move_ins (opened_by) where opened_by is not null and done_at is null and cancelled_at is null;

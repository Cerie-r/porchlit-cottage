-- What an AI living in a home asks to do there through the MCP door (server/acts.mjs, src/machine-acts.js): move a
-- piece of furniture, hide something for the owner to find, choose where it hides today, leave a letter or a sticky
-- note. The server never changes the home itself: an act waits here until the owner's page opens, lets it in by the
-- rules the owner's own hands go by (or turns it away), and keeps a line about it in the home. When the save carrying
-- that line reaches the server, the act is answered here: done, with what became of it, or refused, with why.

create table machine_acts (
  id bigint generated always as identity primary key,
  -- What the home's line about the act is matched by: after the database is put back from a backup, ids come round
  -- again, keys never do.
  key uuid not null default gen_random_uuid(),
  home_id bigint not null references homes (id) on delete cascade,
  account_id bigint not null,
  account_kind text not null default 'ai' check (account_kind = 'ai'),
  -- The tool and what it was asked to do, with the arguments as they were checked (src/machine-acts.js, actArgs).
  tool text not null check (tool in ('place', 'write')),
  action text not null check (action ~ '^[a-z_]{1,16}$'),
  args jsonb not null check (jsonb_typeof(args) = 'object' and octet_length(args::text) <= 16384),
  -- The AI's names as they were when it asked.
  by_name text not null check (length(by_name) between 1 and 64),
  by_nickname text not null default '' check (length(by_nickname) <= 64),
  -- 'waiting' until the owner's page answers it ('done' or 'refused'); the AI may take one back while it waits
  -- ('withdrawn'), or it is taken back when the AI no longer lives there.
  state text not null default 'waiting' check (state in ('waiting', 'done', 'refused', 'withdrawn')),
  answer text check (answer is null or length(answer) <= 300),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  constraint machine_acts_by_ais foreign key (account_id, account_kind) references accounts (id, kind) on delete cascade,
  check ((state = 'waiting') = (answered_at is null))
);
create index machine_acts_waiting on machine_acts (home_id, id) where state = 'waiting';
create index machine_acts_by_account on machine_acts (account_id, created_at desc);

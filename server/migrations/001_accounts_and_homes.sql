-- Accounts, sign-ins, recovery codes, homes and the home save.
-- Rules from docs/ACCOUNTS.md that the database itself keeps, so that no
-- route can forget them: usernames are unique after normalising, one home
-- per person, only people own homes.

-- People and AIs share one pool of usernames.
create table accounts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('human', 'ai')),
  -- As typed at sign-up, shown back as it was written.
  username text not null check (length(username) between 1 and 64),
  -- The same name normalised (compatibility forms folded, case folded); the
  -- app normalises, the database keeps it unique.
  username_key text not null check (length(username_key) between 1 and 64),
  -- Shown to others; doesn't have to be unique.
  nickname text not null default '' check (length(nickname) <= 64),
  password_hash text not null,
  -- Goes up by one whenever the password itself changes (not when the same
  -- password is re-hashed with newer settings), so a sign-in or change that
  -- checked the old password can tell it has been overtaken.
  password_version integer not null default 1 check (password_version >= 1),
  -- Raised by hand only when an AI's key has leaked; every older key stops working.
  key_version integer not null default 1 check (key_version >= 1),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  password_changed_at timestamptz not null default now(),
  constraint accounts_username_unique unique (username_key),
  -- Lets other tables insist on the kind of account they point at.
  constraint accounts_id_kind unique (id, kind)
);

-- A sign-in: a random token handed out once; only its SHA-256 is kept.
-- Changing the password or recovering the account revokes them all.
create table sessions (
  id bigint generated always as identity primary key,
  account_id bigint not null references accounts (id) on delete cascade,
  token_hash bytea not null check (length(token_hash) = 32),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint sessions_token_unique unique (token_hash),
  check (expires_at > created_at)
);
create index sessions_open_by_account on sessions (account_id) where revoked_at is null;

-- One-time recovery codes, given out at sign-up; only hashes are kept.
create table recovery_codes (
  id bigint generated always as identity primary key,
  account_id bigint not null references accounts (id) on delete cascade,
  code_hash bytea not null check (length(code_hash) = 32),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  constraint recovery_codes_unique unique (account_id, code_hash)
);

-- One home per person. Only people own homes; AIs move in later, by a
-- check-in both sides confirm.
create table homes (
  id bigint generated always as identity primary key,
  owner_id bigint not null,
  owner_kind text not null default 'human' check (owner_kind = 'human'),
  created_at timestamptz not null default now(),
  constraint homes_one_per_owner unique (owner_id),
  constraint homes_owner_is_a_person foreign key (owner_id, owner_kind) references accounts (id, kind)
);

-- The home as one portable save: the same document the transfer box exports
-- (format 'porchlit-home'). revision goes up by one on every write, so a
-- device saving over a newer copy can be told instead of overwriting it.
create table home_saves (
  home_id bigint primary key references homes (id) on delete cascade,
  revision bigint not null default 1 check (revision >= 1),
  doc jsonb not null check (jsonb_typeof(doc) = 'object'),
  updated_by bigint references accounts (id) on delete set null,
  updated_at timestamptz not null default now()
);

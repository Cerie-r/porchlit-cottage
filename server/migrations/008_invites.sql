-- Invitations to hang a door plate. Once the place names the home it is run by
-- (OURS_ACCOUNTS, server/ours.mjs), a new door plate takes one of the
-- invitations that home writes: each lets one person in, until it is used,
-- torn up or out of date. The code is kept as written (eight characters from
-- Crockford's base 32), so its writer can copy it again; it opens nothing but
-- the sign-up.
create table invites (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  -- Who it is for, as its writer noted it; nobody else sees it.
  label text not null default '' check (length(label) <= 64),
  written_by bigint not null references accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by bigint references accounts (id) on delete set null,
  used_at timestamptz,
  torn_at timestamptz,
  constraint invites_code_unique unique (code),
  check (expires_at > created_at),
  check (used_by is null or used_at is not null),
  check (used_at is null or torn_at is null)
);
create index invites_by_writer on invites (written_by, created_at desc);

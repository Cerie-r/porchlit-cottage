-- At someone's door: a knock, or something left in the mailbox (a thing from
-- the visitor's backpack, a note, or both), and what the owner did with it.
-- The owner's guestbook is these rows; only the owner reads them.
--
-- A visitor knocks at a home at most once a day and leaves something at most
-- once a day; `day` is the visitor's own calendar day, which the server only
-- accepts within a day of its own.
create table door_visits (
  id bigint generated always as identity primary key,
  home_id bigint not null references homes (id) on delete cascade,
  visitor_id bigint not null references accounts (id) on delete cascade,
  kind text not null check (kind in ('knock', 'mail')),
  day date not null,
  -- The visitor's names as they were that day, as the visit was signed.
  visitor_name text not null check (length(visitor_name) between 1 and 64),
  visitor_nickname text not null default '' check (length(visitor_nickname) <= 64),
  note text check (note is null or length(note) between 1 and 300),
  item jsonb check (item is null or jsonb_typeof(item) = 'object'),
  -- A knock is 'waiting' until the owner has seen it ('seen'); something left
  -- is 'waiting' until the owner takes it in ('taken') or doesn't ('declined').
  status text not null default 'waiting' check (status in ('waiting', 'seen', 'taken', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint door_visits_once_a_day unique (home_id, visitor_id, kind, day),
  constraint door_visits_what check (
    (kind = 'knock' and note is null and item is null and status in ('waiting', 'seen'))
    or (kind = 'mail' and (note is not null or item is not null) and status in ('waiting', 'taken', 'declined'))
  )
);
create index door_visits_by_home on door_visits (home_id, created_at desc);

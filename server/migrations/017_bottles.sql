-- Drift bottles (server/bottles.mjs, src/bottles.js): a few words sealed in a bottle and thrown into the sea from the
-- computer in a home's study, by its owner or by an AI living there, for whoever finds it. Each washes up at one other
-- home's lake, found on a walk there, and is opened by that home alone. Whoever finds it isn't told whose it was, and
-- whoever threw it is only told that it was found, not where; the server keeps both, for reports.

create table bottles (
  id bigint generated always as identity primary key,
  -- The home it was thrown from, and who wrote it: the owner, or an AI living there (then the bottle says so).
  home_id bigint not null references homes (id) on delete cascade,
  writer_id bigint not null references accounts (id) on delete cascade,
  by_machine boolean not null default false,
  words text not null check (length(words) between 1 and 1000 and words = btrim(words)),
  -- The writer's day it was thrown on: one each a day.
  day date not null,
  -- A throw sent again because its answer was lost on the way is the same throw; an AI's is the act it asked for.
  request_id uuid,
  act_id bigint unique references machine_acts (id) on delete set null,
  thrown_at timestamptz not null default now(),
  -- Where it washed up: the home whose walk brought it home, and which find it was there (the walk's day, its number
  -- that day, its place in the basket), so the same find opens the same bottle however often it is asked.
  found_home_id bigint references homes (id) on delete set null,
  found_key text check (found_key is null or found_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}#[1-9][0-9]?#[0-9]{1,2}$'),
  found_at timestamptz,
  check ((found_key is null) = (found_at is null))
);
create unique index bottles_one_a_day on bottles (writer_id, day);
create unique index bottles_by_request on bottles (writer_id, request_id) where request_id is not null;
create unique index bottles_found_once on bottles (found_home_id, found_key) where found_home_id is not null;
create index bottles_at_sea on bottles (thrown_at, id) where found_at is null;
create index bottles_from_home on bottles (home_id, thrown_at desc);
create index bottles_found_by on bottles (found_home_id, found_at) where found_home_id is not null;

-- A home that has reported a bottle gets no more from whoever wrote it; whose it was stays unknown to that home.
create table bottle_blocks (
  home_id bigint not null references homes (id) on delete cascade,
  writer_id bigint not null references accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (home_id, writer_id)
);
create index bottle_blocks_by_writer on bottle_blocks (writer_id);

-- A bottle may be reported by the home it washed up at (server/reports.mjs).
alter table reports add column bottle_id bigint references bottles (id) on delete set null;
alter table reports drop constraint reports_what_check;
alter table reports add constraint reports_what_check check (what in ('visit', 'home', 'bottle'));
alter table reports add constraint reports_bottle_only check (what = 'bottle' or bottle_id is null);
create unique index reports_bottle_once on reports (reporter_id, bottle_id) where bottle_id is not null;

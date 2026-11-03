-- The community map: streets, a lot on one for every home, and the light at
-- each home's door.
--
-- A street is one map of 64 lots. When the newest street is full the next one
-- opens beside it; where a street sits among the others follows from its
-- number alone (src/street-layout.js), so only the number (its id) and a seed
-- are kept. Neither the street's number nor a lot's is ever shown to anyone.
create table streets (
  id bigint generated always as identity primary key,
  -- Varies this street's trees, flowers and gardens a little.
  seed integer not null check (seed > 0),
  created_at timestamptz not null default now()
);

-- porch is the light its owner sets, shown on the map and at the door:
--   'on'  the light is on: come up to the door (and later knock, leave things)
--   'dim' a small light left on: come and look at the door, no knocking
--   'dnd' do not disturb: seen from the street only
--   'off' lights out, locked
alter table homes
  add column street_id bigint references streets (id),
  add column lot smallint check (lot between 0 and 63),
  add column porch text not null default 'on' check (porch in ('on', 'dim', 'dnd', 'off')),
  add constraint homes_lot_unique unique (street_id, lot),
  add constraint homes_lot_whole check ((street_id is null) = (lot is null));

-- The first street, and a lot on it for each home there already is: homes in
-- a random order onto lots in a random order. Should there ever be more than
-- 64, the rest are given a lot the first time they're asked about
-- (server/streets.mjs).
insert into streets (seed) values (1 + floor(random() * 2147483646)::int);

with picked as (select id, row_number() over (order by random()) as k from homes),
     lots as (select lot, row_number() over (order by random()) as k from generate_series(0, 63) as lot)
update homes h
   set street_id = (select min(id) from streets), lot = lots.lot
  from picked join lots using (k)
 where h.id = picked.id;

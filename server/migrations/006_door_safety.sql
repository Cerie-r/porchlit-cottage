-- 005 is reserved for a separate branch. Applied files stay immutable.
alter table door_visits add column request_id uuid;
alter table door_visits add column request_hash text;
alter table door_visits add column delivered_at timestamptz;
alter table door_visits add column item_kind text;
alter table door_visits add column item_name text;
update door_visits set item_kind = item->>'kind', item_name = item->>'name';
create unique index door_visits_request on door_visits (visitor_id, request_id) where request_id is not null;
create index door_visits_pending on door_visits (home_id, created_at) where status = 'waiting' or (status = 'taken' and delivered_at is null);
alter table door_visits drop constraint door_visits_what;
alter table door_visits add constraint door_visits_what check (
 (kind = 'knock' and note is null and item is null and status in ('waiting', 'seen')) or
 (kind = 'mail' and status in ('waiting', 'taken', 'declined') and
  (note is not null or item is not null or status = 'declined' or delivered_at is not null))
);

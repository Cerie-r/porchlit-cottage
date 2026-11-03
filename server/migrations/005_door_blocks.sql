-- Who a home's owner has blocked. To someone blocked the home's lot is an
-- empty lot on the map and its door can't be reached; whatever they had left
-- waiting there is turned away when they are blocked. The owner sees the list
-- and can take a name off it.
create table door_blocks (
  id bigint generated always as identity primary key,
  home_id bigint not null references homes (id) on delete cascade,
  blocked_id bigint not null references accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint door_blocks_once unique (home_id, blocked_id)
);
create index door_blocks_by_blocked on door_blocks (blocked_id);

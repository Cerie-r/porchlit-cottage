-- What the wardrobe has for each of the two figures in a home today, and what each has on, as the owner's page works
-- it out (src/machine-closet.js) and sends it (PUT /api/home/closet): what an AI living there sees when it looks at
-- the wardrobe (the look tool's wardrobe), and what its asks to dress them are checked against before they wait in
-- the queue (src/machine-acts.js, dress). Not part of the home itself: the page can always work it out again, and
-- keeping it out of the save keeps two open devices from quarrelling over it.
create table home_closets (
  home_id bigint primary key references homes (id) on delete cascade,
  closet jsonb not null check (jsonb_typeof(closet) = 'object' and octet_length(closet::text) <= 65536),
  updated_at timestamptz not null default now()
);

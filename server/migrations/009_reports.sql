-- Reports: someone tells the home the place is run by (OURS_ACCOUNTS) about
-- another account, for something it left at their door or in their guestbook
-- (a visit), or for its home as they found it on the street. A copy of what
-- was reported is kept as it was then: the visit is emptied once its sender is
-- blocked, which reporting also does. Only the running home reads them, and
-- closes each: nothing wrong ('fine'), or that account switched off
-- ('disabled').
create table reports (
  id bigint generated always as identity primary key,
  reporter_id bigint not null references accounts (id) on delete cascade,
  reported_id bigint not null references accounts (id) on delete cascade,
  what text not null check (what in ('visit', 'home')),
  visit_id bigint references door_visits (id) on delete set null,
  reason text not null check (reason in ('harass', 'adult', 'spam', 'other')),
  words text check (words is null or length(words) between 1 and 200),
  copy jsonb not null check (jsonb_typeof(copy) = 'object'),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by bigint references accounts (id) on delete set null,
  outcome text check (outcome in ('fine', 'disabled')),
  check ((closed_at is null) = (outcome is null)),
  check (reporter_id <> reported_id),
  check (what = 'visit' or visit_id is null)
);
-- A visit is reported once by whoever it was left with; a home once at a time by the same person.
create unique index reports_visit_once on reports (reporter_id, visit_id) where visit_id is not null;
create unique index reports_home_open on reports (reporter_id, reported_id) where what = 'home' and closed_at is null;
create index reports_open on reports (created_at) where closed_at is null;
create index reports_about on reports (reported_id) where closed_at is null;
-- The guestbook marks what was reported; a visit cleared away clears its reports' link.
create index reports_by_visit on reports (visit_id) where visit_id is not null;

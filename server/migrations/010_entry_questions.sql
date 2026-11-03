-- Answering questions to hang a door plate, for whoever has no invitation (docs/ACCOUNTS.md, 答题进门). The home
-- the place is run by writes the questions: multiple choice, judged there and then, and short answers, which it reads
-- before the newcomer's door plate goes up. It opens or closes this way in, and says how many may come in by it in a
-- day and in all.
create table entry_questions (
  id bigint generated always as identity primary key,
  kind text not null default 'choice' check (kind in ('choice', 'text')),
  text text not null check (length(text) between 1 and 100),
  -- A choice question's two to four choices and which one is right; a short-answer question has neither.
  choices jsonb,
  answer smallint,
  written_by bigint references accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (case when kind = 'choice' then
           case when jsonb_typeof(choices) = 'array'
                then coalesce(jsonb_array_length(choices) between 2 and 4 and answer >= 0 and answer < jsonb_array_length(choices), false)
                else false end
         else choices is null and answer is null end)
);

-- This way in, as one row: whether it is open, the street's rules a newcomer reads first (the questions come out of
-- them), how many of the choice questions a newcomer is asked (all the short ones are), and how many may come in by it
-- in a day (the last 24 hours) and in all (null: no limit).
create table entry_door (
  id boolean primary key default true check (id),
  open boolean not null default false,
  rules text not null default '' check (length(rules) <= 2000),
  ask smallint not null default 3 check (ask between 1 and 5),
  per_day integer check (per_day is null or per_day >= 0),
  total integer check (total is null or total >= 0),
  updated_at timestamptz not null default now()
);
insert into entry_door (id, per_day, total) values (true, 10, 200);

-- A newcomer whose short answers wait to be read. The account is made but switched off (accounts.disabled_at) until
-- the running home lets it in; if it doesn't, the account goes again ('out'). What they wrote is kept as it was
-- asked, with their names, so the decision can be told to them.
create table entry_answers (
  id bigint generated always as identity primary key,
  account_id bigint references accounts (id) on delete set null,
  username text not null check (length(username) between 1 and 64),
  username_key text not null check (length(username_key) between 1 and 64),
  nickname text not null default '' check (length(nickname) <= 64),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by bigint references accounts (id) on delete set null,
  outcome text check (outcome in ('in', 'out')),
  check ((decided_at is null) = (outcome is null))
);
create index entry_answers_waiting on entry_answers (created_at) where decided_at is null;
create index entry_answers_by_name on entry_answers (username_key, created_at desc);

-- How an account came in, from now on (with an invitation, or by the questions), and when its owner said they are an
-- adult (everyone hanging a door plate does).
alter table accounts add column came_by text check (came_by in ('invite', 'quiz'));
alter table accounts add column adult_at timestamptz;
create index accounts_by_questions on accounts (created_at) where came_by = 'quiz';

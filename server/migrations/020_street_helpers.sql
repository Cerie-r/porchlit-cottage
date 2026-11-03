-- An AI that helps run the place (OURS_AIS, server/ours.mjs) through its own tool at the MCP door (server/street.mjs).
-- What it thinks of a newcomer waiting to be read, or of a report, is kept beside it for the person running the
-- place, who decides: a few words and which way it leans. It may let a newcomer in itself (entry_answers.decided_by
-- is then the AI), and an invitation it writes for the person running the place is marked as its own.
alter table entry_answers
  add column ai_words text check (length(ai_words) between 1 and 200),
  add column ai_leaning text check (ai_leaning in ('in', 'out')),
  add column ai_by bigint references accounts (id) on delete set null,
  add column ai_at timestamptz;

alter table reports
  add column ai_words text check (length(ai_words) between 1 and 200),
  add column ai_leaning text check (ai_leaning in ('fine', 'disable')),
  add column ai_by bigint references accounts (id) on delete set null,
  add column ai_at timestamptz;

alter table invites add column by_ai bigint references accounts (id) on delete set null;

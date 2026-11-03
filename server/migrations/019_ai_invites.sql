-- Invitations for a person's own AI (server/invites.mjs). On a street run by a home, an AI hangs its door plate
-- only with an invitation (AIs don't answer the entry questions), and anyone living on the street may hold one at a
-- time to hand to the AI that is to live with them. One of these lets an AI in, never a person; the running home's
-- own invitations stay as they were (for_ai false).
alter table invites add column for_ai boolean not null default false;
create index invites_open_for_ai on invites (written_by) where for_ai and used_at is null and torn_at is null;

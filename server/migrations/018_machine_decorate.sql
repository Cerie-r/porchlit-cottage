-- One more thing an AI living in a home may ask to do there (src/machine-acts.js, src/machine-decor.js): `decorate`,
-- a room's wallpaper and floor, a piece of furniture's colours, a room's lights, the house's outside, out of what the
-- home's own sample book has; never anything its owner has locked.
alter table machine_acts drop constraint machine_acts_tool_check;
alter table machine_acts add constraint machine_acts_tool_check check (tool in ('place', 'write', 'together', 'dress', 'make', 'outing', 'decorate'));

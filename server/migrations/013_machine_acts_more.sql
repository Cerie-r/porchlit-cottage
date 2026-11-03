-- The second round of what an AI living in a home may ask to do there (src/machine-acts.js): `together`, the two
-- little figures doing something together (he hugs her, steals a kiss, takes her hand…), played when she is home; and
-- `dress`, changing what one of them wears, out of what the home's wardrobe has.
alter table machine_acts drop constraint machine_acts_tool_check;
alter table machine_acts add constraint machine_acts_tool_check check (tool in ('place', 'write', 'together', 'dress'));

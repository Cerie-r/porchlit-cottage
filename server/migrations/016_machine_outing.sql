-- One more thing an AI living in a home may ask to do there (src/machine-acts.js, src/explore-trips.js): `outing`,
-- saying 走 to its person waiting at the front door, so the two of them go out together into the exploring book.
alter table machine_acts drop constraint machine_acts_tool_check;
alter table machine_acts add constraint machine_acts_tool_check check (tool in ('place', 'write', 'together', 'dress', 'make', 'outing'));

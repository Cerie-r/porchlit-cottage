-- One more thing an AI living in a home may ask to do there (src/machine-acts.js, src/machine-make.js): `make`, a
-- bouquet, a dessert or a doll made for its person out of what the home's own benches have.
alter table machine_acts drop constraint machine_acts_tool_check;
alter table machine_acts add constraint machine_acts_tool_check check (tool in ('place', 'write', 'together', 'dress', 'make'));

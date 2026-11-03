-- What each home wears outside (src/house-shells.js), so the street map and a
-- neighbour at the door see it without opening the save: its everyday shell,
-- and a seasonal one worn over it (shown only in its season). Both are kept
-- up to date whenever the home is saved (server/home-saves.mjs); a home saved
-- before this has them filled in from its save the first time its street is
-- looked at (server/streets.mjs). Null shell: not known yet.
-- Should something hold the table for long while this runs (a backup, say),
-- give up and fail the release rather than hold up every request behind it.
set local lock_timeout = '5s';
alter table homes
  add column shell text check (shell ~ '^[A-Za-z]{1,40}$'),
  add column season_shell text check (season_shell ~ '^[A-Za-z]{1,40}$');

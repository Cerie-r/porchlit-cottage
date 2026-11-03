# A home's own things (`src/ours/`)

Some pieces in a home are not décor anyone would pick from a catalog: they are
copies of real things from the people who live there, outfits made for them,
notes written for them, a piece of music. Those live in `src/ours/` and are
**not part of the public release**. Publish from a copy without that folder
(and without the git history that contains it).

## Only that home is sent them

The site everyone gets carries none of it. `vite build` puts the home's own
modules, and the pictures they use, in `dist/ours/` (under hashed names;
`vite.config.js`), and `scripts/check-ours.mjs`, which `npm run build` runs
last, fails the build if any public file carries an id, a name, a note's words
or a picture from `src/ours/`, or needs something in `dist/ours/` to start.

The server sends `dist/ours/` only to the accounts named in `OURS_ACCOUNTS`
(usernames, comma-separated), signed in; to anyone else those files aren't
there (`server/ours.mjs`). Set it where the server runs, before deploying:

```
heroku config:set OURS_ACCOUNTS=your-username
```

With it unset, nobody gets them, not even the home they're for. Name an account
that already has its door plate: a name written there can't be hung through
the door any more. The accounts named there are also the home the place is run
by: they write the invitations a new door plate takes and read the reports.

The page asks for them like this (`src/ours-load.js`): `/api/me` says whether
the account signed in is the home's (`ours`); if it is, the porch light's
session goes along as a cookie that only `/ours/` ever sees (and no other site
can send), and the one module gathering everything (`src/ours/index.js`) is
fetched and taken in (`src/ours-pack.js`). The device remembers that it is the
home's, so next time the house waits for them (a few seconds at most) before
drawing anything. Signed out, nothing comes. A Cloudflare Pages preview has no
server to keep them, so its build leaves them out altogether, as does a copy
without the folder. Under `vite` (development) they are simply there.

## What a module there can export

Every `src/ours/*.js` and `*.jsx` module may export any of:

- `outfits`, `hairs`, `accessories`: the wardrobe's own entries (see
  `body/outfit-registry.js`, `body/hair-registry.js`,
  `body/accessory-registry.js`). Their fit to the body is worked out by
  `scripts/build-outfits.mjs` into `src/ours/outfits-fit.json` (not kept in
  git), which comes with them.
- `toys`: keepsakes on the bed (`src/builtin-toy-state.js`).
- `notes`: notes for the capsule machine (`src/capsule-notes.js`).
- `spots`: a map from a spot name to the pieces hung there:

```js
export const spots = {
  bed: [{ Item: MyPlush, position: [.6, .86, -.46], rotation: [0, -.35, 0], scale: .85 }]
};
```

`<OursAt spot="…"/>` (`src/ours-seam.jsx`) renders them inside the object that
owns the spot, so a piece moves, opens and appears in close-ups together with
it. Until they come, and in every other home, each spot is empty and nothing
else changes. Spots so far: `bed`, `nightstand`, `wardrobeLeftDoor`, `vanity`
(all bedroom). A piece of music registers itself when its module runs.

Ask your own resident to make yours, and add a spot where you need one.

# Hiding points v1

`src/hiding-spots.js` is the shared semantic registry. A point belongs to furniture, never a world coordinate. Moving/recoloring furniture does not rename its point. `public/hiding-spots.v1.json` exports the preset list for future MCP integration; this is metadata, not a live endpoint.

Example future call: `hide_letter({spot_id:"study.bookcase.shelf-2", text:"…"})`.

Implement future `list_hiding_spots` and `hide_letter` using this registry and `placeLetter`. Validate point, content length, capacity and current home ownership on the server. Never silently overwrite occupied points. Bind all requests to authenticated caller/home; the client-side registry is not authorization. Add an idempotency key to prevent duplicate letters on retries. Do not return hidden letter bodies from discovery/catalog tools.

Current transport: browser-local `porchlit-home-layout-v1`. No MCP endpoint and no remote/shared delivery yet. Before enabling tools, provide authenticated shared storage and synchronize the browser. Do not claim a local-only write reaches another user's house.

A letter is a `creations` entry with `kind:"note"`, `note`, `location`, `slot` and stable `spotId`. Read/collect only after the related part is opened. Collection moves the same item to `bag`; it never deletes the letter. Legacy container gifts migrate idempotently; if full they go to the bag. Non-letter state is preserved.

Interaction audit: shelf now reuses Shelf; books move per row; living rug and coffee-table books have entry points; keepsake lid/basket blanket and refrigerator door respond to drag. Fixed ornaments (wall trim, curtain rod, flower petals) are not storage points. Browser pointer/visual QA remains required.

## Planned loot and keys

Hiding is not letter-only. Existing creations already move between backpack and points. Future keys and collectible building parts should enter the same inventory as independently identified item instances, then move by `item_id` + `spot_id`; moving never clones, rerolls or consumes the item. Drawing grants ownership before hide/place/keep is chosen. Furniture-sized prizes are placed in rooms. Add measured size/slot compatibility when actual collectible designs exist; current acceptance metadata is not size enforcement. Key possession and `lock_id` matching must be checked by the future authoritative server. Loot tables, draw rules, lock mechanics and MCP transport remain undesigned/unimplemented.

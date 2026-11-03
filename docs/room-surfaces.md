# Room surfaces v1

Local browser storage only. No connected MCP server or shared home backend is implemented.

`porchlit-surfaces-v1`: `{surfaces:{"bedroomBed.quilt":"rose"},floorLayout:"plank",unlocked:[...]}`. Existing saves are preserved. Four starter fabric patterns are available; no gacha, currency, tasks or special rewards are granted. Future reward grants must be validated by the shared server, not trusted from localStorage.

`surface-state.js` is the validated catalog and mutation boundary. Owner and slot IDs are independent of furniture geometry and coordinates. Read catalog before changing a surface; use `applyPattern` to enforce known owner/slot/pattern and unlocked IDs. Material is separate from motif. Room and closeup share scope and models. Floor layout is separate from the existing oak/walnut/tile finish. Wood pattern is not a fabric pattern.

`porchlit-clock-v1`: `{timeZone:"Australia/Melbourne"}`; validate via `validZone`. Home zone persists when owner travels. Day/night preview is temporary and never changes stored zone. Suggested future MCP operation: `set_home_time_zone({timeZone})`, owner-authorized, writing shared settings, with clients subscribing to changes. Do not advertise this as available before implementing backend and auth.

Audit: legacy bed cover/grid, textile rug, main curtains and sofa fabric parts were fixed to code. These now use scoped pattern materials. Wood/metal colors and other furniture geometry remain independently controlled. Old sofa structural blocks are still the earlier model; this is the bedroom reference implementation, not a claim that all rooms have already been remodeled. Lace remains a separate alpha-tested trim. New bedroom bench and chair use stable hiding slots; table and shelf are decorative closeups, not hidden inventory containers.

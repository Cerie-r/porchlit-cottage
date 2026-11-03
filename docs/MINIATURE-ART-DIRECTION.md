# Porchlit miniature art direction

Reference: the supplied spring tram miniature. Borrow believable scale, layered
silhouettes, quiet surfaces, local detail, and directional daylight. Keep Porchlit's
interactive modular home and original colors. Do not copy its town layout.

Priority: composition and light, then silhouettes, then surface response, then props.
Small bricks must describe structure, not be decorative studs pasted onto blocks.
Recess doors and windows; keep glass, fabric, wood, plaster and metal distinguishable.
Keep the cream palette, with darker timber, gray-green foliage and restrained rose.
Flowers need fine branching, pointed curved leaves and layered petals. Leave gaps.
Mix tones and place organic parts with the model script's seeded rand(), never by
(row + column) % n or another fixed rhythm: those line up into diagonal stripes,
and any evenly spaced row of organic things reads as a pattern. Railings,
dentils and other architecture may repeat; plants, bricks and tiles may not.
Leaves, petals and florets use piece() / floret() (plain, low-poly parts);
keep rounded box() for anything big enough to show its bevel.
Toys need continuous rounded normals, controlled seams and appropriate fabric sheen.
Room and closeup must reuse objects, colors and identifiers. New movable props need
registered IDs. Don't turn decorative mini figures into a social/avatar system.

Day/night follows a saved IANA home time zone, initially the browser zone. Civil
schedule: dawn 06–07, dusk 18–19, smooth interpolation; not astronomical sunrise.
Future authenticated MCP home settings should use this same schema. No real MCP
endpoint exists in this browser-local prototype. UI settings are a local fallback.

Verification: check day/night, all rooms, near/far and back views, mobile framing,
movement and hide interactions. Build/model checks do not constitute visual QA.

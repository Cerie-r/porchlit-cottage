# Accepted bases · 2026-10-20

The user approved both bases: the original female bob and round face, and the adjusted male short hair and round face. Preserve their geometry. The alternate imported female long hairstyle is removed from the picker and loading path; keep its source asset archived.

Clothing is selected as complete outfits, not separate tops and bottoms. First pair: cream long dress with collar, gathered skirt and bound hem; charcoal notched coat, dark high-neck knit and straight trousers, referencing the user's two supplied outfit illustrations. Dress selects the female base, coat selects the male base. No male skirt default.

Facial options: original mouth or small smile, blush on/off, independent hair/eye/brow colours. The /body/ wardrobe opens from the house's top-right portrait. It shares the approved assets with the portrait renderer.

## Body layering correction
Always retain the complete purchased body beneath clothing. Never cut away or hide skin triangles to mask clothing intersections. Fit garments around it. The complete head is lowered until its chin reaches y=1.395, concealing the neck while preserving the underlying connection. Facial features and hair are fitted after this translation.

## Optional head accessories
Female base defaults to an ivory satin side bow; male base defaults to no accessory, with a tilted charcoal beret available. Each base remembers its own selection during the current visit. Accessory colour is separate from hair/eyes/brows. Hiding the head also hides its accessory. Accessories do not modify the accepted hair or face geometry.

## Wardrobe handoff · 2026-10-21
The wardrobe keeps a draft for both residents. Switching residents retains both drafts; returning without “穿好了” discards the visit's edits; undo restores both saved looks and identity assignment. “穿好了” writes `porchlit.wardrobe.v1` before notifying the house. Both the portrait and embedded wardrobe read that saved key before the older house snapshot, including after a standalone wardrobe save. Invalid or unavailable storage falls back to the house snapshot. Phone and portrait-tablet layouts keep the avatar above the independently scrolling choices; wide landscape screens use two columns. Motion and migration are not part of this handoff.

// The little things a home of its own puts about the house (ours-seam.jsx draws them), once its things have come
// (ours-pack.js): {spot: [{Item, position, rotation, scale}]}, positions in the frame of the object the spot is on.
export const spots = {};
export function addSpots(more = {}) {
  for (const [spot, pieces] of Object.entries(more || {})) if (Array.isArray(pieces)) (spots[spot] ??= []).push(...pieces);
}

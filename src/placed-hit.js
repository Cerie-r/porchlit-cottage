// R3F includes deeper intersections even when the invisible walking plane is first.
// Ignore hidden placements (for example an item whose support is not in this room).
export function hitsPlacedObject(intersections = []) {
  return intersections.some(({object}) => {
    let placed = false;
    for (let node = object; node; node = node.parent) {
      if (node.visible === false) return false;
      if (node.userData?.placedObject) placed = true;
    }
    return placed;
  });
}

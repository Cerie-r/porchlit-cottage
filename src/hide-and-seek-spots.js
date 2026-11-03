// Where the hiding spots are. Each spot is worked out from the furniture it
// belongs to, in the walking coordinates of its own area (the frame
// LivingResidents and resident-navigation.js use), so it moves when the
// furniture moves.
import {obstaclesFor, kitchenObstacles, upstairsObstacles, freePoint, standingSpot, WALK_BOUNDS, KITCHEN_BOUNDS, UPSTAIRS_BOUNDS} from './resident-navigation.js';

// three.js turns (x, z) by yaw like this about the vertical axis.
const turn = (yaw, [x, z]) => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
const at = (origin, yaw, local) => {
  const [dx, dz] = turn(yaw, local);
  return [origin[0] + dx, origin[1] + dz];
};
const offset = (furniture, id) => furniture?.[id] || {position: [0, 0, 0], rotationY: 0};
const without = (obstacles, id) => obstacles.filter(o => o.id !== id);

// How each spot sits relative to its piece of furniture.
//  - inside / under: the figure isn't drawn, a hint is; on finding him he
//    steps out at `exit`.
//  - behind: the figure crouches at `figure`, facing the same way as the
//    furniture, so only the top of his head shows over it.
const spots = {
  wardrobe: furniture => {
    const f = offset(furniture, 'bedroomWardrobe');
    const origin = [3.65 + f.position[0], -3.1 + f.position[2]], yaw = f.rotationY || 0;
    return {area: 'bedroom', kind: 'inside', origin, yaw, exit: at(origin, yaw, [0, .95]), obstacles: upstairsObstacles(furniture, 'bedroom'), bounds: UPSTAIRS_BOUNDS};
  },
  quilt: furniture => {
    const f = offset(furniture, 'bedroomBed');
    // The bed is drawn turned a quarter, foot towards the room.
    const origin = [-3.15 + f.position[0], -.9 + f.position[2]], yaw = (f.rotationY || 0) + Math.PI / 2;
    return {area: 'bedroom', kind: 'under', origin, yaw, exit: at(origin, yaw, [-1.75, 1.05]), obstacles: upstairsObstacles(furniture, 'bedroom'), bounds: UPSTAIRS_BOUNDS};
  },
  armchair: furniture => {
    const f = furniture?.armchair;
    if (!f) return null;
    const origin = [f.position[0], f.position[2]], yaw = f.rotationY || 0, figure = at(origin, yaw, [0, -.72]);
    return {area: 'living', kind: 'behind', origin, yaw, figure: {x: figure[0], z: figure[1], yaw, crouch: 1}, exit: figure, obstacles: obstaclesFor(furniture), bounds: WALK_BOUNDS, own: 'armchair'};
  },
  island: furniture => {
    const f = furniture?.island;
    if (!f) return null;
    const origin = [f.position[0], f.position[2]], yaw = f.rotationY || 0, figure = at(origin, yaw, [-.42, -.74]);
    return {area: 'kitchen', kind: 'behind', origin, yaw, figure: {x: figure[0], z: figure[1], yaw, crouch: 1}, exit: figure, obstacles: kitchenObstacles(furniture), bounds: KITCHEN_BOUNDS, own: 'island'};
  }
};

// The spot `id` for this furniture, or null when it can't be used today (a
// crouching spot with no room behind its furniture).
export function spotPlacement(id, furniture) {
  const spot = spots[id]?.(furniture);
  if (!spot) return null;
  const {obstacles, bounds, own, ...placement} = spot;
  if (placement.figure && !freePoint([placement.figure.x, placement.figure.z], without(obstacles, own), bounds)) return null;
  const exit = standingSpot(placement.exit, obstacles, bounds);
  if (!exit) return null;
  return {id, ...placement, exit};
}

export const availableSpots = furniture => Object.keys(spots).filter(id => spotPlacement(id, furniture));

// The living room and the kitchen also show together, in the downstairs
// overview, whose walking frame is the room's own.
const shifts = {living: [-1, 1.6], kitchen: [1.05, -1]};

// The placement as seen from the area on screen, or null when it isn't there.
export function placementIn(placement, area) {
  if (!placement) return null;
  if (placement.area === area) return placement;
  if (area !== 'downstairs' || !shifts[placement.area]) return null;
  const [dx, dz] = shifts[placement.area], move = ([x, z]) => [x + dx, z + dz];
  return {
    ...placement,
    origin: move(placement.origin),
    exit: move(placement.exit),
    ...(placement.figure ? {figure: {...placement.figure, x: placement.figure.x + dx, z: placement.figure.z + dz}} : {})
  };
}

// While he hides at a spot, opening its furniture finds him, instead of the
// furniture's close-up or seat menu: these are those requests.
export const spotOpeners = {
  wardrobe: ['hide:bedroomWardrobe'],
  quilt: ['hide:bedroomBed', 'seat:bedroomBed'],
  armchair: ['hide:armchair', 'seat:armchair'],
  island: ['island', 'hide:island']
};

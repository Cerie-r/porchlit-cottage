// The outsides a home can wear. Each is one brick-built model (made by a
// script in scripts/) plus where its door, gift step and porch lanterns are.
// Inside, every shell opens onto the same rooms.
//
// door / doorHitbox: the box that takes a click on the front door.
// giftAt: where a ribbon box waits on the steps.
// lanterns: the two porch lanterns (their glow and the click that opens the porch light card).
// doorLight: the warm light while the pointer rests on the door.
// unlock: the puzzle (src/puzzle-folder.js) that opens this shell, 'roses' for the ninety-nine kisses
//   (src/roses.js), or null for one every home has.
// season: for a shell worn only in a season (see `seasons`): every home may
//   wear it then, over its everyday shell, and it comes off by itself after.
// frame: how far the model reaches down and up the screen, in model units, as
//   the camera sees it outside (from the front corner, see outsideView), however
//   far round it has been turned; measured from the built model, so a new or
//   rebuilt shell is measured again.
// spots: places kept outside for little things (a wreath at Christmas, a
//   garland, lights, a small tree). Nothing is drawn there until something is
//   put there. Each has an id and a kind:
//     hang   on a wall or a door, facing out (`facing`, radians from +z towards +x)
//     stand  on something flat: a sill, a step, the lawn
//     top    on a point: a finial, a post
//     line   along a run, from `from` to `to`: a railing, a parapet, an eave
//   and `size`, how big a thing there may be.

import {roseCastleOpen} from './roses.js';

export const DEFAULT_SHELL = 'gabledCottage';

export const houseShells = {
  gabledCottage: {
    label: '紫藤街屋',
    modelUrl: '/models/porchlit-house.glb',
    scale: 1,
    door: [0, 1.12, 2.36],
    doorHitbox: [1.45, 2.55, .72],
    // A ribbon box left for this home sits on the second step, left of the door.
    giftAt: [-.55, .21, 2.8],
    lanterns: [[-1.04, 1.82, 2.49], [1.04, 1.82, 2.49]],
    doorLight: [0, 1.9, 3],
    unlock: null,
    frame: [-4.27, 7.08],
    spots: [
      {id: 'door', kind: 'hang', at: [0, 1.45, 2.45], facing: 0, size: .36},
      {id: 'lanternLeft', kind: 'hang', at: [-1.04, 2.2, 2.52], facing: 0, size: .14},
      {id: 'lanternRight', kind: 'hang', at: [1.04, 2.2, 2.52], facing: 0, size: .14},
      {id: 'balcony', kind: 'line', from: [-.9, 3.6, 2.78], to: [.9, 3.6, 2.78], size: .1},
      {id: 'eave', kind: 'line', from: [-3.2, 4.45, 2.34], to: [3.2, 4.45, 2.34], size: .1},
      {id: 'sillLeftLow', kind: 'stand', at: [-1.86, .8, 2.88], size: .16},
      {id: 'sillLeftHigh', kind: 'stand', at: [-1.86, 2.98, 2.88], size: .16},
      {id: 'crown', kind: 'top', at: [0, 6.92, 0], size: .3},
      {id: 'chimney', kind: 'top', at: [2.05, 6.52, -1.12], size: .24},
      {id: 'yard', kind: 'stand', at: [4.1, -.19, 2.45], size: .7},
      {id: 'gatePostLeft', kind: 'top', at: [-.98, 1.08, 4.04], size: .16},
      {id: 'gatePostRight', kind: 'top', at: [.98, 1.08, 4.04], size: .16}
    ]
  },
  castle: {
    label: '城堡',
    modelUrl: '/models/porchlit-castle.glb',
    scale: 1,
    door: [0, 1.12, 2.36],
    doorHitbox: [1.3, 2.4, .7],
    // On the top step below the landing, left of the door.
    giftAt: [-.55, .16, 2.71],
    lanterns: [[-.88, 1.62, 2.46], [.88, 1.62, 2.46]],
    doorLight: [0, 1.9, 3.1],
    unlock: 'castle-key',
    frame: [-4.27, 8.2],
    spots: [
      {id: 'door', kind: 'hang', at: [0, 1.34, 2.36], facing: 0, size: .36},
      {id: 'lanternLeft', kind: 'hang', at: [-.88, 1.98, 2.5], facing: 0, size: .14},
      {id: 'lanternRight', kind: 'hang', at: [.88, 1.98, 2.5], facing: 0, size: .14},
      {id: 'arch', kind: 'hang', at: [0, 2.34, 4.05], facing: 0, size: .22},
      {id: 'balcony', kind: 'line', from: [-.72, 3.47, 2.75], to: [.72, 3.47, 2.75], size: .1},
      {id: 'battlements', kind: 'line', from: [-1, 5.28, 2.3], to: [1, 5.28, 2.3], size: .1},
      {id: 'parapetRight', kind: 'line', from: [2.62, 4.88, -1.75], to: [2.62, 4.88, .85], size: .1},
      {id: 'sillTowerLeft', kind: 'stand', at: [-2.5, 2.9, 2.39], size: .14},
      {id: 'sillTowerRight', kind: 'stand', at: [2.83, 2.9, 2.32], size: .14},
      {id: 'sillRightLow', kind: 'stand', at: [2.81, .76, -.45], size: .16},
      {id: 'sillRightHigh', kind: 'stand', at: [2.81, 2.81, -.45], size: .16},
      {id: 'towerLeft', kind: 'top', at: [-2.5, 7.08, 1.55], size: .3},
      {id: 'towerRight', kind: 'top', at: [2.5, 7.08, 1.55], size: .3},
      {id: 'towerBack', kind: 'top', at: [-1.25, 7.28, -1.75], size: .3},
      {id: 'fountain', kind: 'top', at: [3.7, .56, 2.8], size: .16},
      {id: 'yard', kind: 'stand', at: [-3.95, -.19, 2.75], size: .7},
      {id: 'gatePostLeft', kind: 'top', at: [-.98, 1.08, 4.04], size: .16},
      {id: 'gatePostRight', kind: 'top', at: [.98, 1.08, 4.04], size: .16}
    ]
  },
  // The same plan as the castle (scripts/build-castle-model.mjs rose): taller, slimmer towers under pink
  // spires, roses where the castle has wisteria, and a garden of roses. Its door, steps and lamps are the
  // castle's; the tower tops are higher, and its lawn is all roses, so the yard spot is on the stones.
  roseCastle: {
    label: '玫瑰城堡',
    modelUrl: '/models/porchlit-castle-rose.glb',
    scale: 1,
    door: [0, 1.12, 2.36],
    doorHitbox: [1.3, 2.4, .7],
    giftAt: [-.55, .16, 2.71],
    lanterns: [[-.88, 1.62, 2.46], [.88, 1.62, 2.46]],
    doorLight: [0, 1.9, 3.1],
    unlock: 'roses',
    frame: [-4.27, 8.72],
    spots: [
      {id: 'door', kind: 'hang', at: [0, 1.34, 2.36], facing: 0, size: .36},
      {id: 'lanternLeft', kind: 'hang', at: [-.88, 1.98, 2.5], facing: 0, size: .14},
      {id: 'lanternRight', kind: 'hang', at: [.88, 1.98, 2.5], facing: 0, size: .14},
      {id: 'arch', kind: 'hang', at: [0, 2.34, 4.05], facing: 0, size: .22},
      {id: 'balcony', kind: 'line', from: [-.72, 3.47, 2.75], to: [.72, 3.47, 2.75], size: .1},
      {id: 'battlements', kind: 'line', from: [-1, 5.28, 2.3], to: [1, 5.28, 2.3], size: .1},
      {id: 'parapetRight', kind: 'line', from: [2.62, 4.88, -1.75], to: [2.62, 4.88, .85], size: .1},
      {id: 'sillTowerLeft', kind: 'stand', at: [-2.5, 2.9, 2.31], size: .14},
      {id: 'sillTowerRight', kind: 'stand', at: [2.75, 2.9, 2.24], size: .14},
      {id: 'sillRightLow', kind: 'stand', at: [2.81, .76, -.45], size: .16},
      {id: 'sillRightHigh', kind: 'stand', at: [2.81, 2.81, -.45], size: .16},
      {id: 'towerLeft', kind: 'top', at: [-2.5, 7.68, 1.55], size: .3},
      {id: 'towerRight', kind: 'top', at: [2.5, 7.68, 1.55], size: .3},
      {id: 'towerBack', kind: 'top', at: [-1.25, 7.93, -1.75], size: .3},
      {id: 'fountain', kind: 'top', at: [3.7, .56, 2.8], size: .16},
      {id: 'yard', kind: 'stand', at: [2.45, -.19, 3.05], size: .7},
      {id: 'gatePostLeft', kind: 'top', at: [-.98, 1.08, 4.04], size: .16},
      {id: 'gatePostRight', kind: 'top', at: [.98, 1.08, 4.04], size: .16}
    ]
  },
  haunted: {
    label: '万圣节鬼屋',
    modelUrl: '/models/porchlit-haunted.glb',
    scale: 1,
    // The door is under the porch, back against the wall.
    door: [0, 1.1, 1.62],
    doorHitbox: [1, 1.75, .5],
    // On the top step, left of the middle.
    giftAt: [-.3, .15, 2.55],
    // The two carved pumpkins hanging from the porch roof.
    lanterns: [[-1, 1.52, 1.85], [1, 1.52, 1.85]],
    doorLight: [0, 1.5, 2.1],
    unlock: null,
    season: 'halloween',
    frame: [-4.27, 8.04],
    spots: [
      {id: 'door', kind: 'hang', at: [0, 1.55, 1.64], facing: 0, size: .3},
      {id: 'lanternLeft', kind: 'hang', at: [-1, 1.86, 1.85], facing: 0, size: .12},
      {id: 'lanternRight', kind: 'hang', at: [1, 1.86, 1.85], facing: 0, size: .12},
      {id: 'porchBeam', kind: 'line', from: [-1.25, 2.12, 2.32], to: [1.25, 2.12, 2.32], size: .1},
      {id: 'railLeft', kind: 'line', from: [-1.2, .77, 2.32], to: [-.55, .77, 2.32], size: .1},
      {id: 'railRight', kind: 'line', from: [.55, .77, 2.32], to: [1.2, .77, 2.32], size: .1},
      {id: 'cresting', kind: 'line', from: [-1.45, 5.32, .95], to: [1.45, 5.32, .95], size: .1},
      {id: 'turretTip', kind: 'top', at: [-3.2, 6.8, 1.84], size: .2},
      {id: 'sillRightLow', kind: 'stand', at: [2.31, .37, .55], size: .16},
      {id: 'yard', kind: 'stand', at: [3.6, -.19, .6], size: .7},
      {id: 'gatePostLeft', kind: 'top', at: [-.98, 1.08, 4.04], size: .16},
      {id: 'gatePostRight', kind: 'top', at: [.98, 1.08, 4.04], size: .16}
    ]
  }
};

// The seasons a shell can be worn in: from and to as month-day in the home's
// own time zone, both days included (the same days as the plaza's seasonal
// capsule jar, src/capsules.js).
export const seasons = {
  halloween: {label: '万圣节', from: '10-15', to: '11-07'}
};
const dayPattern = /^\d{4}-(\d{2}-\d{2})$/;
// Whether `day` (YYYY-MM-DD) falls in the season; a season may run over the new year.
export function inSeason(key, day) {
  const season = Object.hasOwn(seasons, key) ? seasons[key] : null, md = dayPattern.exec(day || '')?.[1];
  if (!season || !md) return false;
  return season.from <= season.to ? md >= season.from && md <= season.to : md >= season.from || md <= season.to;
}

const shellNamed = key => typeof key === 'string' && Object.hasOwn(houseShells, key) ? houseShells[key] : null;
// How the camera stands outside for a shell, on a canvas `width` by `height` with the house drawn at `scale` (its
// size at rest: a pinch or the wheel zooms on from there): as near as `zoom` (pixels a unit) and looking at the
// ground, if the whole house shows so between `top` and `bottom` pixels kept free, turned whichever way round;
// otherwise a little further back and looking higher (`lift`), its top `top` pixels down. A window too short to
// show it all keeps the plain view.
const UP = .8704; // how much of a step up shows as a step up the screen, from the camera's corner
export function outsideView(key, {width, height, zoom, scale = 1, top = 24, bottom = 64}) {
  const shell = shellNamed(key), [lo, hi] = (shell?.frame || [0, 0]).map(v => v * scale * (shell?.scale || 1));
  const fits = (z, c) => height / 2 - (hi - c) * z >= top && height / 2 - (lo - c) * z <= height - bottom;
  if (!(hi > lo) || height - top - bottom < 160 || fits(zoom, 0)) return {zoom, lift: 0};
  const z = Math.min(zoom, (height - top - bottom) / (hi - lo));
  return {zoom: z, lift: Math.max(0, (hi - (height / 2 - top) / z) / UP)};
}

// A shell's name when it is one there is (and, for a seasonal one, when it
// is its season on `day`), the cottage otherwise. A neighbour's outside comes
// through here, with today, so a seasonal one never shows out of its season.
export const knownShell = (key, day) => {const shell = shellNamed(key); return shell && (!shell.season || inSeason(shell.season, day)) ? key : DEFAULT_SHELL;};
// What a saved home wears over its everyday shell in season: a seasonal shell's name, or null.
export const knownSeasonShell = key => shellNamed(key)?.season ? key : null;

// Whether a home may wear this shell on `day`: a seasonal one in its season;
// one with no puzzle always; the rose castle once the ninety-nine kisses are
// there; one with a puzzle once that folder has been opened.
export function shellOpen(home, key, day) {
  const shell = shellNamed(key);
  if (!shell) return false;
  if (shell.season) return inSeason(shell.season, day);
  if (shell.unlock === 'roses') return roseCastleOpen(home);
  return !shell.unlock || !!home?.computer?.solved?.[shell.unlock];
}

// The shell a home is wearing on `day`: a seasonal one it put on, while that
// season lasts; otherwise its everyday choice when that is known and open to
// it; the cottage if not.
export function shellOf(home, day) {
  const seasonal = knownSeasonShell(home?.seasonShell);
  if (seasonal && shellOpen(home, seasonal, day)) return seasonal;
  const key = typeof home?.shell === 'string' && shellNamed(home.shell) ? home.shell : DEFAULT_SHELL;
  return shellOpen(home, key, day) ? key : DEFAULT_SHELL;
}

// What a home shows outside, as the street keeps it (server/streets.mjs): the
// everyday shell it wears (open to it whatever the day) and the seasonal one
// it put on over it, if any; and, from those, the one to draw on `day`.
export function wornShells(home) {
  const key = typeof home?.shell === 'string' && shellNamed(home.shell) && !houseShells[home.shell].season ? home.shell : DEFAULT_SHELL;
  return {shell: shellOpen(home, key, null) ? key : DEFAULT_SHELL, season: knownSeasonShell(home?.seasonShell)};
}
export const shownShell = ({shell, season}, day) => (season && inSeason(houseShells[season]?.season, day) ? season : knownShell(shell, day));

// The shells to offer: only the open ones.
export const openShells = (home, day) => Object.keys(houseShells).filter(key => shellOpen(home, key, day));

// The home once `key` is chosen on `day`: a seasonal shell goes on over the
// everyday one (and comes off by itself when its season ends); an everyday
// one is worn as it is, and takes a seasonal one off. Unchanged if `key` is
// not open to it.
export function wearShell(home, key, day) {
  if (!shellOpen(home, key, day)) return home;
  return houseShells[key].season ? {...home, seasonShell: key} : {...home, shell: key, seasonShell: null};
}

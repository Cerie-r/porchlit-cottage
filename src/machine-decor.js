// Doing up the home (the decorate tool an AI living here may use; src/machine-acts.js lets each act in): a room's
// wallpaper and floor, a piece of furniture's colours (its paint, its top, its trim), a room's lights, the house's
// outside. Only out of what the home's own sample book offers (src/decor-state.js), the lights' own modes
// (src/light-state.js), and the outsides open to this home on the day (src/house-shells.js); and never anything she
// has locked in the sample book. The decoration and the lights are kept apart from the house itself (each its own
// entry in the save): what an act changes in them comes back beside the home, for her page to keep (src/main.jsx).
import {details, floorSamples, materialOwners, keyFor, paints, roomNames, tops, wallpapers} from './decor-state.js';
import {changeLight, lightModes, lightState} from './light-state.js';
import {DEFAULT_SHELL, houseShells, openShells, shellOf, shellOpen, wearShell} from './house-shells.js';
import {PIECE_NAMES} from './machine-piece-names.js';

export const DECORATE = ['room', 'paint', 'light', 'shell'];
export const DECOR_ROOMS = Object.keys(roomNames);
const named = list => Object.fromEntries(list.map(([id, label, color]) => [id, {label, color}]));
export const WALLS = named(wallpapers), FLOORS = named(floorSamples);
export const COLOURS = {paint: named(paints), top: named(tops), detail: named(details)};
export const PART_NAMES = {paint: '主色', top: '台面', detail: '细节'};
export const MODES = Object.fromEntries(Object.entries(lightModes).map(([id, m]) => [id, m.label]));
const PARTS = Object.keys(COLOURS);

// What the house calls each piece whose colours can change; the ones the AI isn't told the name of elsewhere too.
const MORE_NAMES = {upperLeft: '左吊柜', upperRight: '右吊柜', bedroomShelf: '卧室层架', ...Object.fromEntries(Array.from({length: 7}, (_, i) => ['studyBox' + i, `书房收纳盒 ${i + 1}`]))};
export const decorPieceName = id => PIECE_NAMES[id] || MORE_NAMES[id] || id;
// The pieces whose colours may change, each with the parts it has: {id, parts}.
export const paintable = () => Object.entries(materialOwners)
  .filter(([id, m]) => !id.startsWith('room:') && m.parts.some(p => PARTS.includes(p)))
  .map(([id, m]) => ({id, parts: m.parts.filter(p => PARTS.includes(p))}));

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const has = (catalog, key) => typeof key === 'string' && Object.hasOwn(catalog, key);
const list = catalog => Object.entries(catalog).map(([id, v]) => `${id}（${v.label}）`).join('、');
const given = v => v !== undefined && v !== null;

// An act's arguments, shaped: {args} or {problem}.
export function decorArgs(action, a) {
  const roomProblem = `room 填 ${DECOR_ROOMS.map(r => `${r}（${roomNames[r]}）`).join('、')}。`;
  if (action === 'room') {
    if (!DECOR_ROOMS.includes(a.room)) return {problem: roomProblem};
    const out = {room: a.room};
    if (given(a.wall)) {
      if (!has(WALLS, a.wall)) return {problem: `wall 填一种墙纸：${list(WALLS)}。`};
      out.wall = a.wall;
    }
    if (given(a.floor)) {
      if (!has(FLOORS, a.floor)) return {problem: `floor 填一种地板：${list(FLOORS)}。`};
      out.floor = a.floor;
    }
    if (!out.wall && !out.floor) return {problem: '换墙纸（wall）还是地板（floor）？至少填一样。'};
    return {args: out};
  }
  if (action === 'paint') {
    const piece = paintable().find(p => p.id === a.piece);
    if (!piece) return {problem: 'piece 填一件能换颜色的家具的编号（look 的 decor 里有）。'};
    const out = {piece: piece.id};
    for (const part of PARTS) {
      if (!given(a[part])) continue;
      if (!piece.parts.includes(part)) return {problem: `${decorPieceName(piece.id)}没有${PART_NAMES[part]}可换，它能换的是：${piece.parts.map(p => `${p}（${PART_NAMES[p]}）`).join('、')}。`};
      if (!has(COLOURS[part], a[part])) return {problem: `${part} 填一种颜色：${list(COLOURS[part])}。`};
      out[part] = a[part];
    }
    if (Object.keys(out).length === 1) return {problem: `换哪儿：${piece.parts.map(p => `${p}（${PART_NAMES[p]}）`).join('、')}，至少填一样。`};
    return {args: out};
  }
  if (action === 'light') {
    if (!DECOR_ROOMS.includes(a.room)) return {problem: roomProblem};
    if (!has(lightModes, a.mode)) return {problem: `mode 填 ${Object.entries(MODES).map(([id, l]) => `${id}（${l}）`).join('、')}。`};
    return {args: {room: a.room, mode: a.mode}};
  }
  if (action === 'shell') {
    if (!has(houseShells, a.shell)) return {problem: `shell 填一种外观：${Object.entries(houseShells).map(([id, s]) => `${id}（${s.label}）`).join('、')}。`};
    return {args: {shell: a.shell}};
  }
  return {problem: `做哪件事：${DECORATE.join('、')}。`};
}

// One act in a line, for the AI (what it asked for) and, said as done, for the card and the diary.
export function decorLine(action, a, done = false) {
  const changed = done ? '换成了' : '换成';
  if (action === 'room') return `把${roomNames[a.room] || '一间屋'}${changed}${[a.wall && `${WALLS[a.wall]?.label}墙纸`, a.floor && `${FLOORS[a.floor]?.label}地板`].filter(Boolean).join('、')}`;
  if (action === 'paint') return `给${decorPieceName(a.piece)}${done ? '换上了' : '换上'}${PARTS.filter(p => a[p]).map(p => `${COLOURS[p][a[p]]?.label}的${PART_NAMES[p]}`).join('、')}`;
  if (action === 'light') return `把${roomNames[a.room] || '一间屋'}的灯调${done ? '成了' : '成'}「${MODES[a.mode]}」`;
  if (action === 'shell') return `把房子的外观${changed}${houseShells[a.shell]?.label || a.shell}`;
  return '布置';
}

// The decoration as kept ({values, locks}), and the lights ({room: …}): read leniently.
export const decorOf = raw => ({values: plain(raw?.values) ? raw.values : {}, locks: plain(raw?.locks) ? raw.locks : {}});
export const lightsOf = raw => (plain(raw) ? raw : {});

// Lets one act in. ctx: {decor, lights, day}. Returns {ok: true, home?, decor?, lights?, what, said} or {ok: false, why}.
export function applyDecor(home, action, args, ctx) {
  const decor = decorOf(ctx.decor), done = decorLine(action, args, true);
  const set = (owner, part, value) => ({...decor, values: {...decor.values, [keyFor(owner, part)]: value}});
  const locked = (owner, part) => !!decor.locks[keyFor(owner, part)];
  if (action === 'room') {
    const owner = 'room:' + args.room, parts = ['wall', 'floor'].filter(p => args[p]);
    const shut = parts.filter(p => locked(owner, p));
    if (shut.length) return {ok: false, why: `${roomNames[args.room]}的${shut.map(p => (p === 'wall' ? '墙纸' : '地板')).join('和')}${ctx.her || '她'}锁住了，没换。`};
    let next = decor;
    if (args.wall) next = {...next, values: {...next.values, [keyFor(owner, 'wall')]: args.wall}};
    if (args.floor) next = {...next, values: {...next.values, [keyFor(owner, 'floor')]: args.floor}};
    if (parts.every(p => decor.values[keyFor(owner, p)] === args[p])) return {ok: false, why: `${roomNames[args.room]}已经是这样了。`};
    return {ok: true, decor: next, what: done, said: `${done}。`};
  }
  if (action === 'paint') {
    const parts = PARTS.filter(p => args[p]);
    const shut = parts.filter(p => locked(args.piece, p));
    if (shut.length) return {ok: false, why: `${decorPieceName(args.piece)}的${shut.map(p => PART_NAMES[p]).join('和')}${ctx.her || '她'}锁住了，没换。`};
    let next = decor;
    for (const p of parts) next = {...next, values: {...next.values, [keyFor(args.piece, p)]: COLOURS[p][args[p]].color}};
    if (parts.every(p => decor.values[keyFor(args.piece, p)] === COLOURS[p][args[p]].color)) return {ok: false, why: `${decorPieceName(args.piece)}已经是这个颜色了。`};
    return {ok: true, decor: next, what: done, said: `${done}。`};
  }
  if (action === 'light') {
    const lights = lightsOf(ctx.lights), now = lightState(lights[args.room]);
    if (now.mode === args.mode) return {ok: false, why: `${roomNames[args.room]}的灯已经是「${MODES[args.mode]}」了。`};
    return {ok: true, lights: {...lights, [args.room]: changeLight(lights[args.room], {mode: args.mode}, args.room)}, what: done, said: `${done}。`};
  }
  if (action === 'shell') {
    if (!shellOpen(home, args.shell, ctx.day)) return {ok: false, why: `${houseShells[args.shell].label}这个家现在还换不了${houseShells[args.shell].season ? '（不在它的日子）' : '（还没解开）'}。`};
    if (shellOf(home, ctx.day) === args.shell) return {ok: false, why: `房子已经是${houseShells[args.shell].label}了。`};
    return {ok: true, home: wearShell(home, args.shell, ctx.day), what: done, said: `${done}。`};
  }
  return {ok: false, why: '这件布置读不懂。'};
}

// The home as it looks now, and what may be changed, for the AI (look's decor): lines.
export function decorLook(home, decorRaw, lightsRaw, {day, her = '她'} = {}) {
  const decor = decorOf(decorRaw), lights = lightsOf(lightsRaw), lines = [];
  const nameOf = (catalog, value) => Object.entries(catalog).find(([id, v]) => id === value || v.color === value)?.[1]?.label || value;
  const lock = (owner, part) => (decor.locks[keyFor(owner, part)] ? `（${her}锁住了）` : '');
  const shell = shellOf(home, day), open = openShells(home, day);
  lines.push(`外观：现在是 ${houseShells[shell]?.label || houseShells[DEFAULT_SHELL].label}（${shell}）。能换：${open.map(id => `${id}（${houseShells[id].label}）`).join('、')}。`);
  lines.push('每间屋（墙纸、地板、灯）：');
  for (const room of DECOR_ROOMS) {
    const v = k => decor.values[keyFor('room:' + room, k)];
    lines.push(`  · ${room}（${roomNames[room]}）：墙纸 ${v('wall') ? nameOf(WALLS, v('wall')) : '原来的'}${lock('room:' + room, 'wall')}，地板 ${v('floor') ? nameOf(FLOORS, v('floor')) : '原来的'}${lock('room:' + room, 'floor')}，灯「${MODES[lightState(lights[room]).mode] || '自己调过的'}」`);
  }
  lines.push('家具的颜色（没写的是原来的）：');
  for (const p of paintable()) {
    const set = p.parts.filter(part => decor.values[keyFor(p.id, part)]).map(part => `${PART_NAMES[part]} ${nameOf(COLOURS[part], decor.values[keyFor(p.id, part)])}${lock(p.id, part)}`);
    lines.push(`  · ${decorPieceName(p.id)}（${p.id}）：能换 ${p.parts.join('、')}${set.length ? `；现在 ${set.join('，')}` : ''}`);
  }
  lines.push(`墙纸（wall）：${list(WALLS)}。`);
  lines.push(`地板（floor）：${list(FLOORS)}。`);
  for (const part of PARTS) lines.push(`${PART_NAMES[part]}（${part}）：${list(COLOURS[part])}。`);
  lines.push(`灯（mode）：${Object.entries(MODES).map(([id, l]) => `${id}（${l}）`).join('、')}。`);
  return lines;
}

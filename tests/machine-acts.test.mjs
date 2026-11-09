import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIDEABLE, LIMITS, SPOTS, actArgs, actLine, answerOf, applyActs, askHint, cleanMachine, findThing, foundNow, hiddenThings, hintLevels,
  callAs, calledName, machineDiary, markHiddenFound, markSeen, pieceAt, prepareAct, rooms, spotOf, tableTaken, unseen, whoHid,
  SCENES, pendingScenes, playScene, sceneNow, lapseScenes, cleanCloset, markStash, unstash, stashed, stashedThings, stashHints, seekSees, seekableAt
} from '../src/machine-acts.js';
import {cleanHideSeek, hidingOn, markFound} from '../src/hide-and-seek.js';
import {diaryDays} from '../src/diary-days.js';
import {floorPieces} from '../src/furniture-range.js';
import {COLORS, benchOf, dishMishaps, seeded} from '../src/machine-make.js';
import {validDessert, makerLabel, tagNote} from '../src/dessert-recipe.js';
import {dishRecipe, validDish} from '../src/cooking-recipe.js';
import {domeItem, finishMeal} from '../src/dessert-state.js';
import {albumOf} from '../src/album.js';
import {rememberAlbum} from '../src/album-memory.js';
import {shiftItem} from '../src/workshop-state.js';
import {readFileSync} from 'node:fs';

// The living room as the house comes (tests/furniture-range.test.mjs keeps the same numbers), and every other piece
// at its own spot.
const DEFAULTS = Object.fromEntries(Object.keys(floorPieces).map(id => [id, {position: [0, 0, 0], rotationY: 0}]));
Object.assign(DEFAULTS, {
  rug: {position: [-2.15, .015, -.48], rotationY: 0}, sofa: {position: [-.62, .43, -.45], rotationY: -Math.PI / 2},
  coffeeTable: {position: [-2.4, .34, -.48], rotationY: Math.PI / 2}, armchair: {position: [-2.28, .38, -2.16], rotationY: .62},
  tvUnit: {position: [-3.88, .34, -.55], rotationY: Math.PI / 2}, lamp: {position: [-3.35, 0, -3.6], rotationY: -Math.PI / 4},
  floorPlant: {position: [-3.62, .03, -2.48], rotationY: -.18}, gramophone: {position: [-3.7, 0, 1.3], rotationY: 1.2},
  sinkRun: {position: [.9, 0, -2.43], rotationY: 0}, stove: {position: [2.77, 0, -.78], rotationY: 0}, cornerCabinet: {position: [2.77, 0, -1.6], rotationY: 0},
  prepCabinet: {position: [2.77, 0, .04], rotationY: 0}, refrigerator: {position: [3.24, 0, .78], rotationY: 0}, island: {position: [.8, 0, .18], rotationY: 0},
  stoolLeft: {position: [.25, 0, 1.05], rotationY: 0}, stoolRight: {position: [1.14, 0, 1.05], rotationY: 0},
  diningTable: {position: [-.9, 0, -2.05], rotationY: 0}, diningChair1: {position: [-1.78, 0, -2.05], rotationY: Math.PI / 2},
  diningChair2: {position: [-.02, 0, -2.05], rotationY: -Math.PI / 2}, diningChair3: {position: [-.9, 0, -1.24], rotationY: 0}
});
const DAY = '2026-10-26';
const BIRCH = {id: '34', name: 'Birch', nickname: '小桦'};
const ctx = (more = {}) => ({day: DAY, now: 1, defaults: DEFAULTS, available: ['wardrobe', 'quilt', 'armchair', 'island'], ...more});
const home = (more = {}) => ({
  furniture: structuredClone(DEFAULTS),
  creations: [
    {id: 'a1b2c3d4-0000-4000-8000-000000000001', kind: 'animal', species: 'lion', name: '小狮子', location: 'bag', slot: 0},
    {id: 'a1b2c3d4-0000-4000-8000-000000000002', kind: 'bouquet', name: '一束花', location: 'bag', slot: 0},
    {id: 'f00dcafe-0000-4000-8000-000000000003', kind: 'dessert', name: '泡芙', location: 'room', floor: '1F', position: [0, 1, 0]},
    {id: 'beefbeef-0000-4000-8000-000000000004', kind: 'note', name: '一封信', note: '旧信', location: 'bag', slot: 0}
  ],
  computer: {notes: []},
  hideSeek: {seed: null, book: [], total: 0},
  ...more
});
let next = 1;
const act = (tool, action, args, by = BIRCH) => ({id: String(next++), key: crypto.randomUUID(), tool, action, args, by});
const one = (h, a, c = ctx()) => {
  const r = applyActs(h, [a], c);
  return {home: r.home, entry: r.entries[0]};
};

test('the shape of an act: only what each one takes, and nothing odd', () => {
  assert.deepEqual(actArgs('place', 'move', {piece: 'sofa', x: 3.004, z: 2, turn: 90, note: ' 靠窗看书 ', extra: 1}).args, {piece: 'sofa', x: 3, z: 2, turn: 90, note: '靠窗看书'});
  assert.deepEqual(actArgs('place', 'move', {piece: 'sofa', turn: -45}).args, {piece: 'sofa', turn: -45});
  for (const bad of [{piece: 'sofa'}, {piece: 'nope', turn: 90}, {piece: 'sofa', x: 3}, {piece: 'sofa', x: 99, z: 1}, {piece: 'sofa', x: -1, z: 1}, {piece: 'sofa', turn: 30}, {piece: 'sofa', turn: 360}, {piece: 'sofa', turn: '90'}, {piece: 'sofa', turn: 0}, {piece: 'sofa', turn: 90, note: '很'.repeat(61)}]) {
    assert.ok(actArgs('place', 'move', bad).problem, JSON.stringify(bad));
  }
  // The living room is narrower than the rest of the floor.
  assert.ok(actArgs('place', 'move', {piece: 'sofa', x: 8, z: 1}).problem);
  assert.ok(actArgs('place', 'move', {piece: 'island', x: 8, z: 1}).args);
  assert.deepEqual(actArgs('place', 'hide', {thing: 'a1b2c3', spot: 'bedroom.nightstand.slot-2', hints: ['睡前最后拉开的那只']}).args, {thing: 'a1b2c3', spot: 'bedroom.nightstand.slot-2', hints: ['睡前最后拉开的那只']});
  assert.deepEqual(actArgs('place', 'hide', {thing: 'a1b2c3', spot: 'bedroom.nightstand.slot-2', hints: '一句也行'}).args.hints, ['一句也行']);
  for (const bad of [{thing: 'a1b2', spot: 'bedroom.nightstand.slot-2'}, {thing: 'a1b2c3', spot: 'nowhere'}, {thing: 'a1b2c3', spot: 'living.coffee-table.slot-1'}, {thing: 'a1b2c3', spot: 'bedroom.nightstand.slot-2', hints: ['一', '二', '三']}, {thing: 'a1b2c3', spot: 'bedroom.nightstand.slot-2', hints: ['长'.repeat(41)]}, {thing: 'a1b2c3', spot: 'bedroom.nightstand.slot-2', hints: ['\u0007']}]) {
    assert.ok(actArgs('place', 'hide', bad).problem, JSON.stringify(bad));
  }
  assert.deepEqual(actArgs('place', 'hide_me', {spot: 'quilt'}).args, {spot: 'quilt'});
  assert.ok(actArgs('place', 'hide_me', {spot: 'fridge'}).problem);
  assert.deepEqual(actArgs('write', 'letter', {text: ' 晚安 '}).args, {text: '晚安', spot: 'bag'});
  assert.deepEqual(actArgs('write', 'letter', {text: '在茶几上', spot: 'table', title: '给你'}).args, {text: '在茶几上', title: '给你', spot: 'table'});
  assert.deepEqual(actArgs('write', 'letter', {text: '找到我', spot: 'study.desk.slot-1', hints: ['写字的地方']}).args.hints, ['写字的地方']);
  for (const bad of [{}, {text: '  '}, {text: '信'.repeat(2001)}, {text: 'x', title: '题'.repeat(21)}, {text: 'x', spot: 'garden'}, {text: 'x', spot: 'bag', hints: ['不藏不用提示']}]) {
    assert.ok(actArgs('write', 'letter', bad).problem, JSON.stringify(bad));
  }
  assert.deepEqual(actArgs('write', 'sticky', {text: '记得喝水'}).args, {text: '记得喝水'});
  assert.ok(actArgs('write', 'sticky', {text: '字'.repeat(501)}).problem);
  assert.match(actArgs('place', 'dance', {}).problem, /move、hide、hide_me/);
  assert.ok(actArgs('cook', 'move', {}).problem);
});

test('before an act is queued: the thing, the spot, how many are hidden, against the last save and the queue', () => {
  const h = home();
  assert.match(prepareAct(null, {tool: 'place', action: 'move', args: {piece: 'sofa', turn: 90}}).problem, /还没往云上存过/);
  assert.match(prepareAct({...h, furniture: {}}, {tool: 'place', action: 'move', args: {piece: 'sofa', turn: 90}}).problem, /没有沙发/);
  const hide = (thing, spot = 'bedroom.nightstand.slot-1', waiting = [], layout = h) => prepareAct(layout, {tool: 'place', action: 'hide', args: {thing, spot}}, {waiting});
  assert.equal(hide('a1b2c3d4-0000-4000-8000-000000000001').args.thing, 'a1b2c3d4-0000-4000-8000-000000000001');
  // The start of an id will do, when only one thing's id starts so.
  assert.match(hide('a1b2c3d4').problem, /好几样/);
  assert.equal(hide('a1b2c3d4-0000-4000-8000-0000000000').problem, findThing(h.creations, 'a1b2c3d4-0000-4000-8000-0000000000').problem);
  assert.equal(hide('f00dca').problem, '「泡芙」现在不在背包里，只藏背包里的东西。');
  assert.match(hide('beefbe').problem, /write 的 letter/);
  assert.match(hide('dddddd').problem, /没有这个编号/);
  const taken = {...h, creations: [...h.creations, {id: 'x-in-drawer', kind: 'photo', location: 'hide:bedroomNightstand', slot: 0}]};
  assert.match(hide('a1b2c3d4-0000-4000-8000-000000000001', 'bedroom.nightstand.slot-1', [], taken).problem, /已经放着东西/);
  const queued = [{tool: 'write', action: 'letter', args: {text: 'x', spot: 'bedroom.nightstand.slot-1'}}];
  assert.match(hide('a1b2c3d4-0000-4000-8000-000000000001', 'bedroom.nightstand.slot-1', queued).problem, /排着的事/);
  assert.match(hide('a1b2c3d4-0000-4000-8000-000000000001', 'bedroom.nightstand.slot-2', [{tool: 'place', action: 'hide', args: {thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'study.desk.slot-1'}}]).problem, /已经排着要藏了/);
  // Three at a time: the ones she hasn't found and the ones waiting count together.
  const two = {...h, creations: [...h.creations, ...['a', 'b'].map((k, i) => ({id: `hidden-${k}-000`, kind: 'photo', location: 'hide:studyDesk', slot: i, hid: {by: {id: '34', name: '小桦'}, act: '1', on: DAY, asked: 0}}))]};
  assert.ok(hide('a1b2c3d4-0000-4000-8000-000000000001', 'bedroom.nightstand.slot-1', [], two).args);
  assert.match(hide('a1b2c3d4-0000-4000-8000-000000000001', 'bedroom.nightstand.slot-1', queued.map(q => ({...q, args: {...q.args, spot: 'study.desk.slot-4'}})), two).problem, /最多藏 3 样/);
  const found = {...two, creations: two.creations.map(i => i.hid ? {...i, hid: {...i.hid, found: DAY}} : i)};
  assert.ok(hide('a1b2c3d4-0000-4000-8000-000000000001', 'bedroom.nightstand.slot-1', queued.map(q => ({...q, args: {...q.args, spot: 'study.desk.slot-4'}})), found).args);
  const table = {...h, creations: [...h.creations, ...[0, 1, 2].map(slot => ({id: 'on-table-' + slot, kind: 'note', location: 'table', slot}))]};
  const onTable = waiting => prepareAct(table, {tool: 'write', action: 'letter', args: {text: 'x', spot: 'table'}}, {waiting});
  assert.ok(onTable([]).args);
  assert.match(onTable([{tool: 'write', action: 'letter', args: {text: 'y', spot: 'table'}}]).problem, /茶几上放满了/);
  const notes = {...h, computer: {notes: Array.from({length: 11}, (_, i) => ({id: 'n' + i, text: ''}))}};
  assert.ok(prepareAct(notes, {tool: 'write', action: 'sticky', args: {text: 'x'}}).args);
  assert.match(prepareAct(notes, {tool: 'write', action: 'sticky', args: {text: 'x'}}, {waiting: [{tool: 'write', action: 'sticky', args: {text: 'y'}}]}).problem, /最多贴 12 张/);
  assert.equal(actLine({tool: 'place', action: 'hide', args: {thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'bedroom.nightstand.slot-2'}}, h), '把「小狮子」藏到卧室 · 床头柜 · 上抽屉右后');
  assert.equal(actLine({tool: 'place', action: 'move', args: {piece: 'sofa', turn: 90}}, h), '把沙发转 90°');
});

test('moving furniture: where it is asked to go, stopped by the walls, not onto other furniture', () => {
  const h = home();
  const sofa = pieceAt('sofa', h.furniture.sofa);
  // Along the left wall's way a little: room for it there.
  let r = one(h, act('place', 'move', {piece: 'sofa', x: sofa.x, z: sofa.z - .5, note: '给你看书的光'}));
  assert.equal(r.entry.ok, true, r.entry.why);
  assert.equal(r.entry.what, '挪了沙发');
  assert.equal(r.entry.note, '给你看书的光');
  assert.deepEqual([pieceAt('sofa', r.home.furniture.sofa).x, pieceAt('sofa', r.home.furniture.sofa).z], [sofa.x, sofa.z - .5]);
  assert.match(r.entry.said, /^沙发现在在 x 3\.38、z 4\.51，占地 0\.95 × 2\.60 米。$/);
  // Past the wall: as far as it goes.
  r = one(h, act('place', 'move', {piece: 'sofa', x: sofa.x, z: 7.5}));
  assert.equal(r.entry.ok, true);
  assert.match(r.entry.said, /推到边上停住了/);
  assert.ok(pieceAt('sofa', r.home.furniture.sofa).z < 7.5 - 1);
  // Onto the coffee table: not moved, and why.
  const table = pieceAt('coffeeTable', h.furniture.coffeeTable);
  r = one(h, act('place', 'move', {piece: 'sofa', x: table.x, z: table.z}));
  assert.equal(r.entry.ok, false);
  assert.match(r.entry.why, /会压到茶几/);
  assert.deepEqual(r.home.furniture.sofa, h.furniture.sofa);
  // Turning in place; a sofa turned across the room would run into the table; the chairs tucked under the table as
  // the house comes don't count against a chair.
  r = one(h, act('place', 'move', {piece: 'armchair', turn: 90}));
  assert.equal(r.entry.ok, true, r.entry.why);
  assert.equal(r.entry.what, '把单椅转了个方向');
  assert.match(one(h, act('place', 'move', {piece: 'sofa', turn: 90})).entry.why, /会压到茶几/);
  r = one(h, act('place', 'move', {piece: 'diningChair3', turn: -90}));
  assert.equal(r.entry.ok, true, r.entry.why);
  // Where it already is.
  r = one(h, act('place', 'move', {piece: 'sofa', x: sofa.x, z: sofa.z}));
  assert.equal(r.entry.ok, false);
  assert.match(r.entry.why, /已经在那儿了/);
  // Upstairs: the bed across the bedroom.
  const bed = pieceAt('bedroomBed', h.furniture.bedroomBed);
  r = one(h, act('place', 'move', {piece: 'bedroomBed', x: bed.x + 1, z: bed.z}));
  assert.equal(r.entry.ok, true, r.entry.why);
  assert.equal(pieceAt('bedroomBed', r.home.furniture.bedroomBed).x, bed.x + 1);
  const listed = rooms(h.furniture);
  assert.deepEqual(listed.map(room => room.name), ['客厅', '厨房和餐厅', '卧室', '书房']);
  assert.ok(listed[0].pieces.some(p => p.id === 'sofa' && p.name === '沙发' && p.range.x0 < p.x && p.x < p.range.x1));
});

test('hiding a thing from the backpack, and leaving letters and notes', () => {
  const h = home();
  let r = one(h, act('place', 'hide', {thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'bedroom.nightstand.slot-2', hints: ['睡前最后拉开的']}));
  assert.equal(r.entry.ok, true, r.entry.why);
  assert.equal(r.entry.what, '藏了一样东西');
  assert.equal(r.entry.said, '「小狮子」藏在卧室 · 床头柜 · 上抽屉右后。');
  const lion = r.home.creations.find(i => i.name === '小狮子');
  assert.deepEqual({location: lion.location, slot: lion.slot, spotId: lion.spotId}, {location: 'hide:bedroomNightstand', slot: 1, spotId: 'bedroom.nightstand.slot-2'});
  assert.deepEqual(lion.hid, {by: {id: '34', name: '小桦'}, act: r.entry.key, on: DAY, spot: 'bedroom.nightstand.slot-2', hints: ['睡前最后拉开的'], asked: 0});
  assert.deepEqual(whoHid(lion), {id: '34', name: '小桦'});
  assert.equal(r.entry.ref, lion.id);
  // The same thing again: it isn't in the backpack any more.
  const again = one(r.home, act('place', 'hide', {thing: lion.id, spot: 'study.desk.slot-1'}));
  assert.equal(again.entry.ok, false);
  assert.match(again.entry.why, /不在背包里/);
  // A spot taken meanwhile.
  const taken = one(r.home, act('place', 'hide', {thing: 'a1b2c3d4-0000-4000-8000-000000000002', spot: 'bedroom.nightstand.slot-2'}));
  assert.match(taken.entry.why, /已经放着东西/);
  // Letters: into the backpack, onto the coffee table, hidden.
  const bag = one(h, act('write', 'letter', {text: '今天辛苦啦', title: '晚安'}));
  assert.equal(bag.entry.what, '留了一封信，在背包里');
  const letter = bag.home.creations.find(i => i.id === bag.entry.ref);
  assert.deepEqual({kind: letter.kind, name: letter.name, note: letter.note, location: letter.location, by: letter.by, writtenOn: letter.writtenOn}, {kind: 'note', name: '晚安', note: '今天辛苦啦', location: 'bag', by: {kind: 'machine', id: '34', name: '小桦'}, writtenOn: DAY});
  const table = one(h, act('write', 'letter', {text: '看茶几', spot: 'table'}));
  assert.deepEqual(table.home.creations.find(i => i.id === table.entry.ref).location, 'table');
  const hidden = one(h, act('write', 'letter', {text: '找到我啦', spot: 'study.shelf-5'.replace('study.shelf-5', 'study.bookcase.shelf-5')}));
  assert.equal(hidden.entry.ok, true, hidden.entry.why);
  assert.equal(hidden.entry.what, '藏了一封信');
  assert.equal(hidden.home.creations.find(i => i.id === hidden.entry.ref).hid.by.name, '小桦');
  // Three hidden at most.
  let full = h;
  for (const spot of ['study.desk.slot-1', 'study.desk.slot-2', 'study.desk.slot-3']) full = one(full, act('write', 'letter', {text: '一', spot})).home;
  assert.equal(hiddenThings(full.creations).length, 3);
  const fourth = one(full, act('place', 'hide', {thing: 'a1b2c3d4-0000-4000-8000-000000000002', spot: 'study.desk.slot-4'}));
  assert.match(fourth.entry.why, /已经藏着 3 样/);
  // A sticky note on the computer, up to twelve.
  const note = one(h, act('write', 'sticky', {text: '记得喝水'}));
  assert.deepEqual(note.home.computer.notes, [{id: 'machine-' + note.entry.key, text: '记得喝水', by: {kind: 'machine', id: '34', name: '小桦'}}]);
  const crowded = one({...h, computer: {notes: Array.from({length: 12}, (_, i) => ({id: 'n' + i, text: ''}))}}, act('write', 'sticky', {text: 'x'}));
  assert.match(crowded.entry.why, /12 张/);
});

test('choosing where he hides: today, or tomorrow once found today; a hiding place that can still be got into', () => {
  const h = home();
  let r = one(h, act('place', 'hide_me', {spot: 'quilt'}));
  assert.equal(r.entry.what, '挑好了躲在哪儿');
  assert.equal(r.entry.said, `今天（${DAY}）躲在被子底下。`);
  assert.deepEqual(cleanHideSeek(r.home.hideSeek).chosen, {day: DAY, spot: 'quilt', by: {id: '34', name: '小桦'}});
  assert.equal(hidingOn(r.home.hideSeek, DAY, ['wardrobe', 'quilt', 'armchair', 'island']), 'quilt');
  // Can't be got into: the day's own spot.
  assert.notEqual(hidingOn(r.home.hideSeek, DAY, ['wardrobe', 'armchair', 'island']), 'quilt');
  // Found where it chose: the diary says so, and the choice stays.
  const after = markFound(r.home.hideSeek, {day: DAY, spot: 'quilt', seconds: 30, seed: '0123456789abcdef'});
  assert.deepEqual(after.book[0].chose, {id: '34', name: '小桦'});
  assert.deepEqual(after.chosen, {day: DAY, spot: 'quilt', by: {id: '34', name: '小桦'}});
  assert.match(diaryDays({hideSeek: after}, {him: '他'})[0].lines[0].text, /^在被子底下找到他（他自己挑的地方），找了 30 秒$/);
  r = one({...h, hideSeek: after}, act('place', 'hide_me', {spot: 'island'}));
  assert.equal(r.entry.said, '明天（2026-10-27）躲在岛台背后。');
  r = one(h, act('place', 'hide_me', {spot: 'island'}), ctx({available: ['wardrobe']}));
  assert.equal(r.entry.ok, false);
  // Junk in the save is dropped.
  assert.equal(cleanHideSeek({chosen: {day: DAY, spot: 'roof', by: {id: '34', name: '小桦'}}}).chosen, undefined);
  assert.equal(cleanHideSeek({chosen: {day: DAY, spot: 'quilt', by: {id: 'x', name: '小桦'}}}).chosen, undefined);
});

test('every act gets one line in the home, let in or not, and only once', () => {
  const h = home();
  const acts = [
    act('place', 'move', {piece: 'armchair', turn: 90}),
    act('place', 'move', {piece: 'nope', turn: 90}),
    {...act('write', 'sticky', {text: 'x'}), by: {id: 'not-an-id', name: '?'}},
    act('write', 'letter', {text: '你好'})
  ];
  const {home: h2, entries} = applyActs(h, acts, ctx());
  assert.deepEqual(entries.map(e => e.ok), [true, false, true]);
  assert.match(entries[1].why, /没有这件家具/);
  // Asked again (a page that lost the answer): nothing is let in twice.
  const twice = applyActs(h2, acts, ctx());
  assert.equal(twice.entries.length, 0);
  assert.equal(twice.home.creations.filter(i => i.kind === 'note').length, h2.creations.filter(i => i.kind === 'note').length);
  // After the database is put back from a backup, ids come round again: a new act with an old id is a new act.
  const again = applyActs(h2, [{...act('write', 'letter', {text: '又是我'}), id: acts[3].id}], ctx());
  assert.equal(again.entries.length, 1);
  assert.equal(again.entries[0].ok, true);
  // What the server is told: matched by id and key.
  assert.deepEqual(cleanMachine(h2.machine).acts.map(answerOf).map(a => [a.state, a.key]), [['done', acts[0].key], ['refused', acts[1].key], ['done', acts[3].key]]);
  assert.equal(answerOf(entries[1]).answer, entries[1].why);
  // What she hasn't been shown yet, and once she has.
  assert.deepEqual(unseen(h2.machine).map(e => e.id), [entries[0].id, entries[2].id]);
  const seen = markSeen(h2.machine);
  assert.deepEqual(unseen(seen), []);
  assert.deepEqual(unseen(applyActs({...h2, machine: seen}, [act('write', 'sticky', {text: '再贴一张'})], ctx()).home.machine).length, 1);
  // A kind of act this page doesn't know is left for one that does: no line, so the server keeps it waiting.
  assert.equal(applyActs(h2, [{...act('place', 'move', {piece: 'sofa', turn: 90}), action: 'fly'}, {...act('cook', 'move', {}), tool: 'cook'}], ctx()).entries.length, 0);
  // Kept to the last two hundred, junk dropped; nothing odd in a save breaks it.
  const line = i => ({id: String(i + 1), key: crypto.randomUUID(), on: DAY, by: {id: '34', name: '小桦'}, tool: 'write', action: 'sticky', ok: true, what: 'x'});
  const many = {acts: [...Array.from({length: 230}, (_, i) => line(i)), {id: 'x'}, null, {...line(1), id: ['5']}, {...line(1), key: 'nope'}, {...line(1), tool: 'toString'}, {...line(1), tool: 'constructor', action: 'name'}, {...line(1), by: {id: 34, name: '小桦'}}, {...line(1), on: ['2026-10-26']}]};
  const clean = cleanMachine(many);
  assert.equal(clean.acts.length, LIMITS.keep);
  assert.equal(clean.acts[0].id, '31');
  assert.deepEqual(cleanMachine({acts: [{...line(1), key: 'a'.repeat(8) + '-0000-4000-8000-' + '0'.repeat(12)}, {...line(2), key: 'a'.repeat(8) + '-0000-4000-8000-' + '0'.repeat(12)}]}).acts.length, 1, 'each key once');
  assert.deepEqual(cleanMachine({acts: 'nope', seen: '3'}), {acts: [], called: {}});
});

test('finding what was hidden: the hints one at a time, found when it shows, and the diary', () => {
  const h = home();
  let {home: h2} = applyActs(h, [
    act('place', 'hide', {thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'bedroom.nightstand.slot-2', hints: ['睡前最后拉开的']}),
    act('write', 'letter', {text: '找到我啦', spot: 'study.desk.slot-1'})
  ], ctx());
  const [lion, letter] = hiddenThings(h2.creations);
  assert.deepEqual(hintLevels(lion), ['睡前最后拉开的', '在卧室。', '床头柜的抽屉里。', '床头柜 · 上抽屉右后。']);
  assert.deepEqual(hintLevels(letter), ['在书房。', '书桌的抽屉里。', '书桌 · 抽屉左后。']);
  let creations = h2.creations;
  for (let k = 0; k < 6; k++) creations = askHint(creations, lion.id);
  assert.equal(creations.find(i => i.id === lion.id).hid.asked, 4, 'no more than there are');
  // Shows in the open drawer: found.
  assert.deepEqual(foundNow(creations, 'hide:bedroomNightstand', slot => slot < 4).map(i => i.id), [lion.id]);
  assert.deepEqual(foundNow(creations, 'hide:bedroomNightstand', () => false), []);
  creations = markHiddenFound(creations, [lion.id], '2026-10-27');
  assert.equal(creations.find(i => i.id === lion.id).hid.found, '2026-10-27');
  assert.equal(markHiddenFound(creations, [lion.id], '2026-10-30').find(i => i.id === lion.id).hid.found, '2026-10-27', 'found once');
  assert.deepEqual(hiddenThings(creations).map(i => i.id), [letter.id]);
  const lines = machineDiary({...h2, creations});
  assert.deepEqual(lines, [
    {day: DAY, kind: 'visit', text: '小桦来过：藏了一样东西；藏了一封信'},
    {day: '2026-10-27', kind: 'found', text: '找到了小桦藏的「小狮子」'}
  ]);
  const days = diaryDays({...h2, creations}, {him: '他'});
  assert.deepEqual(days.map(d => d.lines.map(l => l.text)), [['小桦来过：藏了一样东西；藏了一封信'], ['找到了小桦藏的「小狮子」']]);
  // Hidden again after she found it: the first find stays in the diary.
  const back = {...h2, creations: creations.map(i => i.id === lion.id ? {...i, location: 'bag', slot: 0, spotId: undefined} : i)};
  assert.equal(whoHid(back.creations.find(i => i.id === lion.id)), null, 'once she has it, it is hers');
  const rehidden = one(back, act('place', 'hide', {thing: lion.id, spot: 'study.desk.slot-2'})).home;
  const twice = markHiddenFound(rehidden.creations, [lion.id], '2026-10-29');
  assert.deepEqual(machineDiary({creations: twice}).map(l => `${l.day} ${l.text}`), ['2026-10-27 找到了小桦藏的「小狮子」', '2026-10-29 找到了小桦藏的「小狮子」']);
  // A name in letters stands apart from the Chinese around it.
  assert.equal(machineDiary({machine: {acts: [{id: '1', key: crypto.randomUUID(), on: DAY, by: {id: '7', name: 'Wren'}, tool: 'write', action: 'sticky', ok: true, what: '贴了一张便签'}]}})[0].text, 'Wren 来过：贴了一张便签');
});

test('the coffee table\'s four places are shared; letters an AI keeps in the home are counted; she isn\'t moved on mid-search', () => {
  const h = home();
  const crowded = {...h, creations: [...h.creations, ...[0, 1, 2].map(slot => ({id: 'hers-' + slot, kind: 'photo', name: '相纸', location: 'hide:coffeeTable', slot}))]};
  assert.ok(tableTaken(crowded.creations, 0) && !tableTaken(crowded.creations, 3));
  const onTable = one(crowded, act('write', 'letter', {text: '茶几上', spot: 'table'}));
  assert.equal(onTable.home.creations.find(i => i.id === onTable.entry.ref).slot, 3);
  assert.match(one(onTable.home, act('write', 'letter', {text: '再放一封', spot: 'table'})).entry.why, /茶几上放满了/);
  assert.match(prepareAct(onTable.home, {tool: 'write', action: 'letter', args: {text: 'x', spot: 'table'}}).problem, /茶几上放满了/);
  // Fifty letters from AIs at most, with those waiting.
  const letters = {...h, creations: [...h.creations, ...Array.from({length: LIMITS.letters - 1}, (_, i) => ({id: 'machine-old-' + i, kind: 'note', name: '一封信', note: 'x', location: 'bag', slot: 0, by: {kind: 'machine', id: '34', name: '小桦'}}))]};
  assert.ok(prepareAct(letters, {tool: 'write', action: 'letter', args: {text: 'x', spot: 'bag'}}).args);
  assert.match(prepareAct(letters, {tool: 'write', action: 'letter', args: {text: 'x', spot: 'bag'}}, {waiting: [{tool: 'write', action: 'letter', args: {text: 'y', spot: 'bag'}}]}).problem, /50 封/);
  const fifty = one(letters, act('write', 'letter', {text: '第五十封'})).home;
  assert.match(one(fifty, act('write', 'letter', {text: '第五十一封'})).entry.why, /50 封/);
  // While she is looking for him, a hiding place he chooses is for tomorrow.
  assert.equal(one(h, act('place', 'hide_me', {spot: 'wardrobe'}), ctx({searching: true})).entry.said, '明天（2026-10-27）躲在衣柜里。');
});

test('what she calls an AI here: 亲爱的 instead of its own name, wherever the house names it', () => {
  const h = home();
  const {home: h2} = applyActs(h, [act('write', 'letter', {text: '你好'}), act('place', 'hide', {thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'study.desk.slot-1'})], ctx());
  assert.equal(calledName(h2.machine, {id: '34', name: '小桦'}), '小桦');
  const named = {...h2, machine: callAs(h2.machine, '34', ' 亲爱的 ')};
  assert.deepEqual(cleanMachine(named.machine).called, {'34': '亲爱的'});
  assert.equal(calledName(named.machine, {id: '34', name: '小桦'}), '亲爱的');
  assert.equal(calledName(named.machine, {id: '35', name: 'Moth'}), 'Moth');
  // Seeing the card keeps it; an empty name goes back to its own.
  assert.deepEqual(markSeen(named.machine).called, {'34': '亲爱的'});
  assert.deepEqual(callAs(named.machine, '34', '').called, {});
  assert.deepEqual(callAs(named.machine, '34', '一二三四五六七八九').called, {}, 'eight characters at most');
  assert.deepEqual(callAs(named.machine, 'x', '老公').called, {'34': '亲爱的'});
  assert.deepEqual(cleanMachine({acts: [], called: {'34': '亲爱的', x: '老公', '35': 5, '36': '\u0007', '37': '很长很长很长很长很长'}}).called, {'34': '亲爱的'});
  const found = {...named, creations: markHiddenFound(named.creations, ['a1b2c3d4-0000-4000-8000-000000000001'], '2026-10-27')};
  assert.deepEqual(machineDiary(found).map(l => l.text), ['亲爱的来过：留了一封信，在背包里；藏了一样东西', '找到了亲爱的藏的「小狮子」']);
  // The thing itself still knows who hid it.
  assert.deepEqual(whoHid(found.creations.find(i => i.name === '小狮子')), {id: '34', name: '小桦'});
});

test('the hiding spots the AI is told about are real ones, each once', () => {
  assert.ok(SPOTS.length > 100);
  assert.equal(new Set(SPOTS.map(s => s.id)).size, SPOTS.length);
  assert.ok(SPOTS.every(s => spotOf(s.id) === s && s.location.startsWith('hide:')));
  assert.equal(spotOf('living.coffee-table.slot-1'), null, 'the coffee table is in plain sight');
  assert.deepEqual(HIDEABLE, ['animal', 'bouquet', 'build', 'dessert', 'photo']);
});

test('together: what the two of them are to do waits for her, plays once, and is said the right way round', () => {
  assert.deepEqual(actArgs('together', 'hug', {note: ' 想你了 ', extra: 1}).args, {note: '想你了'});
  assert.ok(actArgs('together', 'twirl', {}).problem);
  // Let in: a line that hasn't played yet, said as a wish.
  const r = one(home(), act('together', 'hug', {note: '想你了'}));
  assert.equal(r.entry.ok, true);
  assert.equal(r.entry.what, '想从背后抱你一下');
  assert.equal(r.entry.note, '想你了');
  assert.deepEqual(pendingScenes(r.home.machine).map(e => e.action), ['hug']);
  // Up to three wait at once, in the home and in the queue together.
  let h = r.home;
  for (const a of ['kiss', 'pat']) h = one(h, act('together', a, {})).home;
  const fourth = one(h, act('together', 'pinch', {}));
  assert.equal(fourth.entry.ok, false);
  assert.match(fourth.entry.why, /3 件/);
  assert.ok(prepareAct(h, {tool: 'together', action: 'hand', args: {}}).problem);
  assert.ok(prepareAct(r.home, {tool: 'together', action: 'hand', args: {}}, {waiting: [{tool: 'together', action: 'kiss', args: {}}]}).args);
  assert.ok(prepareAct(r.home, {tool: 'together', action: 'hand', args: {}}, {waiting: [{tool: 'together', action: 'kiss', args: {}}, {tool: 'together', action: 'pat', args: {}}]}).problem);
  // Played: said as done, once; the next one is up; the diary has them.
  const key = pendingScenes(h.machine)[0].key;
  const played = playScene(h.machine, key);
  assert.equal(played.acts.find(e => e.key === key).what, '从背后抱了你一下');
  assert.equal(played.acts.find(e => e.key === key).played, true);
  assert.deepEqual(pendingScenes(played).map(e => e.action), ['kiss', 'pat']);
  assert.deepEqual(playScene(played, key), cleanMachine(played));
  assert.match(machineDiary({...h, machine: played}).find(l => l.kind === 'visit').text, /来过：从背后抱了你一下；想偷亲你一口；想摸摸你的头$/);
  // What he actually did is what the home says (a kiss rather than a hug on his lap).
  assert.equal(playScene(h.machine, key, {as: 'kiss'}).acts.find(e => e.key === key).what, '偷亲了你一口');
  assert.equal(playScene(h.machine, key, {as: 'fly'}).acts.find(e => e.key === key).what, '从背后抱了你一下');
  // Where she plays the boy, 他 and 她 swap round.
  const her = one(home(), act('together', 'invite', {}), ctx({him: '她'}));
  assert.equal(her.entry.what, '想叫你过去坐她腿上');
  assert.equal(her.entry.said, '等他在家、你没躲着的时候做。');
  assert.equal(playScene(her.home.machine, her.entry.key, {him: '她'}).acts[0].what, '坐下来叫你过去坐她腿上');
  // How the AI is told.
  assert.equal(actLine({tool: 'together', action: 'kiss', args: {}}, {}), '偷亲她一口（等她在家、你没躲着的时候）');
  assert.equal(actLine({tool: 'together', action: 'invite', args: {}}, {}, {her: '他'}), '坐下来，叫他过来坐你腿上（等他在家、你没躲着的时候）');
  // Only a real `played` is kept.
  assert.equal(cleanMachine({acts: [{...played.acts[1], played: 'yes'}]}).acts[0].played, undefined);
  assert.deepEqual(Object.keys(SCENES), ['hug', 'kiss', 'pat', 'pinch', 'hand', 'invite', 'lean', 'watch', 'dance', 'sleep']);
});

test('outing: he says 走, she sees it at the door; twice a day; one at a time in the queue', () => {
  assert.deepEqual(actArgs('outing', 'go', {note: ' 去湖边看月亮 ', extra: 1}).args, {note: '去湖边看月亮'});
  assert.ok(actArgs('outing', 'run', {}).problem);
  // She isn't at the door: he asks her out, for today.
  const asked = one(home(), act('outing', 'go', {note: '去湖边看月亮'}));
  assert.equal(asked.entry.ok, true);
  assert.equal(asked.entry.what, '约你一起出门');
  assert.equal(asked.entry.note, '去湖边看月亮');
  assert.deepEqual(asked.home.explore.invite, {by: {id: '34', name: '小桦'}, on: DAY});
  // Asked already today: once is enough.
  const again = one(asked.home, act('outing', 'go', {}));
  assert.equal(again.entry.ok, false);
  assert.match(again.entry.why, /已经约过她了/);
  // She's waiting at the door: he says 走.
  const waiting = one(home({explore: {door: {since: 5}}}), act('outing', 'go', {}));
  assert.equal(waiting.entry.what, '在门口说了声「走」');
  assert.match(waiting.entry.said, /她正在门口等着/);
  // Out twice today already: tomorrow.
  const done = one(home({explore: {days: {[DAY]: 2}}}), act('outing', 'go', {}));
  assert.equal(done.entry.ok, false);
  assert.match(done.entry.why, /2 趟/);
  // Where she plays the boy, she is 他.
  assert.match(one(home({explore: {door: {since: 5}}}), act('outing', 'go', {}), ctx({him: '她'})).entry.said, /他正在门口等着/);
  // One 走 waiting in the queue at a time.
  assert.ok(prepareAct(home(), {tool: 'outing', action: 'go', args: {}}).args);
  assert.match(prepareAct(home(), {tool: 'outing', action: 'go', args: {}}, {waiting: [{tool: 'outing', action: 'go', args: {}}]}).problem, /已经说过「走」了/);
  assert.match(actLine({tool: 'outing', action: 'go', args: {}}, {}), /^约她一起出门/);
  // The diary keeps the day he came.
  assert.match(machineDiary(asked.home).find(l => l.kind === 'visit').text, /来过：约你一起出门$/);
});

// The wardrobe as her page tells it (src/machine-closet.js), and what the two of them have on.
const CLOSET = {
  her: 'girl',
  girl: {
    outfit: [{id: 'dress', name: '奶油长裙'}, {id: 'nightgown', name: '白缎吊带睡裙'}, {id: 'cake-dress', name: '蛋糕裙', ways: [{id: 'strawberry', name: '草莓牛奶'}, {id: 'taro', name: '香芋'}]}],
    hair: [{id: 'classic', name: '原版短发'}, {id: 'long', name: '长直发'}],
    head: [{id: 'bow', name: '缎带蝴蝶结'}, {id: 'headband', name: '发箍'}],
    face: [{id: 'round-glasses', name: '圆框眼镜'}], neck: [], chest: [], braid: []
  },
  boy: {
    outfit: [{id: 'coat', name: '炭灰外套'}, {id: 'pajamas', name: '缎面睡衣'}], hair: [{id: 'short', name: '侧分短发'}],
    head: [{id: 'beret', name: '斜戴贝雷帽'}], face: [], neck: [{id: 'knit-scarf', name: '围巾'}], chest: [], braid: []
  },
  wearing: {girl: {outfit: 'dress', hair: 'classic', head: 'bow', face: 'round-glasses'}, boy: {outfit: 'coat', hair: 'short', head: 'none'}}
};
const WARDROBE = {version: 1, playerKind: 'girl', girl: {outfit: 'dress', accessory: 'bow', face: 'round-glasses'}, boy: {outfit: 'coat', accessory: 'none'}};

test('dress: a change of clothes out of what the wardrobe has, for her or for him, said as it was done', () => {
  // What the page tells is kept only as far as it makes sense.
  assert.deepEqual(cleanCloset(CLOSET), CLOSET);
  assert.equal(cleanCloset({...CLOSET, her: 'cat'}), null);
  assert.equal(cleanCloset('closet'), null);
  const odd = cleanCloset({...CLOSET, girl: {...CLOSET.girl, outfit: [...CLOSET.girl.outfit, {id: 'bad id', name: 'x'}, {id: 'long', name: '名'.repeat(25)}, {id: 'ok', name: '好', ways: 'no'}]}});
  assert.deepEqual(odd.girl.outfit.map(o => o.id), ['dress', 'nightgown', 'cake-dress', 'ok']);
  assert.equal(odd.girl.outfit[3].ways, undefined);
  // The shape of an ask.
  assert.deepEqual(actArgs('dress', 'wear', {who: 'her', outfit: 'nightgown', note: ' 睡觉啦 ', extra: 1}).args, {note: '睡觉啦', who: 'her', outfit: 'nightgown'});
  assert.deepEqual(actArgs('dress', 'wear', {who: 'her', head: 'none'}).args, {who: 'her', head: 'none'});
  for (const bad of [{outfit: 'nightgown'}, {who: 'him', outfit: 'nightgown'}, {who: 'her'}, {who: 'her', outfit: 'night gown'}, {who: 'her', outfit: 'none'}, {who: 'her', hair: 'none'}, {who: 'her', colorway: 'none'}, {who: 'her', outfit: 7}]) {
    assert.ok(actArgs('dress', 'wear', bad).problem, JSON.stringify(bad));
  }
  // Checked against the wardrobe as last told, before it waits.
  assert.match(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'nightgown'}}).problem, /还没说过衣柜里有什么/);
  assert.deepEqual(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'nightgown'}}, {closet: CLOSET}).args, {who: 'her', outfit: 'nightgown'});
  assert.match(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'pajamas'}}, {closet: CLOSET}).problem, /她的衣柜里现在没有这件衣服「pajamas」/);
  assert.match(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'me', neck: 'pearl-tie'}}, {closet: CLOSET}).problem, /你的衣柜里现在没有能戴在脖子上的「pearl-tie」/);
  // A colourway goes with the outfit an ask still waiting will put on.
  const waitingCake = [{tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'cake-dress'}}];
  assert.ok(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', colorway: 'taro'}}, {closet: CLOSET, waiting: waitingCake}).args);
  assert.ok(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'me', colorway: 'taro'}}, {closet: CLOSET, waiting: waitingCake}).problem, 'his, not hers');
  assert.match(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'x1'}}, {closet: {...CLOSET, her: 'boy'}, her: '他'}).problem, /^他的衣柜里/);
  assert.equal(actArgs('dress', 'wear', {who: 'her', hair: 'none'}).problem, '发型不能空着，换一个就好。');
  assert.match(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', colorway: 'taro'}}, {closet: CLOSET}).problem, /这件只有一种颜色/);
  assert.match(prepareAct(home(), {tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'cake-dress', colorway: 'mint'}}, {closet: CLOSET}).problem, /配色只有：strawberry 草莓牛奶、taro 香芋/);
  // How the AI is told.
  assert.equal(actLine({tool: 'dress', action: 'wear', args: {who: 'her', outfit: 'nightgown', head: 'none'}}, {}, {closet: CLOSET}), '给她换上「白缎吊带睡裙」，摘掉「缎带蝴蝶结」');
  assert.equal(actLine({tool: 'dress', action: 'wear', args: {who: 'me', outfit: 'pajamas'}}, {}), '给你自己换上「pajamas」');
  // Let in on her page, over what they have on; one after another in the same look.
  const c = ctx({closet: CLOSET, wardrobe: WARDROBE});
  const {home: dressed, entries} = applyActs(home(), [
    act('dress', 'wear', {who: 'her', outfit: 'cake-dress', colorway: 'taro', note: '今天想看你穿这个'}),
    act('dress', 'wear', {who: 'her', colorway: 'strawberry'}),
    act('dress', 'wear', {who: 'her', head: 'none', face: 'none'}),
    act('dress', 'wear', {who: 'me', outfit: 'pajamas', neck: 'knit-scarf'}),
    act('dress', 'wear', {who: 'me', outfit: 'pajamas'}),
    act('dress', 'wear', {who: 'her', outfit: 'nightgown', colorway: 'taro'})
  ], c);
  // Asking for an outfit's first colourway when none is written down changes nothing.
  assert.equal(applyActs(home(), [act('dress', 'wear', {who: 'her', outfit: 'cake-dress'})], ctx({closet: CLOSET, wardrobe: {...WARDROBE, girl: {outfit: 'cake-dress', accessory: 'bow'}}})).entries[0].why, '她已经是这样穿的了。');
  assert.equal(applyActs(home(), [act('dress', 'wear', {who: 'her', colorway: 'strawberry'})], ctx({closet: CLOSET, wardrobe: {...WARDROBE, girl: {outfit: 'cake-dress', accessory: 'bow'}}})).entries[0].why, '她已经是这样穿的了。');
  assert.deepEqual(entries.map(e => e.ok ? e.what : e.why), [
    '给你换上了「蛋糕裙」（香芋）', '给你换上了「蛋糕裙」的草莓牛奶', '给你摘了「缎带蝴蝶结」、「圆框眼镜」', '给自己换上了「缎面睡衣」、「围巾」', '你已经是这样穿的了。', '这件只有一种颜色。'
  ]);
  assert.equal(entries[0].note, '今天想看你穿这个');
  assert.equal(entries[0].said, '她换上了「蛋糕裙」（香芋）。');
  assert.equal(entries[3].said, '你换上了「缎面睡衣」、「围巾」。');
  const w = dressed.residents.wardrobeV1;
  assert.deepEqual(w.girl, {outfit: 'cake-dress', accessory: 'none', colorways: {'cake-dress': 'strawberry'}});
  assert.deepEqual(w.boy, {outfit: 'pajamas', accessory: 'none', neck: 'knit-scarf'});
  assert.equal(dressed.residents.girlOutfit, 'cake-dress');
  assert.equal(dressed.residents.girlAccessory, false);
  assert.match(machineDiary(dressed).find(l => l.kind === 'visit').text, /来过：给你换上了「蛋糕裙」（香芋）；给你换上了「蛋糕裙」的草莓牛奶；给你摘了/);
  // The wardrobe not known yet on this page (the home's own things still coming): left waiting, no line.
  const later = applyActs(home(), [act('dress', 'wear', {who: 'her', outfit: 'nightgown'}), act('write', 'sticky', {text: '晚安'})], ctx({wardrobe: WARDROBE}));
  assert.deepEqual(later.entries.map(e => `${e.tool}.${e.action}`), ['write.sticky']);
  // Where she plays the boy, she is still 'her'.
  const swapped = {...CLOSET, her: 'boy'};
  const him = applyActs(home(), [act('dress', 'wear', {who: 'her', outfit: 'pajamas'})], ctx({closet: swapped, wardrobe: {...WARDROBE, playerKind: 'boy'}, him: '她'}));
  assert.equal(him.entries[0].said, '他换上了「缎面睡衣」。');
  assert.equal(him.home.residents.wardrobeV1.boy.outfit, 'pajamas');
});

test('make: a bouquet, a dessert, a doll, out of what the benches here have, tagged as his', () => {
  // The shape of an ask: what the benches offer, colours off their own swatches.
  assert.deepEqual(actArgs('make', 'bouquet', {flowers: [{type: 'rose', color: '#D9A1BD'}], name: ' 给你的 ', note: '路过花店想起你'}).args, {note: '路过花店想起你', name: '给你的', flowers: [{type: 'rose', color: '#d9a1bd'}], spot: 'bag'});
  const rose = [{type: 'rose', color: '#fff0dc'}];
  for (const bad of [{flowers: []}, {flowers: [{type: 'orchid', color: '#fff0dc'}]}, {flowers: [{type: 'lily', color: '#fff0dc'}]}, {flowers: [{type: 'rose', color: 'pink'}]}, {flowers: [{type: 'rose', color: '#123456'}]},
    {flowers: Array(10).fill(rose[0])}, {flowers: rose, vase: 'jar'}, {flowers: rose, vase: 'glass'}, {flowers: rose, vase_color: '#000000'}, {flowers: rose, spot: 'roof'}, {flowers: rose, hints: ['x']}, {flowers: rose, name: '长'.repeat(21)}]) {
    assert.ok(actArgs('make', 'bouquet', bad).problem, JSON.stringify(bad));
  }
  assert.match(actArgs('make', 'bouquet', {flowers: [{type: 'lily', color: '#fff0dc'}]}).problem, /daisy、rose、tulip 里的一个/);
  assert.ok(actArgs('make', 'dessert', {cream: 'rosette'}).problem, 'a base is needed');
  assert.ok(actArgs('make', 'dessert', {base: 'cake', colors: {body: 'neon'}}).problem);
  assert.deepEqual(actArgs('make', 'dessert', {base: 'tart', fruit: 'cherry', colors: {cream: 'blush'}}).args, {base: 'tart', fruit: 'cherry', colors: {cream: 'blush'}, spot: 'bag'});
  assert.ok(actArgs('make', 'doll', {species: 'unicorn'}).problem);
  assert.ok(actArgs('make', 'doll', {species: 'lion', ears: 'floppy'}).problem, 'a lion has its own ears');
  assert.ok(actArgs('make', 'doll', {species: 'lion', accessories: ['bow', 'scarf']}).problem, 'one thing at the neck');
  assert.ok(actArgs('make', 'doll', {species: 'lion', pose: 'hold'}).problem, 'nothing to hold');
  assert.ok(actArgs('make', 'doll', {species: 'lion', fur: '#123456'}).problem, 'off the swatches');
  assert.ok(actArgs('make', 'doll', {species: 'fox', patch: '#60483f', fur: '#f0a35e'}).args, 'swatches, and its kind\'s own');
  assert.deepEqual(actArgs('make', 'doll', {species: 'lion', accessories: ['bow', 'glasses'], expression: 'wink'}).args, {species: 'lion', expression: 'wink', accessories: ['glasses', 'bow'], spot: 'bag'});
  assert.ok(actArgs('make', 'cake', {}).problem);
  // The benches here: only the kinds caught or given, only the doll things drawn.
  // One handful of wild strawberries brought home from the woods (src/bench-stock.js).
  const h = home({caught: ['lion', 'fox'], capsules: {dolls: ['bow']}, machine: {acts: [], called: {34: '亲爱的'}}, explore: {found: {'woods:wild-strawberry': 1}}});
  assert.deepEqual(benchOf(h).species, ['bear', 'fox', 'lion']);
  assert.deepEqual(benchOf(h).accessories, ['bow']);
  assert.match(prepareAct(h, {tool: 'make', action: 'doll', args: {species: 'cat', spot: 'bag'}}).problem, /家里还没有小猫/);
  assert.match(prepareAct(h, {tool: 'make', action: 'doll', args: {species: 'lion', accessories: ['glasses'], spot: 'bag'}}).problem, /家里还没有小眼镜/);
  assert.ok(prepareAct(h, {tool: 'make', action: 'doll', args: {species: 'lion', accessories: ['bow'], spot: 'bag'}}).args);
  // Let in: into the backpack, onto the table, hidden; tagged as his (by the name she calls him), made today, with why.
  const r = applyActs(h, [
    act('make', 'bouquet', {flowers: [{type: 'rose', color: '#d9a1bd'}, {type: 'daisy', color: '#fff0dc'}, {type: 'tulip', color: '#e6bc63'}], name: '给你的', note: '路过花店想起你'}),
    act('make', 'dessert', {base: 'cake', fruit: 'strawberry', spot: 'table'}),
    act('make', 'doll', {species: 'fox', name: '阿狐', accessories: ['bow'], spot: 'bedroom.bed.slot-2', hints: ['你睡觉的地方']}),
    act('make', 'doll', {species: 'cat'}),
    act('make', 'dessert', {base: 'puff', name: '晚安'})
  ], ctx());
  assert.deepEqual(r.entries.map(e => e.ok ? e.what : e.why), ['做了一束花「给你的」给你，在背包里', '做了一份蛋糕给你，放在茶几上', '做了一只小狐狸「阿狐」，藏起来了', '家里还没有小猫这种玩偶（抓到过、收到过的才有）。', '做了一份「晚安」给你，在背包里']);
  assert.equal(r.entries[0].note, '路过花店想起你');
  // The cake's handful of strawberries came out of hers; the puff took none. Gone, there's none for another.
  assert.deepEqual(r.home.spent.fruit, {strawberry: 1});
  assert.match(prepareAct(r.home, {tool: 'make', action: 'dessert', args: {base: 'cake', fruit: 'strawberry', spot: 'bag'}}).problem, /甜品台上还没有「草莓」/);
  assert.match(prepareAct(r.home, {tool: 'make', action: 'doll', args: {species: 'lion', fur: '#f3cdd0', spot: 'bag'}}).problem, /还没有「浅粉」的染料/);
  assert.equal(r.entries[2].said, '做好了，藏在卧室 · 床 · 右枕头下面。');
  const made = r.home.creations.filter(i => i.by?.kind === 'machine');
  assert.deepEqual(made.map(i => [i.kind, i.location, i.madeOn, i.by.name]), [['bouquet', 'bag', DAY, '亲爱的'], ['dessert', 'table', DAY, '亲爱的'], ['animal', 'hide:bedroomBed', DAY, '亲爱的'], ['dessert', 'bag', DAY, '亲爱的']]);
  assert.deepEqual(made[0].by, {kind: 'machine', id: '34', name: '亲爱的', note: '路过花店想起你'});
  assert.deepEqual(made[0].stems.map(s => s.slot), [4, 1, 3]);
  assert.deepEqual(made[2].accessory, ['bow']);
  assert.equal(made[2].hid.hints[0], '你睡觉的地方');
  assert.deepEqual(hiddenThings(r.home.creations).map(i => i.name), ['阿狐']);
  // A dessert he made is one: its tags say who made it, and it can be learned from.
  assert.ok(validDessert(made[1]));
  assert.equal(makerLabel(made[1].by), '亲爱的做的');
  // A long name is cut short enough for every tag.
  const long = applyActs(home(), [act('make', 'dessert', {base: 'cake'}, {id: '35', name: 'a_very_long_ai_name_for_tests_1'})], ctx());
  assert.equal(long.home.creations.at(-1).by.name, 'a_very_long_ai_name_');
  assert.ok(validDessert(long.home.creations.at(-1)));
  // The album doesn't show the doll before she finds it.
  assert.equal(albumOf(r.home).dolls.find(d => d.id === 'fox').have, false);
  assert.equal(rememberAlbum(r.home).album.dolls.fox, undefined);
  const found = {...r.home, creations: markHiddenFound(r.home.creations, [made[2].id], DAY)};
  assert.equal(albumOf(found).dolls.find(d => d.id === 'fox').have, true);
  // The diary says he made them, not that she did.
  assert.match(machineDiary(r.home).map(l => l.text).join('；'), /亲爱的来过：做了一束花「给你的」给你，在背包里；做了一份蛋糕给你，放在茶几上；做了一只小狐狸「阿狐」，藏起来了/);
  assert.ok(!diaryDays(r.home).flatMap(d => d.lines).some(l => l.kind === 'made'), 'not as things she made');
  // How the AI is told.
  assert.equal(actLine({tool: 'make', action: 'doll', args: {species: 'lion', name: '阿狮', spot: 'bedroom.bed.slot-2'}}, {}), '做一只小狮子「阿狮」，藏在卧室 · 床 · 右枕头下面');
  assert.equal(actLine({tool: 'make', action: 'dessert', args: {base: 'tart', spot: 'bag'}}, {}), '做一份小塔，放进她的背包');
  // At most thirty things he made are kept in the home.
  const full = home({creations: Array.from({length: 30}, (_, i) => ({id: `made-${i}-0000-4000-8000`, kind: 'bouquet', name: '花', location: 'bag', by: {kind: 'machine', id: '34', name: '小桦'}}))});
  assert.match(prepareAct(full, {tool: 'make', action: 'bouquet', args: {flowers: rose, spot: 'bag'}}).problem, /30 样/);
});

test('make: a dish off her stove, out of what is in the fridge, set under the dome for the two of them', () => {
  // What goes in (in the order it goes in, once each), which pot, what goes on top, how long it is on the fire.
  const porridge = {items: ['pumpkin', 'rice'], extras: ['honey'], spot: 'dome', note: '熬到五点的人，先喝一碗再睡'};
  assert.deepEqual(actArgs('make', 'dish', porridge).args, {note: '熬到五点的人，先喝一碗再睡', items: ['pumpkin', 'rice'], method: 'pot', extras: ['honey'], spot: 'dome'});
  assert.deepEqual(actArgs('make', 'dish', {items: ['tomato', 'egg'], heat: 'browned'}).args, {items: ['tomato', 'egg'], method: 'wok', heat: 'browned', spot: 'bag'});
  assert.deepEqual(actArgs('make', 'dish', {items: ['egg'], heat: 'just'}).args, {items: ['egg'], method: 'wok', spot: 'bag'}, 'just right says nothing');
  for (const bad of [{}, {items: []}, {items: ['tomato', 'tomato']}, {items: ['tomato', 'greens', 'pea', 'egg', 'pumpkin']}, {items: ['cheese']}, {items: ['egg'], method: 'oven'}, {items: ['egg'], extras: ['salt']}, {items: ['egg'], extras: ['honey', 'honey']}, {items: ['egg'], heat: 'raw'}]) {
    assert.ok(actArgs('make', 'dish', bad).problem, JSON.stringify(bad));
  }
  assert.match(actArgs('make', 'dish', {items: ['rice', 'egg'], method: 'wok'}).problem, /米得用小锅熬粥/);
  assert.match(actArgs('make', 'dish', {items: ['tea'], method: 'wok'}).problem, /茶叶得用小锅煮/);
  // Where it goes: the dome is for something to eat, and a dish is eaten hot, not hidden.
  assert.match(actArgs('make', 'dish', {items: ['egg'], spot: 'bedroom.bed.slot-2'}).problem, /菜不藏起来/);
  assert.match(actArgs('make', 'bouquet', {flowers: [{type: 'rose', color: '#d9a1bd'}], spot: 'dome'}).problem, /只放吃的/);
  assert.equal(actArgs('make', 'dessert', {base: 'puff', spot: 'dome'}).args.spot, 'dome');
  // The fridge: the two tomatoes and the greens the kitchen opened with, a pumpkin from the fields and a honeycomb from
  // the woods. Eggs, rice, spring onion and garlic are always there; nothing else is yet.
  const h = home({machine: {acts: [], called: {34: '亲爱的'}}, explore: {found: {'field:pumpkin': 1, 'woods:honeycomb': 1}}});
  assert.deepEqual(benchOf(h).kitchen, {items: ['tomato', 'greens', 'pumpkin', 'egg', 'rice'], extras: ['scallion', 'garlic', 'honey']});
  assert.match(prepareAct(h, {tool: 'make', action: 'dish', args: {items: ['bamboo', 'rice'], method: 'pot', spot: 'bag'}}).problem, /还没有笋，出门去茶山上找一找/);
  assert.match(prepareAct(h, {tool: 'make', action: 'dish', args: {items: ['egg', 'rice'], method: 'pot', extras: ['walnut'], spot: 'bag'}}).problem, /还没有核桃，出门去林子深处找一找/);
  const asked = actArgs('make', 'dish', porridge).args;
  assert.ok(prepareAct(h, {tool: 'make', action: 'dish', args: asked}).args);
  // The dome holds one: what she has under it stays, and only one thing at a time waits to go in.
  const under = {...h, creations: [...h.creations, {id: 'cake-under-the-dome', kind: 'dessert', name: '草莓蛋糕', location: 'dome', slot: 0}]};
  assert.match(prepareAct(under, {tool: 'make', action: 'dish', args: asked}).problem, /玻璃罩里已经有「草莓蛋糕」了，等她吃掉再放/);
  assert.match(prepareAct(h, {tool: 'make', action: 'dish', args: asked}, {waiting: [{tool: 'make', action: 'dessert', args: {base: 'puff', spot: 'dome'}}]}).problem, /只放得下一样/);
  // How the AI is told: cooked in the pot, stir-fried in the wok.
  assert.equal(actLine({tool: 'make', action: 'dish', args: asked}, {}), '煮一锅蜂蜜南瓜粥，放在餐桌的玻璃罩里');
  assert.equal(actLine({tool: 'make', action: 'dish', args: {items: ['tomato', 'egg'], method: 'wok', spot: 'bag'}}, {}), '炒一盘番茄炒蛋，放进她的背包');
  assert.equal(actLine({tool: 'make', action: 'dish', args: {items: ['wheat', 'egg'], method: 'pot', name: '长寿面', spot: 'table'}}, {}), '煮一锅「长寿面」，放在客厅茶几上');
  // Let in: under the dome, tagged as his with his line on the tag; the pumpkin and a drizzle of honey come out of
  // hers, so there is no pumpkin for another.
  const key = '5eed0000-0000-4000-8000-000000000001';
  const r = applyActs(h, [{...act('make', 'dish', porridge), key}, act('make', 'dish', {items: ['tomato', 'egg'], spot: 'dome'}), act('make', 'dish', {items: ['pumpkin'], method: 'pot'})], ctx());
  assert.deepEqual(r.entries.map(e => e.ok ? e.what : e.why), ['煮了一锅蜂蜜南瓜粥给你，放在餐桌的玻璃罩里', '餐桌的玻璃罩里已经有「蜂蜜南瓜粥」了，没放。', '南瓜用完了，出门再去田里找一些。']);
  const dish = domeItem(r.home.creations), mishaps = dishMishaps(['pumpkin', 'rice'], 'pot', seeded(key));
  assert.deepEqual(dishRecipe(dish), {kind: 'dish', v: 1, items: ['pumpkin', 'rice'], method: 'pot', extras: ['honey'], name: '蜂蜜南瓜粥', ...(mishaps.length ? {mishaps} : {})});
  assert.deepEqual([dish.by, dish.madeOn], [{kind: 'machine', id: '34', name: '亲爱的', note: '熬到五点的人，先喝一碗再睡'}, DAY]);
  assert.ok(validDish(dish));
  assert.equal(tagNote(dish), '熬到五点的人，先喝一碗再睡');
  assert.deepEqual(r.home.spent.produce, {pumpkin: 1, honey: 1});
  // Eaten together, it has its page in the book: who made it, and his line.
  const page = finishMeal(r.home, dish.id, '2026-10-27').dessertBook.at(-1);
  assert.deepEqual([page.recipe.name, makerLabel(page.by), tagNote(page)], ['蜂蜜南瓜粥', '亲爱的做的', '熬到五点的人，先喝一碗再睡']);
  // The diary says he cooked it, not that she did.
  assert.match(machineDiary(r.home).map(l => l.text).join('；'), /亲爱的来过：煮了一锅蜂蜜南瓜粥给你，放在餐桌的玻璃罩里/);
  assert.ok(!diaryDays(r.home).flatMap(d => d.lines).some(l => l.kind === 'made'), 'not as a dish she made');
});

test('make: a dish the AI cooks can have a little accident at the stove, as hers can, the same each time it is let in', () => {
  const h = home({explore: {found: {'field:pumpkin': 3}}});
  const keys = Array.from({length: 60}, (_, i) => `${(0x1000 + i).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`);
  const cook = (args, key) => one(h, {...act('make', 'dish', args), key});
  // In the pot it can only boil over; in the wok with a tomato, the tomato squirts, the oil spits or the wok flares,
  // two of them at most.
  const pot = keys.map(key => cook({items: ['pumpkin', 'rice']}, key));
  const potHad = pot.map(c => c.home.creations.at(-1).mishaps || []);
  assert.ok(potHad.every(m => m.length <= 1 && m.every(id => id === 'boilover')));
  assert.ok(potHad.some(m => m.length) && potHad.some(m => !m.length), 'now and then, not every time');
  const wokHad = keys.map(key => cook({items: ['tomato', 'egg']}, key).home.creations.at(-1).mishaps || []);
  assert.ok(wokHad.every(m => m.length <= 2 && m.every(id => ['juice', 'splatter', 'flame'].includes(id))));
  assert.ok(wokHad.some(m => m.length === 2));
  // He is told what happened; her dish says it on its page when it is eaten.
  const over = pot.find(c => c.home.creations.at(-1).mishaps);
  assert.equal(over.entry.said, '做好了，放进了她的背包。做的时候中间溢了一下锅。');
  assert.equal(pot.find(c => !c.home.creations.at(-1).mishaps).entry.said, '做好了，放进了她的背包。');
  // Letting the same act in again comes out the same.
  assert.deepEqual(keys.map(key => cook({items: ['pumpkin', 'rice']}, key).home.creations.at(-1).mishaps || []), potHad);
});

test('the coffee table\'s places are shared when things on it are moved, too', () => {
  const items = [{id: 'letter', location: 'table', slot: 0}, {id: 'cup', location: 'hide:coffeeTable', slot: 1}, {id: 'elsewhere', location: 'hide:studyDesk', slot: 1}];
  const moved = shiftItem(items, 'letter', 1, 0);
  assert.deepEqual(moved.map(i => [i.id, i.slot]), [['letter', 1], ['cup', 0], ['elsewhere', 1]]);
});

test('the colours the AI may use are the benches\' own', () => {
  const read = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
  const list = (text, name) => JSON.parse(new RegExp(`${name}=(\\[[^\\]]*\\])`).exec(text)[1].replaceAll("'", '"'));
  assert.deepEqual(Object.keys(COLORS.vase), list(read('florist.jsx'), 'VASE_COLORS'));
  assert.deepEqual(Object.keys(COLORS.flower), list(read('florist.jsx'), 'FLOWER_COLORS'));
  assert.deepEqual(Object.keys(COLORS.doll), list(read('atelier.jsx'), 'SWATCHES'));
});

test('a drift bottle the AI asks to throw: its words checked, one waiting, let in once a day with its words kept', () => {
  assert.deepEqual(actArgs('write', 'bottle', {text: '  写给还不认识的你  '}).args, {text: '写给还不认识的你'});
  assert.match(actArgs('write', 'bottle', {text: '字'.repeat(1001)}).problem, /最多 1000 个字/);
  assert.match(actArgs('write', 'bottle', {}).problem, /瓶子里的纸条/);
  assert.ok(prepareAct({creations: []}, {tool: 'write', action: 'bottle', args: {text: 'x'}}).args);
  // One of its own waiting at a time; another AI's waiting isn't in the way.
  assert.match(prepareAct({creations: []}, {tool: 'write', action: 'bottle', args: {text: 'x'}}, {waiting: [{tool: 'write', action: 'bottle', args: {text: 'y'}, mine: true}]}).problem, /你已经排着一只漂流瓶了/);
  assert.ok(prepareAct({creations: []}, {tool: 'write', action: 'bottle', args: {text: 'x'}}, {waiting: [{tool: 'write', action: 'bottle', args: {text: 'y'}, mine: false}]}).args);
  const first = act('write', 'bottle', {text: '今天这边下过雨。'}), second = act('write', 'bottle', {text: '又一只'});
  const r = applyActs({creations: []}, [first], ctx());
  assert.deepEqual(r.entries.map(e => [e.ok, e.what]), [[true, '往海里投了一只漂流瓶']]);
  assert.deepEqual(r.home.bottles.log, [{day: DAY, what: 'thrown', act: first.key, by: {kind: 'machine', id: first.by.id, name: first.by.nickname || first.by.name}, words: '今天这边下过雨。'}]);
  // Another the same day is turned away; the first is in the visit's line in the diary, not as one of hers.
  const again = applyActs(r.home, [second], ctx());
  assert.match(again.entries[0].why, /今天已经往海里投过一只了/);
  assert.match(machineDiary(r.home).map(l => l.text).join('\n'), /来过：往海里投了一只漂流瓶/);
});

test('together, more of it: leaning on him, watching television, a dance when a record plays, bed in the bedroom', () => {
  for (const k of ['lean', 'watch', 'dance', 'sleep']) assert.deepEqual(actArgs('together', k, {note: '想你了'}).args, {note: '想你了'});
  assert.equal(actLine({tool: 'together', action: 'dance', args: {}}, {}), '请她跳一支舞，留声机响着的时候（等她在家、你没躲着的时候）');
  const lean = act('together', 'lean', {}), dance = act('together', 'dance', {}), hug = act('together', 'hug', {});
  const r = applyActs({}, [lean, dance, hug], ctx());
  assert.deepEqual(r.entries.map(e => e.what), ['想让你靠着他坐一会儿', '想请你跳一支舞（留声机响着的时候）', '想从背后抱你一下']);
  // Played as what he did.
  assert.equal(playScene(r.home.machine, lean.key, {as: 'lean'}).acts.find(e => e.key === lean.key).what, '坐到沙发上，让你靠着他');
  assert.deepEqual(pendingScenes(r.home.machine).map(e => e.action), ['lean', 'dance', 'hug']);
  // One waiting for its moment doesn't hold the rest up: leaning on him is for downstairs, where the sofa is (the
  // floor's overview or the living room), a dance for a record playing, bed for the bedroom; a hug is for anywhere.
  const now = (machine, at) => sceneNow(machine, at)?.action ?? null;
  assert.equal(now(r.home.machine, {floor: '2F', room: 'study', playing: false}), 'hug');
  assert.equal(now(r.home.machine, {floor: '1F', room: 'kitchen', playing: false}), 'hug');
  assert.equal(now(r.home.machine, {floor: '1F', room: 'overview', playing: false}), 'lean');
  assert.equal(now(r.home.machine, {floor: '1F', room: 'living', playing: true}), 'lean');
  assert.equal(now(r.home.machine, {floor: '1F', room: 'kitchen', playing: true}), 'dance');
  assert.equal(now(r.home.machine, {}), 'hug');
  const bed = applyActs({}, [act('together', 'sleep', {}), act('together', 'kiss', {})], ctx()).home.machine;
  assert.equal(now(bed, {floor: '2F', room: 'bedroom', playing: false}), 'sleep');
  assert.equal(now(bed, {floor: '2F', room: 'study', playing: true}), 'kiss');
  // Nothing left to play: none.
  let m = r.home.machine;
  for (const a of [lean, dance, hug]) m = playScene(m, a.key);
  assert.equal(sceneNow(m, {floor: '1F', room: 'living', playing: true}), null);
  // Those waiting aren't in the way of the rest: three that play once she's in at a time, one of each that waits.
  const more = applyActs(r.home, ['kiss', 'pat', 'dance', 'sleep', 'pinch'].map(k => act('together', k, {})), ctx());
  assert.deepEqual(more.entries.map(e => e.ok ? e.what : e.why), ['想偷亲你一口', '想摸摸你的头', '同样的一件已经在等留声机响了，这件没排上。', '想跟你一起睡（你在卧室的时候）', '已经有 3 件等她进屋再做的了，这件没排上。']);
  const layout = {...more.home};
  assert.match(prepareAct(layout, {tool: 'together', action: 'pinch', args: {}}).problem, /已经有 3 件等她进屋再做的了/);
  assert.match(prepareAct(layout, {tool: 'together', action: 'sleep', args: {}}).problem, /同样的一件已经在等她进卧室了/);
  assert.deepEqual(prepareAct(layout, {tool: 'together', action: 'watch', args: {}}), {args: {}});
  assert.match(prepareAct(layout, {tool: 'together', action: 'watch', args: {}}, {waiting: [{tool: 'together', action: 'watch', args: {}}]}).problem, /同样的一件已经在等她到楼下客厅了（连排着的）/);
});

test('together: one whose moment never came is let go by the end of the next day', () => {
  const old = applyActs({}, [act('together', 'dance', {}), act('together', 'hug', {})], ctx({day: '2026-10-24'})).home;
  const recent = applyActs(old, [act('together', 'sleep', {})], ctx({day: '2026-10-25'})).home;
  // The day after, still waiting.
  assert.equal(lapseScenes(recent.machine, '2026-10-25'), recent.machine);
  const gone = lapseScenes(recent.machine, '2026-10-26');
  assert.deepEqual(gone.acts.map(e => [e.action, e.what, !!e.lapsed]), [['dance', '想请你跳一支舞，没等到', true], ['hug', '想从背后抱你一下，没等到', true], ['sleep', '想跟你一起睡（你在卧室的时候）', false]]);
  assert.deepEqual(pendingScenes(gone).map(e => e.action), ['sleep']);
  assert.equal(lapseScenes(gone, '2026-10-26'), gone);
  // Kept as let go; out of the way, so another dance may be asked for.
  assert.deepEqual(cleanMachine(gone).acts.map(e => !!e.lapsed), [true, true, false]);
  assert.equal(applyActs({...recent, machine: gone}, [act('together', 'dance', {})], ctx({day: '2026-10-26'})).entries[0].ok, true);
  // Played ones are done, not let go; and a day that isn't one changes nothing.
  assert.equal(lapseScenes(playScene(old.machine, old.machine.acts[0].key), '2026-10-30').acts[0].lapsed, undefined);
  assert.equal(lapseScenes(recent.machine, 'soon'), recent.machine);
});

test('翻一格: what she hides for him looks empty to him; three spots a day; turned over, it is found and read', () => {
  const day = DAY, LETTER = 'beefbeef-0000-4000-8000-000000000004', FLOWERS = 'a1b2c3d4-0000-4000-8000-000000000002';
  // She hides the old letter in the basket for him, with a line to go on; the flowers she only puts away.
  const h = home();
  h.creations = h.creations.map(i => i.id === LETTER ? {...i, location: 'hide:livingBasket', slot: 2, spotId: 'living.basket.slot-3'}
    : i.id === FLOWERS ? {...i, location: 'hide:bedroomNightstand', slot: 0, spotId: 'bedroom.nightstand.slot-1'} : i);
  h.creations = markStash(h.creations, LETTER, {day, hint: ' 软软的地方 '});
  const letter = h.creations.find(i => i.id === LETTER);
  assert.deepEqual(letter.stash, {on: day, hint: '软软的地方'});
  // Only somewhere he can turn over: not in the backpack, not in the fridge.
  assert.equal(markStash(h.creations, 'a1b2c3d4-0000-4000-8000-000000000001', {day}).find(i => i.name === '小狮子').stash, undefined);
  assert.equal(seekableAt('hide:livingBasket'), true);
  assert.equal(seekableAt('refrigerator:cabinet:0,0,0'), false);
  assert.deepEqual(stashedThings(h.creations).map(i => i.id), [LETTER]);
  // What he has to go on: her line, the room from the next day, the piece the day after; never the spot.
  assert.deepEqual(stashHints(letter, day), ['软软的地方']);
  assert.deepEqual(stashHints(letter, '2026-10-27'), ['软软的地方', '在客厅。']);
  assert.deepEqual(stashHints(letter, '2026-10-28'), ['软软的地方', '在客厅。', '编织篮里，叠好的毯子底下。']);
  // Asking: a spot to turn over; with nothing hidden for him, nothing to turn.
  assert.match(actArgs('place', 'seek', {spot: 'nowhere'}).problem, /藏点的编号/);
  assert.deepEqual(actArgs('place', 'seek', {spot: 'living.basket.slot-1'}).args, {spot: 'living.basket.slot-1'});
  assert.match(prepareAct(home(), {tool: 'place', action: 'seek', args: {spot: 'living.basket.slot-1'}}, {day, me: '34'}).problem, /没藏东西给你找/);
  const waiting = spot => ({mine: true, tool: 'place', action: 'seek', args: {spot}});
  assert.match(prepareAct(h, {tool: 'place', action: 'seek', args: {spot: 'living.basket.slot-1'}}, {day, me: '34', waiting: ['study.desk.slot-1', 'study.desk.slot-2', 'study.desk.slot-3'].map(waiting)}).problem, /翻过 3 格/);
  assert.match(prepareAct(h, {tool: 'place', action: 'seek', args: {spot: 'study.desk.slot-1'}}, {day, me: '34', waiting: [waiting('study.desk.slot-1')]}).problem, /已经排着要翻了/);
  // Putting something of his where hers is: he touches it.
  assert.match(prepareAct(h, {tool: 'place', action: 'hide', args: {thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'living.basket.slot-3'}}, {day, me: '34'}).problem, /指尖碰到了东西/);
  // What turning one over shows, from the save.
  assert.equal(seekSees(h, 'living.basket.slot-1', {me: '34'}).words, '空的。');
  assert.equal(seekSees(h, 'bedroom.nightstand.slot-1', {me: '34'}).words, '里面是她放的「一束花」，不是藏给你的。');
  // A letter she only put away: not his to read, and he is told how it could be.
  const putAway = structuredClone(h);
  putAway.creations.push({id: 'beefbeef-0000-4000-8000-000000000009', kind: 'note', name: '一封信', note: '不给你看', location: 'hide:studyDesk', slot: 0, spotId: 'study.desk.slot-1'});
  const read = seekSees(putAway, 'study.desk.slot-1', {me: '34'});
  assert.equal(read.found, false);
  assert.ok(!read.words.includes('不给你看'), read.words);
  assert.match(read.words, /^里面是她放的一封信，不是藏给你的，你读不到。想读的话，请她把信收进背包，点上「藏给你找」再藏一次。$/);
  const seen = seekSees(h, 'living.basket.slot-3', {me: '34'});
  assert.deepEqual([seen.found, seen.words], [true, '找到了！是她藏给你的一封信。信上写着：「旧信」']);
  // Her page: one turned over empty, then the one with hers in it, found by him today.
  let r = one(h, act('place', 'seek', {spot: 'living.basket.slot-1'}));
  assert.deepEqual([r.entry.ok, r.entry.what, r.entry.said], [true, '翻了客厅 · 编织篮 · 折毯下左后', '客厅 · 编织篮 · 折毯下左后：空的。']);
  r = one(r.home, act('place', 'seek', {spot: 'living.basket.slot-3'}));
  assert.deepEqual([r.entry.what, r.entry.said, r.entry.ref], ['翻了客厅 · 编织篮 · 折毯下左前，找到了你藏的一封信', '找到了：客厅 · 编织篮 · 折毯下左前里是她藏给你的一封信。', LETTER]);
  const found = r.home.creations.find(i => i.id === LETTER);
  assert.deepEqual(found.stash, {on: day, hint: '软软的地方', found: day, by: {id: '34', name: '小桦'}, spot: 'living.basket.slot-3'});
  assert.equal(stashed(found), false);
  // The third today, and no more.
  r = one(r.home, act('place', 'seek', {spot: 'living.basket.slot-2'}));
  assert.equal(r.entry.ok, true);
  assert.match(one(r.home, act('place', 'seek', {spot: 'living.basket.slot-4'})).entry.why, /翻过 3 格/);
  assert.equal(one(r.home, act('place', 'seek', {spot: 'living.basket.slot-4'}), ctx({day: '2026-10-27'})).entry.ok, true);
  // Her diary: he came, and what he turned over.
  assert.ok(machineDiary(r.home).some(l => l.text.startsWith('小桦来过：翻了客厅 · 编织篮 · 折毯下左后；翻了客厅 · 编织篮 · 折毯下左前，找到了你藏的一封信')));
  // Moved by her own hand before he found it, it isn't for him any more; one he found keeps the find.
  assert.equal(unstash(letter).stash, undefined);
  assert.deepEqual(unstash(found).stash, found.stash);
});

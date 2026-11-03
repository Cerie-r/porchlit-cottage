import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {registerOutfits, extraOutfits, outfitsFor, builtAs, sewnOutfit, sewnOutfits, setSewnOutfits, setSewnPreview, isHomeOutfit} from '../body/outfit-registry.js';
import {cleanWardrobe, publicLook} from '../body/wardrobe-state.js';
import {fromCapsules} from '../body/drawn.js';
import {sewablePatterns, patternName, patternPicture, colorsOf, sewnGarment, disposeSewn} from '../body/sewn.js';
import {createOutfits} from '../body/outfits.js';
import {cleanTailor, freshTailor, workOn, finishDraft, unpick, wearInstead, unpickAt, formPiece, registerSewn, sewnEntries, MAX_MADE} from '../src/tailor-state.js';
import {diaryDays} from '../src/diary-days.js';

const day = '2026-10-26', rose = {main: '#f2cdd2', accent: '#b5617b', trim: '#fff8f5'};
const sewn = (n, more = {}) => ({id: 'sewn-' + String(n).padStart(6, 'a'), pattern: 'dress', wearer: 'girl', colors: rose, name: '樱花小裙', by: {kind: 'self'}, on: day, ...more});
const self = {kind: 'self'};
// A home's own outfit, as if it came from src/ours/ (registered here, the way src/ours-pack.js does).
const homeGown = () => {const g = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(.1, .1, .1), new T.MeshStandardMaterial({name: 'main', color: '#ffffff'})); g.add(m); return g;};

test('a home with nothing sewn yet has an empty tailor, and an older save opens with one', () => {
  assert.deepEqual(freshTailor(), {made: [], draft: null});
  for (const raw of [undefined, null, 'x', 3, [], {}, {made: 'no', draft: 7}]) assert.deepEqual(cleanTailor(raw), {made: [], draft: null});
});

test('reading the tailor keeps every piece it can read, once, and leaves out what it can not', () => {
  const ok = sewn(1, {note: '周末去看花穿', colors: {main: '#F2CDD2', accent: '#B5617B', trim: '#FFF8F5'}});
  const raw = {made: [
    ok, {...ok}, // the same piece twice
    sewn(2, {id: 'dress'}), sewn(3, {id: 'sewn-ab'}), sewn(4, {wearer: 'cat'}), sewn(5, {colors: {main: 'red', accent: '#000000', trim: '#000000'}}),
    sewn(6, {name: '   '}), sewn(7, {name: 'x'.repeat(21)}), sewn(8, {on: 'today'}), sewn(9, {by: {kind: 'guest', name: 'a'}}), sewn(10, {pattern: '../x'}),
    sewn(11, {by: {kind: 'machine', name: '小机'}, note: 'n'.repeat(41)}), null, 'sewn-aaaaa12'
  ], draft: {pattern: 'coat', wearer: 'boy', colors: rose, name: '', note: '帮我配个扣子', by: self, on: day}};
  const t = cleanTailor(raw);
  assert.deepEqual(t.made.map(m => m.id), [ok.id, sewn(11).id]);
  assert.deepEqual(t.made[0].colors, rose, 'colours are kept in lower case');
  assert.equal(t.made[0].note, '周末去看花穿');
  assert.equal('note' in t.made[1], false, 'a note too long is left out, the piece is kept');
  assert.deepEqual(t.made[1].by, {kind: 'machine', name: '小机'});
  assert.deepEqual(t.draft, {pattern: 'coat', wearer: 'boy', colors: rose, name: '', note: '帮我配个扣子', by: self, on: day});
  assert.deepEqual(cleanTailor(t), t, 'reading it again changes nothing');
  assert.deepEqual(JSON.parse(JSON.stringify(t)), t, 'it is plain data');
});

test('there is room for MAX_MADE pieces sewn at home: more are not kept, and none can be finished then', () => {
  const made = Array.from({length: MAX_MADE + 5}, (_, i) => sewn(i + 1));
  const t = cleanTailor({made, draft: {pattern: 'dress', wearer: 'girl', colors: rose, name: '再一件'}});
  assert.equal(t.made.length, MAX_MADE);
  assert.deepEqual(t.made.map(m => m.id), made.slice(0, MAX_MADE).map(m => m.id), 'the oldest stay');
  const r = finishDraft(t, {day});
  assert.match(r.error, /40/);
  assert.deepEqual(r.tailor, t, 'nothing changes');
});

test('a piece cut from a home\'s own pattern that has not come yet is kept as it is, and shown once it has', () => {
  // The save as it is while the home's own things are still on their way: its pattern isn't registered.
  const late = sewn(1, {pattern: 'test-late-gown'}), saved = {made: [late], draft: {pattern: 'test-late-gown', wearer: 'girl', colors: rose, name: '睡裙改的'}};
  const t = cleanTailor(saved);
  assert.deepEqual(t, cleanTailor(JSON.parse(JSON.stringify(saved))));
  assert.deepEqual(t.made, [late], 'not one piece is lost');
  assert.equal(t.draft.pattern, 'test-late-gown', 'nor what is on the form');
  registerSewn(t);
  assert.ok(sewnOutfit(late.id), 'registered all the same');
  assert.equal(outfitsFor('girl').includes(late.id), false, 'but not offered while its pattern is away');
  assert.equal(cleanWardrobe({girl: {outfit: late.id}}).girl.outfit, 'dress', 'a look shows the base outfit meanwhile');
  assert.deepEqual(cleanTailor(workOn(t, {note: '先放着'}, {day})).made, [late], 'working on the form meanwhile keeps it too');
  // ...and then they come.
  registerOutfits([{id: 'test-late-gown', name: '睡裙', wearers: ['girl'], build: homeGown}]);
  assert.ok(isHomeOutfit('test-late-gown'));
  assert.ok(outfitsFor('girl').includes(late.id), 'offered once its pattern is here');
  assert.equal(cleanWardrobe({girl: {outfit: late.id}}).girl.outfit, late.id);
  assert.deepEqual(builtAs(late.id), {id: 'test-late-gown', colors: rose});
  setSewnOutfits([]);
});

test('what is sewn is worn like any other outfit, by the one it was made for', () => {
  const her = sewn(1), his = sewn(2, {pattern: 'coat', wearer: 'boy', name: '雾蓝外套'});
  registerSewn({made: [her, his]});
  assert.deepEqual(sewnOutfits().map(s => s.id), [her.id, his.id]);
  assert.equal(outfitsFor('girl').at(-1), her.id, 'after the outfits she has');
  assert.equal(outfitsFor('girl')[0], 'dress', 'the base one still first');
  assert.equal(outfitsFor('girl').includes(his.id), false);
  assert.ok(outfitsFor('boy').includes(his.id));
  const w = cleanWardrobe({girl: {outfit: her.id}, boy: {outfit: her.id}});
  assert.equal(w.girl.outfit, her.id);
  assert.equal(w.boy.outfit, 'coat', 'not by the other one');
  assert.deepEqual(builtAs(her.id), {id: 'dress', colors: rose});
  assert.deepEqual(builtAs('dress'), {id: 'dress', colors: null});
  assert.deepEqual(sewnEntries({made: [her]}), [{id: her.id, pattern: 'dress', wearer: 'girl', colors: rose, name: '樱花小裙'}], 'only what the wardrobe needs');
  setSewnOutfits([]);
  assert.equal(cleanWardrobe({girl: {outfit: her.id}}).girl.outfit, 'dress', 'unpicked, it is gone from the wardrobe');
});

test('standing up in what is on the form: worn while trying it, and never one of those sewn', () => {
  setSewnPreview({id: 'tailor-preview', pattern: 'dress', wearer: 'girl', colors: rose, name: ''});
  assert.ok(outfitsFor('girl').includes('tailor-preview'));
  assert.equal(cleanWardrobe({girl: {outfit: 'tailor-preview'}}).girl.outfit, 'tailor-preview');
  assert.deepEqual(builtAs('tailor-preview'), {id: 'dress', colors: rose});
  assert.equal(sewnOutfits().length, 0);
  setSewnOutfits([sewn(1)]);
  assert.ok(outfitsFor('girl').includes('tailor-preview'), 'registering what is sewn leaves it');
  setSewnPreview(null);
  assert.equal(outfitsFor('girl').includes('tailor-preview'), false);
  setSewnOutfits([]);
});

test('outside the home, an outfit sewn there shows as its pattern, and its pattern goes by the rules for it', () => {
  registerOutfits([{id: 'test-home-nightie', name: '小睡裙', wearers: ['girl'], build: homeGown, homeOnly: 'dress'}]);
  const plain = sewn(1), cosy = sewn(2, {pattern: 'test-home-nightie', name: '粉睡裙'}), his = sewn(3, {pattern: 'coat', wearer: 'boy'});
  registerSewn({made: [plain, cosy, his]});
  const look = kind => cleanWardrobe({[kind]: {outfit: kind === 'boy' ? his.id : plain.id}})[kind];
  assert.equal(publicLook('girl', look('girl')).outfit, 'dress');
  assert.equal(publicLook('boy', look('boy')).outfit, 'coat');
  const night = cleanWardrobe({girl: {outfit: cosy.id}}).girl;
  assert.equal(night.outfit, cosy.id);
  assert.equal(publicLook('girl', night).outfit, 'dress', 'cut from something worn only at home: what that shows as');
  assert.equal(JSON.stringify(publicLook('girl', night)).includes('sewn-'), false, 'nothing of it is left in the look');
  setSewnOutfits([]);
});

test('what may be sewn: the base outfit, a gift once it is out and a home\'s own; nothing from the capsule machine', () => {
  registerOutfits([{id: 'test-own-dress', name: '自己的裙子', wearers: ['girl'], build: homeGown}]);
  for (const kind of ['girl', 'boy']) {
    const ids = sewablePatterns(kind, day);
    assert.equal(ids[0], kind === 'boy' ? 'coat' : 'dress');
    for (const id of ids) assert.equal(fromCapsules(id), false, `${id} comes out of the capsule machine`);
    for (const o of extraOutfits.filter(o => o.wearers?.includes(kind))) {
      if (fromCapsules(o.id)) assert.equal(ids.includes(o.id), false, `${o.id} is drawn as it is`);
      if (o.gift && (!o.outOn || o.outOn <= day)) assert.ok(ids.includes(o.id), `${o.id}, a gift out by then`);
      if (o.gift && o.outOn && o.outOn > '2026-01-01') assert.equal(sewablePatterns(kind, '2026-01-01').includes(o.id), false, `${o.id} isn't out on New Year's Day`);
    }
  }
  assert.ok(sewablePatterns('girl', day).includes('test-own-dress'));
  assert.equal(sewablePatterns('boy', day).includes('test-own-dress'), false);
  assert.ok(extraOutfits.some(o => o.gift), 'there is a gift to sew from');
  registerSewn({made: [sewn(1)]});
  assert.equal(sewablePatterns('girl', day).some(id => id.startsWith('sewn-')), false, 'a sewn one is not a pattern');
  setSewnOutfits([]);
  assert.equal(patternName('dress'), '奶油长裙');
  assert.equal(patternName('coat'), '炭灰外套');
  assert.equal(patternPicture('dress'), '/wardrobe/outfit-dress.webp');
  const gift = extraOutfits.find(o => o.gift);
  assert.equal(patternPicture(gift.id), `/wardrobe/outfit-${gift.id}.webp`);
  assert.equal(patternName(gift.id), gift.name);
});

test('working on the dress form, and finishing what is on it', () => {
  let t = freshTailor();
  assert.equal(finishDraft(t, {day}).error, '人台上还没有衣服');
  t = workOn(t, {pattern: 'dress', wearer: 'girl', colors: rose, name: ''}, {day});
  assert.deepEqual(t.draft, {pattern: 'dress', wearer: 'girl', colors: rose, name: '', by: self, on: day});
  assert.equal(finishDraft(t, {day}).error, '先给它起个名字');
  t = workOn(t, {name: ' 樱花小裙 ', note: '周末去看花穿'}, {day: '2026-10-27', by: {kind: 'machine', name: '小机'}});
  assert.deepEqual(t.draft.by, {kind: 'machine', name: '小机'}, 'who carried on with it last');
  assert.equal(t.draft.on, '2026-10-27');
  assert.equal(t.draft.name, '樱花小裙');
  const r = finishDraft(t, {day: '2026-10-28', id: 'sewn-abcdef01'});
  assert.equal(r.error, undefined);
  assert.deepEqual(r.made, {id: 'sewn-abcdef01', pattern: 'dress', wearer: 'girl', colors: rose, name: '樱花小裙', by: self, on: '2026-10-28', note: '周末去看花穿'});
  assert.equal(r.tailor.draft, null, 'the form is free again');
  assert.deepEqual(r.tailor.made, [r.made]);
  assert.deepEqual(formPiece(r.tailor), r.made, 'the form shows the one just finished');
  assert.equal(formPiece(freshTailor()), null);
  const ids = new Set([finishDraft(t, {day}).made.id, finishDraft(t, {day}).made.id]);
  assert.equal(ids.size, 2, 'each one its own id');
  for (const id of ids) assert.match(id, /^sewn-[a-z0-9]{6,24}$/);
});

test('unpicking: gone from the tailor and the wardrobe, and whoever had it on wears its pattern again', () => {
  const her = sewn(1), his = sewn(2, {pattern: 'coat', wearer: 'boy'}), home = {tailor: {made: [her, his], draft: null}, residents: {wardrobeV1: {}, girlOutfit: her.id}, furniture: {}};
  registerSewn(home.tailor);
  const wardrobe = cleanWardrobe({girl: {outfit: her.id, hairColor: '#806455'}, boy: {outfit: 'coat'}});
  assert.deepEqual(unpick(home.tailor, her.id).made, [his]);
  assert.deepEqual(wearInstead(wardrobe, her.id, 'dress').girl, {...wardrobe.girl, outfit: 'dress'});
  assert.deepEqual(wearInstead(wardrobe, her.id, 'dress').boy, wardrobe.boy);
  const r = unpickAt(home, her.id, wardrobe);
  assert.deepEqual(r.home.tailor.made, [his]);
  assert.equal(r.wardrobe.girl.outfit, 'dress');
  assert.equal(r.home.residents.wardrobeV1.girl.outfit, 'dress');
  assert.equal(r.home.residents.girlOutfit, 'dress');
  assert.equal(r.home.furniture, home.furniture, 'nothing else changes');
  const nobody = unpickAt(home, his.id, wardrobe);
  assert.equal(nobody.wardrobe, null, 'nobody had it on: the wardrobe is left as it is');
  assert.equal(nobody.home.residents, home.residents);
  assert.deepEqual(unpickAt(home, 'sewn-zzzzzzzz', wardrobe), {home, wardrobe: null});
  setSewnOutfits([]);
});

test('the diary tells of each outfit sewn, on its day', () => {
  const state = {tailor: {made: [sewn(1), sewn(2, {pattern: 'coat', wearer: 'boy', name: '雾蓝外套', on: '2026-10-27'}), sewn(3, {name: '给你的', by: {kind: 'machine', name: 'Wren'}, on: '2026-10-27'})]}};
  const days = diaryDays(state, {him: '他'});
  assert.deepEqual(days.map(d => d.day), [day, '2026-10-27']);
  assert.deepEqual(days[0].lines, [{kind: 'made', text: '给自己做了一件衣服「樱花小裙」'}]);
  assert.deepEqual(days[1].lines.map(l => l.text), ['给他做了一件衣服「雾蓝外套」', 'Wren 给你做了一件衣服「给你的」']);
  const his = diaryDays({...state, residents: {wardrobeV1: {playerKind: 'boy'}}}, {him: '她'});
  assert.equal(his[0].lines[0].text, '给她做了一件衣服「樱花小裙」', 'from his side');
});

test('a sewn garment is its pattern\'s, the same shape in colours of its own; the pattern is not touched', () => {
  const {dress} = createOutfits(), before = colorsOf(dress);
  assert.deepEqual(before, {main: '#eee5d6', accent: '#897469', trim: '#faf4e8'});
  const g = sewnGarment(dress, rose), meshes = [], own = [];
  dress.traverse(m => { if (m.isMesh) meshes.push(m); });
  g.traverse(m => { if (m.isMesh) own.push(m); });
  assert.equal(own.length, meshes.length);
  own.forEach((m, i) => {
    assert.equal(m.geometry, meshes[i].geometry, 'the same shape, fitted once');
    assert.notEqual(m.material, meshes[i].material, 'materials of its own');
    assert.equal(m.name, meshes[i].name, 'named the same, so it moves the same');
  });
  assert.deepEqual(colorsOf(g), rose);
  assert.deepEqual(colorsOf(dress), before);
  disposeSewn(g);
  assert.deepEqual(colorsOf(dress), before);
});

test('a home from before the tailor\'s corner gets it beside the craft bench, or nearby when something stands there', async () => {
  const {tailorSpot} = await import('../src/tailor-place.js');
  const {floorPieces, overlapDepth, builtPieces} = await import('../src/furniture-range.js');
  const {starters} = await import('../src/brick-recipe.js');
  const at = (x, z) => ({position: [x, 0, z], rotationY: 0});
  const study = {studyDesk: at(0, 0), studyShelf: at(0, 0), studyReading: at(0, 0), studyPrinter: at(0, 0), studyCraft: at(0, 0), studyRug: at(0, 0)};
  assert.ok(floorPieces.studyTailor, 'it moves like the other furniture');
  assert.deepEqual(tailorSpot(study, []), at(0, 0), 'where it is drawn, when that is free');
  // The bench pushed right up to the open side: the corner steps forward along it.
  const pushed = {...study, studyCraft: at(1.2, 0)};
  const moved = tailorSpot(pushed, []);
  assert.notDeepEqual(moved, at(0, 0));
  assert.ok(overlapDepth('studyTailor', moved, 'studyCraft', pushed.studyCraft) <= .05, 'clear of the bench');
  // A chair built and stood in that corner.
  const chair = {...starters.chair.recipe(), id: 'c1', location: 'room', floor: '2F', room: 'study', position: [4.4, .012, -3], rotationY: 0, support: null};
  const [b] = builtPieces([chair], '2F', 'study');
  assert.ok(b, 'the chair stands on the study floor');
  const round = tailorSpot(study, [chair]);
  assert.notDeepEqual(round, at(0, 0));
  assert.ok(overlapDepth('studyTailor', round, b.spec, b.item) <= .05, 'clear of the chair');
  // Nowhere free: where it is drawn, as before.
  const crowded = [-3.05, -1.45, -.15].map((z, i) => ({...chair, id: 'c' + i, position: [4.4, .012, z]}));
  assert.deepEqual(tailorSpot(study, crowded), at(0, 0));
});

test('until it is given a name of its own, what is on the form goes by its colour and what it is', async () => {
  const {autoName, renamed, colourName, SETS, SWATCHES} = await import('../src/tailor-names.js');
  const own = {main: '#eee5d6', accent: '#897469', trim: '#faf4e8'}, set = name => SETS.find(([n]) => n === name)[1];
  assert.equal(autoName({pattern: 'dress', colors: own}, own), '奶油长裙', 'in its own colours, the pattern\'s name');
  assert.equal(autoName({pattern: 'dress', colors: set('樱花')}, own), '樱花长裙');
  assert.equal(autoName({pattern: 'coat', colors: set('雾蓝')}), '雾蓝外套');
  const gift = extraOutfits.find(o => o.gift && o.wearers.includes('girl'));
  assert.equal(autoName({pattern: gift.id, colors: set('鼠尾草')}), '鼠尾草' + gift.name);
  assert.equal(autoName({pattern: 'dress', colors: {...own, main: '#c4d0db'}}, own), '雾蓝长裙', 'a colour of her own: the nearest swatch');
  assert.equal(colourName('#232229'), '墨黑');
  assert.equal(colourName('nope'), '');
  assert.equal(new Set(SWATCHES.map(([, n]) => n)).size, SWATCHES.length, 'each swatch a name of its own');
  for (const [name] of SETS) assert.ok(name.length <= 4);
  const d = {pattern: 'dress', colors: set('樱花')};
  assert.equal(renamed({...d, name: ''}), false);
  assert.equal(renamed({...d, name: '樱花长裙'}), false);
  assert.equal(renamed({...d, name: '奶油长裙'}), false, 'its pattern\'s name too');
  assert.equal(renamed({...d, name: '周末的裙子'}), true);
});

test('lace and pearls go with what is on the form, into what is finished, and to the wardrobe', async () => {
  const {cleanTrims, trimsKey} = await import('../body/trims.js');
  let t = workOn(freshTailor(), {pattern: 'dress', wearer: 'girl', colors: rose, name: '蕾丝小裙', lace: ['cuffs', 'hem', 'cuffs', 'sleeves'], pearls: true}, {day});
  assert.deepEqual(t.draft.lace, ['hem', 'cuffs'], 'each edge once, in their own order; anything else left out');
  assert.equal(t.draft.pearls, true);
  assert.deepEqual(cleanTailor(workOn(t, {lace: [], pearls: false}, {day})).draft, {pattern: 'dress', wearer: 'girl', colors: rose, name: '蕾丝小裙', by: self, on: day}, 'taken off again, nothing is left of them');
  assert.equal('pearls' in cleanTailor({draft: {...t.draft, pearls: 'yes'}}).draft, false);
  const r = finishDraft(t, {day, id: 'sewn-lace0001'});
  assert.deepEqual(r.made, {id: 'sewn-lace0001', pattern: 'dress', wearer: 'girl', colors: rose, name: '蕾丝小裙', by: self, on: day, lace: ['hem', 'cuffs'], pearls: true});
  assert.deepEqual(cleanTailor(JSON.parse(JSON.stringify(r.tailor))), r.tailor, 'kept as plain data');
  const plain = sewn(2);
  assert.deepEqual(sewnEntries({made: [r.made, plain]}), [
    {id: 'sewn-lace0001', pattern: 'dress', wearer: 'girl', colors: rose, name: '蕾丝小裙', trims: {lace: ['hem', 'cuffs'], pearls: true}},
    {id: plain.id, pattern: 'dress', wearer: 'girl', colors: rose, name: '樱花小裙'}
  ]);
  registerSewn({made: [r.made, plain]});
  assert.deepEqual(builtAs('sewn-lace0001'), {id: 'dress', colors: rose, trims: {lace: ['hem', 'cuffs'], pearls: true}});
  assert.deepEqual(builtAs(plain.id), {id: 'dress', colors: rose}, 'one with none is built as before');
  setSewnOutfits([]);
  assert.equal(cleanTrims({lace: ['x'], pearls: 1}), null);
  assert.equal(trimsKey(null), '');
  assert.notEqual(trimsKey({lace: ['hem']}), trimsKey({lace: ['hem'], pearls: true}));
});

test('trimmed, a garment has lace along its hem, its collar and its cuffs, and pearl buttons: on every pattern that may be sewn', async () => {
  const {addTrims} = await import('../body/trims.js');
  const {weightsAt} = await import('../body/avatar-rig.js');
  const all = createOutfits(), box = m => new T.Box3().setFromObject(m);
  const ids = ['dress', 'coat', ...extraOutfits.filter(o => o.gift && !fromCapsules(o.id)).map(o => o.id)];
  assert.ok(ids.length >= 4);
  for (const id of ids) {
    const g = all[id], bottom = box(g).min.y;
    const made = addTrims(g, {lace: ['hem', 'collar', 'cuffs'], pearls: true}), named = n => made.filter(m => m.name === n);
    assert.ok(named('lace-hem').length >= 1, `${id}: a hem`);
    assert.ok(named('lace-collar').length >= 1, `${id}: a collar`);
    assert.deepEqual(named('lace-cuff').map(m => Math.sign(box(m).getCenter(new T.Vector3()).x)).sort(), [-1, 1], `${id}: a cuff on each arm`);
    for (const m of named('lace-hem')) assert.ok(box(m).max.y < .95 && box(m).min.y > bottom, `${id}: the hem low on the garment, above the feet`);
    for (const m of named('lace-collar')) assert.ok(box(m).min.y > 1.2, `${id}: the collar up round the neck`);
    for (const m of made) {
      assert.equal(m.userData.trim, true);
      assert.ok(m.geometry.attributes.position.count > 0);
      assert.ok(['lace', 'pearl'].includes(m.material.name), 'its own colour, whatever the garment is painted');
    }
    const pearls = [];
    g.traverse(m => { if (m.isMesh && (m.material.name === 'pearl')) pearls.push(m); });
    assert.ok(pearls.length >= 2, `${id}: pearl buttons`);
  }
  // Each moves with what it is sewn to.
  assert.equal(weightsAt(.3, .2, .2, 'lace-hem').some(([bone]) => bone > 0), true, 'a hem low down bends with the legs');
  assert.deepEqual(weightsAt(.5, .95, .05, 'lace-cuff').map(([bone]) => bone), [0, 6], 'a cuff swings with its arm');
  assert.deepEqual(weightsAt(0, 1.3, .2, 'lace-collar'), [[0, 1]]);
  assert.deepEqual(weightsAt(0, 1.2, .3, 'pearl-button'), [[0, 1]]);
  // The buttons a pattern has are what turn to pearl.
  let buttons = 0;
  all.dress.traverse(m => { if (m.isMesh && m.name === 'button') { buttons++; assert.equal(m.material.name, 'pearl'); } });
  assert.equal(buttons, 2);
  assert.deepEqual(addTrims(createOutfits().dress, null), [], 'nothing to put on, nothing changes');
});

test('a sewn garment with trims has them of its own: the pattern is not touched, and they go with it', () => {
  const {dress} = createOutfits(), count = g => { let n = 0; g.traverse(m => { if (m.isMesh) n++; }); return n; }, before = count(dress);
  const g = sewnGarment(dress, rose, {lace: ['hem'], pearls: true}), trims = [];
  g.traverse(m => { if (m.isMesh && m.userData.trim) trims.push(m); });
  assert.equal(count(dress), before, 'the pattern has no lace');
  dress.traverse(m => { if (m.isMesh && m.name === 'button') assert.equal(m.material.name, 'trim', 'nor pearls'); });
  assert.ok(trims.length >= 1);
  assert.deepEqual(colorsOf(g), rose);
  let gone = 0;
  for (const m of trims) m.geometry.addEventListener('dispose', () => gone++);
  disposeSewn(g);
  assert.equal(gone, trims.length, 'its own shapes go with it');
});

// The diary: what happened at home, one page a day. Each page gathers that
// day's lines from what the home keeps anyway: where he was found and how long
// it took, what was made, what neighbours left at the door and was taken in,
// the desserts eaten together and the ones learned, a puzzle folder opened,
// the morning after a night in bed together, an outfit sewn, what an AI living here did and what of its hiding she
// found (src/machine-acts.js), each trip out together (src/explore-trips.js), drift bottles thrown and opened
// (src/bottles.js). Nothing extra is saved for it.
import {cleanHideSeek, lasted, spotLabels} from './hide-and-seek.js';
import {makerLabel, validDessert} from './dessert-recipe.js';
import {validDish} from './cooking-recipe.js';
import {speciesLooks, normalizeAnimal} from './animal-state.js';
import {speciesName} from './album.js';
import {puzzles} from './puzzle-folder.js';
import {inLine, leading} from './words.js';
import {cleanNights, dayAfter} from './nights.js';
import {cleanCapsules, describePrize, prizeOf} from './capsules.js';
import {cleanTailor} from './tailor-state.js';
import {machineDiary} from './machine-acts.js';
import {cleanExplore, tripLine} from './explore-trips.js';
import {NAMES} from './explore-places.js';
import {bottleDiary} from './bottles.js';

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const isDay = d => typeof d === 'string' && dayPattern.test(d);
const ORDER = ['night', 'seek', 'outing', 'bottle', 'visit', 'found', 'gift', 'made', 'plaza', 'meal', 'learn', 'puzzle'];
const named = (name, plain) => name && name.trim() && name.trim() !== plain ? `「${name.trim()}」` : '';

// What a line says about something made at home, or null for things the
// diary doesn't tell of.
function madeLine(item) {
  if (item.kind === 'animal') {
    const species = normalizeAnimal(item).species;
    return `做了一只${speciesName(species)}${named(item.name, speciesLooks[species]?.name)}`;
  }
  if (item.kind === 'bouquet') return `插了一瓶花${named(item.name, '我的一瓶花')}`;
  if (item.kind === 'build') return `拼好了${named(item.name, '') || '一件拼搭'}`;
  if (item.kind === 'dessert') return `做了一份${item.name?.trim() || '甜品'}`;
  if (item.kind === 'dish') return `做了一盘${item.name?.trim() || '菜'}`;
  return null;
}

// Every day something happened, oldest first: {day, lines: [{kind, text}]}.
// `him` is how the partner is spoken of (他 or 她). With `today`, nothing is
// written on a page that hasn't come yet (the morning after last night).
export function diaryDays(state = {}, {him = '他', today = null} = {}) {
  const days = new Map();
  const add = (day, kind, text) => {
    if (!isDay(day) || !text) return;
    if (!days.has(day)) days.set(day, []);
    days.get(day).push({kind, text});
  };
  for (const night of cleanNights(state.nights)) {
    const morning = dayAfter(night);
    if (!today || morning <= today) add(morning, 'night', `昨晚和${him}一起睡的`);
  }
  for (const e of cleanHideSeek(state.hideSeek).book) add(e.day, 'seek', `在${spotLabels[e.spot]}找到${him}${e.chose ? `（${him}自己挑的地方）` : ''}，找了 ${lasted(e.seconds)}`);
  for (const l of machineDiary(state)) add(l.day, l.kind, l.text);
  // Each time they went out together: where, what came home, what happened on the way.
  for (const t of cleanExplore(state.explore).trips) add(t.day, 'outing', tripLine(t, {names: NAMES, him}));
  // Drift bottles: hers thrown into the sea, and those brought home from the lake, opened.
  for (const l of bottleDiary(state.bottles)) add(l.day, l.kind, l.text);
  // What she made herself (what an AI made for her is in its own line above).
  for (const i of Array.isArray(state.creations) ? state.creations : []) if (i && isDay(i.madeOn) && i.by?.kind !== 'machine') add(i.madeOn, 'made', madeLine(i));
  // Outfits sewn on the tailor's bench, for whichever of the two they were made for.
  const player = state.residents?.wardrobeV1?.playerKind === 'boy' ? 'boy' : 'girl';
  for (const m of cleanTailor(state.tailor).made) {
    const forWhom = m.wearer === player ? '自己' : him;
    add(m.on, 'made', m.by.kind === 'self' ? `给${forWhom}做了一件衣服「${m.name}」` : `${leading(m.by.name)}给${m.wearer === player ? '你' : '自己'}做了一件衣服「${m.name}」`);
  }
  // From the machines on the plaza: a doll out of the claw machine, a note out
// of a capsule, a thing out of a blind box.
  for (const i of Array.isArray(state.creations) ? state.creations : []) {
    if (i?.kind === 'animal' && isDay(i.caught?.on)) add(i.caught.on, 'plaza', `在抓娃娃机抓到一只${speciesName(normalizeAnimal(i).species)}`);
    if (i?.kind === 'note' && isDay(i.capsule?.on)) add(i.capsule.on, 'plaza', '扭蛋里拧出一张纸条');
    if (i?.kind === 'build' && isDay(i.blindbox?.on)) add(i.blindbox.on, 'plaza', `在盲盒机拆到${named(i.name, '') || '一件小东西'}`);
  }
  // Out of the capsule machine: what was drawn, or traded for scraps.
  for (const g of cleanCapsules(state.capsules).got) {
    const d = describePrize(prizeOf(g)), what = !d.name ? '' : d.hair ? `发型「${d.name}」` : `${d.name}${d.way ? `（${d.way}）` : ''}`;
    if (what) add(g.on, 'plaza', g.swap ? `用布头在扭蛋机换了${what}` : `在扭蛋机扭到了${what}`);
  }
  for (const i of Array.isArray(state.creations) ? state.creations : []) if (i?.gift && isDay(i.gift.on)) add(i.gift.on, 'gift', i.kind === 'note' ? `收下了${inLine(i.gift.from)}的纸条` : `收下了${inLine(i.gift.from)}放在门口的「${i.name}」`);
  for (const e of Array.isArray(state.dessertBook) ? state.dessertBook : []) {
    const dish = validDish(e?.recipe);
    if (!validDessert(e?.recipe) && !dish) continue;
    if (e.by?.kind === 'self' && isDay(e.madeOn)) add(e.madeOn, 'made', `做了${dish ? '一盘' : '一份'}${e.recipe.name}`);
    add(e.eatenOn, 'meal', `和${him}一起吃了${e.recipe.name}${e.by?.kind === 'self' ? '' : `，${makerLabel(e.by)}`}`);
  }
  for (const r of Array.isArray(state.dessertRecipes) ? state.dessertRecipes : []) if (validDessert(r?.recipe)) add(r.learnedOn, 'learn', `跟${inLine(r.from)}学会了${r.recipe.name}`);
  for (const [id, day] of Object.entries(state.computer?.solved || {})) if (puzzles[id]) add(day, 'puzzle', `解开了谜题文件夹「${puzzles[id].title}」`);
  return [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, lines]) => ({day, lines: lines.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))}));
}

// "10月24日 · 周六"
export function dateLabel(day) {
  const [y, m, d] = day.split('-').map(Number);
  return `${m}月${d}日 · 周${'日一二三四五六'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`;
}

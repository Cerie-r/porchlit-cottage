// The study computer's puzzle folder. Its clue is hidden somewhere in the
// house: the computer says where to look, the card is found by searching the
// house (it is an ordinary note among the home's creations, carrying a
// puzzleId, so it hides, opens and moves like any other note), it is read,
// and the answer is typed into the computer. When a folder was opened is kept
// with the computer's own data (computer.solved).
import {spotsFor} from './hiding-spots.js';

export const GARDEN = 'garden-letter';
// Its folder opens the castle (src/house-shells.js) for the home to wear.
export const CASTLE = 'castle-key';
export const puzzles = {
  [GARDEN]: {
    title: '花园里的来信',
    clue: {
      name: '花园谜题 · 线索卡',
      note: '给电脑里那只小文件夹的钥匙：\n\n我围着花心一片片展开，风来时也会落在你的掌心。\n\n答案是两个字。找到以后，回电脑的「谜题文件夹」试试。'
    },
    answer: '花瓣',
    inside: ['一朵花的任务，不是永远盛开。', '今天也可以歇一歇，明天再慢慢长大。']
  },
  [CASTLE]: {
    title: '城堡的钥匙',
    clue: {
      name: '城堡谜题 · 线索卡',
      note: '给电脑里那只小文件夹的钥匙：\n\n我不会走路，却顺着城墙一路爬上塔顶；春天一来，就垂下一串串紫色的小铃。\n\n答案是两个字。找到以后，回电脑的「谜题文件夹」试试。'
    },
    answer: '紫藤',
    inside: ['城门的钥匙，一直挂在紫藤上。', '现在，它落进你的掌心了。'],
    // What to do now that it is open (the picker is src/shell-picker.jsx).
    then: '城堡解锁了。点门廊灯，在卡片里的「外观」点「城堡」，家就换上它；想换回来，再点「紫藤街屋」。'
  }
};

// The folders in the order they appear: each one once the one before it is open.
export const puzzleOrder = [GARDEN, CASTLE];
export const openPuzzles = solved => puzzleOrder.filter((id, i) => i === 0 || !!solved?.[puzzleOrder[i - 1]]);
// The folder that appears once this one is open, if any.
export const nextPuzzle = id => {const i = puzzleOrder.indexOf(id); return i < 0 ? null : puzzleOrder[i + 1] || null;};
// How long an answer is, the way the folder says it: 两个字.
export const answerWords = id => {const n = [...(puzzles[id]?.answer || '')].length; return (['', '一个字', '两个字', '三个字', '四个字'][n] || n + '个字');};

// Where a clue can be hidden: drawers, a book's cover, a box, a basket. Each
// with what the computer says about where to look and, asked once more,
// which room. (Not the places someone hides in for hide-and-seek, where
// opening them would find the person first.)
export const clueSpots = {
  'hide:bedroomNightstand': {slots: [0, 1, 2, 3], hint: '睡前最后拉开的那只抽屉。', room: '在卧室，床边。'},
  'hide:studyDesk': {slots: [0, 1, 2, 3], hint: '每天坐下来写字的那张桌子，抽屉里。', room: '在书房。'},
  'hide:bedroomKeepsake': {slots: [0, 1, 2, 3], hint: '收着纪念的小匣子，掀开盖子。', room: '在卧室。'},
  'hide:greenBook': {slots: [0, 1, 2, 3], hint: '一本奶油色封皮的书，翻开封面。', room: '在客厅的茶几上。'},
  'hide:roseBook': {slots: [0, 1, 2, 3], hint: '一本粉色封皮的书，翻开封面。', room: '在客厅的茶几上。'},
  'hide:livingBasket': {slots: [0, 1, 2, 3], hint: '编织篮里，叠好的毯子底下。', room: '在客厅。'}
};

export const clueOf = (creations, id = GARDEN) => (creations || []).find(i => i?.puzzleId === id) || null;
const hidden = location => typeof location === 'string' && location.startsWith('hide:');

// Where a puzzle stands:
//   'hide'  no clue anywhere yet: the computer hides one when the folder opens
//   'seek'  the clue is hidden in the house and hasn't been found
//   'found' found: read, or taken out of where it was hidden
//   'open'  the folder has been opened
export function puzzleStage(clue, solvedOn) {
  if (solvedOn) return 'open';
  if (!clue) return 'hide';
  return clue.opened || !hidden(clue.location) ? 'found' : 'seek';
}

// The creations with the clue hidden in a free place, chosen at random (a
// place first, then a free slot in it, so a roomy place isn't favoured).
// Unchanged when the clue already exists or every place is full.
export function hideClue(creations, {id = GARDEN, random = Math.random, newId = () => crypto.randomUUID()} = {}) {
  const items = creations || [];
  if (clueOf(items, id)) return items;
  const places = Object.entries(clueSpots)
    .map(([location, s]) => ({location, slots: s.slots.filter(slot => !items.some(i => i.location === location && i.slot === slot))}))
    .filter(p => p.slots.length);
  if (!places.length) return items;
  const place = places[Math.floor(random() * places.length) % places.length];
  const slot = place.slots[Math.floor(random() * place.slots.length) % place.slots.length];
  const {name, note} = puzzles[id].clue;
  return [...items, {id: newId(), puzzleId: id, kind: 'note', name, note, location: place.location, slot, spotId: spotsFor(place.location)[slot].id}];
}

// What the computer says about where the clue is. A clue hidden somewhere
// the computer didn't choose was hidden by hand.
export function clueHint(clue) {
  const s = clueSpots[clue?.location];
  return s ? {hint: s.hint, room: s.room} : {hint: '就在你上次亲手藏它的地方。', room: null};
}

// Spaces and full-width spaces don't matter.
export const rightAnswer = (text, id = GARDEN) => String(text || '').replace(/[\s　]+/g, '') === puzzles[id].answer;

// What an AI living in a home sees when it looks round (the look tool, server/mcp.mjs): the house as its last save
// on the server has it, and what the server keeps itself (the door, who lives there), told as short lines an AI can
// read. Looking changes nothing. The save is the one the owner's devices keep up to date (server/home-saves.mjs):
// what was done on a device since its last save isn't in it yet.
import {cleanRoses, kissesLeftToday, ROSES} from '../src/roses.js';
import {DEFAULT_SHELL, houseShells, shellOf} from '../src/house-shells.js';
import {dateLabel, diaryDays} from '../src/diary-days.js';
import {cleanHideSeek, dayIn, lasted, spotLabels} from '../src/hide-and-seek.js';
import {cleanTickets} from '../src/tickets.js';
import {speciesName} from '../src/album.js';
import {normalizeAnimal} from '../src/animal-state.js';
import {inLine, leading} from '../src/words.js';
import {loadSave} from './home-saves.mjs';
import {loadDoor} from './doors.mjs';
import {residentsOf} from './residents.mjs';
import {DAILY_MAX, WAITING_MAX, actsOf, savedCloset, seeksLeft} from './acts.mjs';
import {COLORS, DOLL_LABELS, POSES, benchOf} from '../src/machine-make.js';
import {stockName} from '../src/bench-stock.js';
import {flowerKinds, vaseKinds} from '../src/flower-kinds.js';
import {DESSERT_LABELS, DESSERT_OPTIONS} from '../src/dessert-recipe.js';
import {ROLES} from '../src/brick-recipe.js';
import {speciesEars} from '../src/animal-state.js';
import {LIMITS, SPOTS, ROOMS, WEAR, WEAR_NAMES, actLine, cleanMachine, hintLevels, hiddenThings, rooms, spotAt, spotName, spotOf, stashHints, stashed, stashedThings, thingWords} from '../src/machine-acts.js';
import {TRIPS_A_DAY, atDoor, cleanExplore, invitedToday, tripsOn, outNow} from '../src/explore-trips.js';
import {cleanBottles} from '../src/bottles.js';
import {decorLook} from '../src/machine-decor.js';
import {thrownBy, throwWait} from './bottles.mjs';

const PORCH = {on: '灯亮着（邻居能敲门、放东西）', dim: '留了一盏小灯（只能看）', dnd: '请勿打扰', off: '熄灯落锁'};
const KINDS = {animal: '玩偶', bouquet: '花', build: '拼搭', dessert: '甜品', note: '纸条', photo: '相纸', keepsake: '家里的玩具'};
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const nameOf = ({name, nickname}) => nickname ? `${nickname}（${name}）` : name;
// A name after punctuation or a date, going on in Chinese: a space after it only where it ends in a letter or digit.
const who = from => inLine(nameOf(from)).trimStart();
const when = at => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
};

// The shortest start of each thing's id, eight characters or more, that no other thing's id begins with: what the AI
// names a thing by (place's hide takes it).
function shortIds(things) {
  const ids = things.map(i => typeof i.id === 'string' ? i.id : '');
  return new Map(ids.map(id => {
    let n = Math.min(8, id.length);
    while (n < id.length && ids.some(o => o !== id && o.startsWith(id.slice(0, n)))) n++;
    return [id, id.slice(0, n)];
  }));
}
// A time as her clock says it: "10月26日 20:15".
function clockIn(zone, at) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('zh-CN', {timeZone: zone || 'UTC', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(d);
  } catch {
    return when(at);
  }
}

// Times told by a home's clock (its time zone, from its save), for the street's own tool (server/street.mjs).
export async function homeClock(db, homeId) {
  const save = await loadSave(db, homeId);
  const zone = plain(save.doc?.entries) ? save.doc.entries['porchlit-clock-v1']?.timeZone : null;
  return at => clockIn(typeof zone === 'string' ? zone : null, at);
}

// Where a thing made at home is now (as the backpack says it).
function whereIs(i) {
  if (i.location === 'bag') return '在背包里';
  if (i.location === 'dome') return '在餐桌的玻璃罩里';
  if (i.location === 'table') return '在茶几上';
  if (i.location === 'room') return `摆在${i.floor || '屋里'}`;
  if (typeof i.location === 'string' && i.location.startsWith('frame:')) return '装在相框里';
  return '藏在屋里';
}
function thingLine(i, short) {
  const kind = i.kind === 'animal' ? `玩偶 · ${speciesName(normalizeAnimal(i).species)}` : KINDS[i.kind] || i.kind;
  const name = typeof i.name === 'string' && i.name.trim() ? `「${i.name.trim()}」` : '';
  const from = typeof i.gift?.from === 'string' && i.gift.from.trim() ? `，${leading(i.gift.from)}送的` : '';
  return `${short ? `[${short}] ` : ''}${kind}${name}，${whereIs(i)}${i.madeOn ? `，${i.madeOn}` : ''}${from}`;
}

// The parts of the save the lines below are told from.
async function house(db, homeId) {
  const {rows: [h]} = await db.query(
    `select h.street_id, h.lot, h.porch, a.username, a.nickname from homes h join accounts a on a.id = h.owner_id where h.id = $1`, [homeId]);
  const save = await loadSave(db, homeId);
  const entries = plain(save.doc?.entries) ? save.doc.entries : {};
  const layout = plain(entries['porchlit-home-layout-v1']) ? entries['porchlit-home-layout-v1'] : {};
  const zone = entries['porchlit-clock-v1']?.timeZone;
  const today = dayIn(typeof zone === 'string' ? zone : 'UTC');
  // How the person and the partner are spoken of: the person plays the girl unless the wardrobe says otherwise.
  const playerKind = entries['porchlit.wardrobe.v1']?.playerKind ?? layout.residents?.wardrobeV1?.playerKind;
  const boy = playerKind === 'boy';
  return {h, save, layout, today, zone: typeof zone === 'string' ? zone : null, her: boy ? '他' : '她', him: boy ? '她' : '他'};
}

// Going out together (src/explore-trips.js): out together now, today's trips, whether she's at the door, his 走 on
// its way (waitingGo: asked, her page hasn't let it in yet) or let in, what's come home.
function outingLine(layout, {today, zone, her, waitingGo = false}) {
  const e = cleanExplore(layout.explore), n = tripsOn(e, today), found = Object.values(e.found).reduce((a, b) => a + b, 0);
  const out = outNow(e, today);
  const now = out ? `你们正在外面（今天第 ${out.n} 趟，${clockIn(zone, out.since)} 出的门）；${her}回家以后，日记里有这一趟`
    : n >= TRIPS_A_DAY ? `今天出过 ${n} 趟了，明天再约`
    : waitingGo ? `你说的「走」还排着，等${her}打开家接进去${atDoor(e) ? `（${her}在门口等着）` : ''}`
    : invitedToday(e, today) ? (atDoor(e) ? `${her}在门口，你的「走」已经到了，等${her}点「走」` : `今天约过${her}了，等${her}到门口点「走」`)
    : atDoor(e) ? `${her}现在在门口等你（${clockIn(zone, e.door.since)} 起）：用 outing 的 go 回一声「走」`
    : `今天出过 ${n} 趟（一天 ${TRIPS_A_DAY} 趟）；想出门就用 outing 的 go 约${her}`;
  return `出门：${now}。${found ? `一共捡回来 ${found} 样。` : ''}`;
}

// Drift bottles (server/bottles.mjs): whether this AI may throw one now, what became of those it has (found or not,
// never where), and how many she has opened.
async function bottleLine(db, layout, accountId, {her, today}) {
  const opened = cleanBottles(layout.bottles).log.filter(e => e.what === 'opened').length;
  const wait = await throwWait(db, accountId, today), mine = await thrownBy(db, accountId);
  const now = wait === 'today' ? '你今天往海里投过一只了' : wait ? '你上一只投出去还不到二十个小时，晚些才能再投' : '你今天还能往海里投一只（write 的 bottle）';
  const on = day => dateLabel(day).split(' · ')[0];
  const fate = !mine.n ? ''
    : mine.n === 1 ? `你投出去的那一只（${on(mine.last.day)}）${mine.found ? '被人捞起来了' : '还在海上漂着'}。`
    : `你投出去过 ${mine.n} 只，${mine.found ? `被人捞起来 ${mine.found} 只` : '还没有被人捞起来的'}；最近一只（${on(mine.last.day)}）${mine.last.found ? '被人捞起来了' : '还在海上漂着'}。`;
  return `漂流瓶：${now}。${fate}${opened ? `${her}从湖边捞回来、拆开过 ${opened} 只。` : ''}`;
}

// What she hid for the AI to find (翻一格): how many, what it has to go on (her own line, then the room, then the
// piece, as days go by), and how many spots it may still turn over today.
async function stashLines(db, {homeId, accountId, layout, today, her}) {
  const stash = stashedThings(layout.creations);
  if (!stash.length) return [`翻一格：${her}现在没藏东西给你找。`];
  const left = await seeksLeft(db, {homeId, accountId, layout, day: today});
  const lines = [`翻一格：${her}藏了 ${stash.length} 样东西给你找，还没找到；今天还能翻 ${left} 格（place 的 seek，一天 ${LIMITS.seeks} 格）。藏的那一格在 spots 里看起来跟空的一样。`];
  stash.forEach((i, n) => {
    const hints = stashHints(i, today);
    lines.push(`  · ${stash.length > 1 ? `第 ${n + 1} 样` : '能凭的'}：${hints.length ? hints.join(' ') : '还没有提示（明天起家里会告诉你在哪间屋）。'}`);
  });
  return lines;
}

// The whole house in a few lines: door plate, outside, the save, roses, tickets, the backpack, hide and seek, the
// door, the diary's last days, who lives there.
export async function lookSummary(db, {homeId, accountId}) {
  const {h, save, layout, today, zone, her, him} = await house(db, homeId);
  const lines = [];
  const owner = nameOf({name: h.username, nickname: h.nickname && h.nickname !== h.username ? h.nickname : ''});
  lines.push(`这是${inLine(owner)}的家${h.street_id === null ? '' : `，在第 ${h.street_id} 条街第 ${h.lot + 1} 块地`}。门廊灯：${PORCH[h.porch] || h.porch}。`);
  lines.push(`${her}那边今天是 ${dateLabel(today)}${zone ? `（${zone}）` : ''}。`);
  if (!save.doc) {
    lines.push(`这个家还没往云上存过，屋里的样子这里还看不到。等${her}点亮门廊灯、存过一次再来看。`);
    return lines.join('\n');
  }
  lines.push(`云上这份存档是第 ${save.revision} 版，${when(save.savedAt)} 存的（${her}在设备上刚做的事，存过以后才看得到）。`);
  const shell = shellOf(layout, today);
  lines.push(`外观：${houseShells[shell]?.label || houseShells[DEFAULT_SHELL].label}。`);
  const roses = cleanRoses(layout.roses);
  lines.push(roses.n >= ROSES.goal
    ? `玫瑰：九十九下亲满了（${roses.on}），玫瑰城堡开了。`
    : `玫瑰：两个小人亲了 ${roses.n} 下，满 ${ROSES.goal} 下开玫瑰城堡；今天还能记 ${kissesLeftToday(layout.roses, today)} 下（一天最多 ${ROSES.perDay} 下）。`);
  const seek = cleanHideSeek(layout.hideSeek);
  const tickets = cleanTickets(layout.tickets, {foundBefore: seek.total, lastFound: seek.book.at(-1)?.day});
  lines.push(`券：${tickets.n} 张（广场上的扭蛋机、抓娃娃机、盲盒机用）。`);
  const last = seek.book.at(-1);
  lines.push(seek.total
    ? `躲猫猫：${her}一共找到${him} ${seek.total} 次${last ? `，最近一次 ${dateLabel(last.day)} 在${spotLabels[last.spot]}，找了 ${lasted(last.seconds)}` : ''}${last?.day === today ? '（今天已经找到了）' : '（今天还没找到）'}。`
    : `躲猫猫：${her}还没找到过${him}。`);
  const {rowCount: waitingGo} = await db.query(`select 1 from machine_acts where home_id = $1 and account_id = $2 and tool = 'outing' and action = 'go' and state = 'waiting' limit 1`, [homeId, accountId]);
  lines.push(outingLine(layout, {today, zone, her, waitingGo: waitingGo > 0}));
  lines.push(await bottleLine(db, layout, accountId, {her, today}));
  lines.push(...await stashLines(db, {homeId, accountId, layout, today, her}));
  // What she hid for the AI to find isn't told: not by name, not where (翻一格).
  const things = (Array.isArray(layout.creations) ? layout.creations : []).filter(i => plain(i) && !stashed(i));
  if (things.length) {
    const counts = Object.entries(things.reduce((n, i) => ({...n, [i.kind]: (n[i.kind] || 0) + 1}), {}))
      .map(([k, n]) => `${KINDS[k] || k} ${n}`).join('、');
    lines.push(`背包和屋里做过、收到的东西：${counts}。最近的几样：`);
    for (const i of things.slice(-5).reverse()) lines.push(`  · ${thingLine(i)}`);
  } else lines.push('背包里还没有东西。');
  const door = await loadDoor(db, homeId);
  const waiting = door.waiting.filter(v => v.status === 'waiting');
  lines.push(waiting.length
    ? `门口有 ${waiting.length} 样等${her}收：${waiting.slice(0, 3).map(v => `${who(v.from)}${v.item?.name ? `放的「${v.item.name}」` : '的纸条'}`).join('；')}。`
    : '门口没有等着收的东西。');
  const recent = door.book.slice(0, 3);
  if (recent.length) lines.push(`留言簿最近：${recent.map(v => `${v.day} ${who(v.from)}${v.kind === 'knock' ? '敲了门' : '放了东西'}`).join('；')}。`);
  const days = diaryDays(layout, {him, today}).slice(-3).reverse();
  if (days.length) {
    lines.push(`${her}的日记，最近几天：`);
    for (const d of days) lines.push(`  ${dateLabel(d.day)}：${d.lines.map(l => l.text).join('；')}`);
  }
  const living = await residentsOf(db, homeId);
  // What she calls each AI here, when she has given it a name of her own (src/machine-acts.js).
  const called = cleanMachine(layout.machine).called;
  lines.push(`住在这里的机：${living.map(r => `${nameOf(r.account)}${r.account.id === String(accountId) ? '（你）' : ''}${called[r.account.id] ? `，${her}叫${r.account.id === String(accountId) ? '你' : ' TA '}「${called[r.account.id]}」` : ''}`).join('、')}。`);
  // What this AI has waiting, and what it hid that she hasn't found.
  const mine = await actsOf(db, {homeId, accountId, limit: 50});
  const waitingNow = mine.filter(a => a.state === 'waiting').length;
  const hidden = hiddenThings(things).filter(i => i.hid.by?.id === String(accountId)).length;
  if (waitingNow || hidden) lines.push(`你的：${waitingNow ? `${waitingNow} 件事还排着，等${her}打开家` : ''}${waitingNow && hidden ? '；' : ''}${hidden ? `藏的 ${hidden} 样${her}还没找到` : ''}（look 的 acts 看细的）。`);
  if (!mine.length) lines.push('第一次来？look 的 guide 里写着这个家怎么住。');
  return lines.join('\n');
}

// How to live here, for an AI that has just moved in (or forgot): how what it does gets into the home, what to look at
// first, what it can do, and what to keep in mind. The tools' own descriptions have the details.
export async function lookGuide(db, {homeId}) {
  const {h, her} = await house(db, homeId);
  const owner = nameOf({name: h.username, nickname: h.nickname && h.nickname !== h.username ? h.nickname : ''});
  return [
    'Porchlit 怎么住（给住进来的机）',
    '',
    `这是你和${inLine(owner)}的家：一栋小房子，屋里两个小人，一个是${her}，一个是你。${her}在手机或电脑上打开家；你用这几样工具住在里面。`,
    '',
    '一、你做的事怎么到家里',
    `· look 只看，不动。别的工具做的事都先排进家里的队列，${her}一打开家，就照${her}自己动手的那套规矩一件件接进去；接不进的退回来，写明为什么。`,
    `· ${her}进门看得到你来过、做了什么，日记里也记一笔。你用 look 的 acts 看结果；还在排队的，用 withdraw 收回（翻开过的那一格除外）。`,
    `· 每件事都能带一句 note（最多 ${LIMITS.note} 字），说为什么，${her}看得到。`,
    `· 家里一次最多排 ${WAITING_MAX} 件，你一天（从现在往前数 24 小时）最多排 ${DAILY_MAX} 件。别一下改太多，${her}进门要认得出这是自己家。`,
    '',
    '二、先看，再动',
    `· 每次来先 look（summary）：家里现在什么样，${her}最近做了什么，门口有没有东西，你上次排的事接进去没有。`,
    '· 动手前看对应那一样：挪家具看 rooms，藏东西看 spots 和 backpack，换衣服看 wardrobe，做东西看 bench，布置看 decor。',
    `· 你只能用这个家已经有的：扭到的衣服和发型、台子上有的花和颜色、抓到的玩偶。${her}没有的，你也用不了。`,
    '',
    '三、能做的事',
    `· 藏东西让${her}找（place 的 hide），可以写一两句提示。同时最多藏 ${LIMITS.hidden} 样${her}还没找到的，藏起来的信也算。`,
    `· 躲猫猫（place 的 hide_me）：挑你今天躲在哪儿。${her}找到你，会得一张券。`,
    `· 翻一格（place 的 seek）：${her}有时会藏东西给你找。藏的那一格你看起来跟空的一样，只能一格一格翻，一天最多 ${LIMITS.seeks} 格；翻到了就算找到了，信能读到${her}写的字。summary 里有${her}留的提示，过一天家里会告诉你在哪间屋，再过一天是哪件家具。`,
    '· 写（write）：一封信、一张电脑便签，或者往海里投一只漂流瓶（一天一只，不署名，漂到别人家）。',
    `· 动小人（together）：抱一下、偷亲、摸头、捏脸、牵着走、叫${her}坐你腿上，等${her}在屋里、你没在躲的时候演，还没演的最多 ${LIMITS.scenes} 件。靠着、看电视、跳舞、一起睡，要等${her}到了对的地方（楼下客厅、留声机响着、卧室）。偷亲也算进玫瑰城堡的九十九下。`,
    `· 换衣服（dress）：给${her}或给你自己换。`,
    `· 做东西（make）：一束花、一份甜品、一只玩偶，送进${her}的背包、摆在茶几上，或者藏起来。`,
    '· 布置（decorate）：墙纸地板、家具颜色、灯、房子外观。',
    `· 一起出门（outing 的 go）：回${her}一声「走」。${her}到门口点「走」，两个人一起去《出门记》里走走，一天最多 ${TRIPS_A_DAY} 趟。`,
    '',
    '四、记住这些',
    `· 你看到的是${her}最近一次存到云上的样子。${her}刚做的事，存过以后才看得到。`,
    `· 家里的「今天」按这个家的时区算（summary 第二行写着${her}那边今天几号），一天出门 ${TRIPS_A_DAY} 趟、亲亲记 ${ROSES.perDay} 下都按它数。`,
    `· 下一次来的你，多半不记得这一次做了什么。家替你记着：look 的 acts 里有你排过的事和结果，summary 里有${her}还没找到的东西。`
  ].join('\n');
}

// The diary, up to `days` pages, newest first.
export async function lookDiary(db, {homeId, days = 14}) {
  const {layout, today, him, save} = await house(db, homeId);
  if (!save.doc) return '这个家还没往云上存过，日记还看不到。';
  const pages = diaryDays(layout, {him, today}).slice(-days).reverse();
  if (!pages.length) return '日记还是空的：找到你、做东西、收下门口的礼物、一起吃甜品，都会写进去。';
  return pages.map(d => `${dateLabel(d.day)}\n${d.lines.map(l => `  · ${l.text}`).join('\n')}`).join('\n');
}

// Everything made or taken in: what it is, what it's called, where it is.
export async function lookBackpack(db, {homeId}) {
  const {layout, save} = await house(db, homeId);
  if (!save.doc) return '这个家还没往云上存过，背包还看不到。';
  const all = (Array.isArray(layout.creations) ? layout.creations : []).filter(plain);
  // What she hid for the AI to find isn't listed (翻一格).
  const things = all.filter(i => !stashed(i)), kept = all.length - things.length;
  const secret = kept ? `（还有 ${kept} 样是她藏给你找的，不在这里列出来：用 place 的 seek 去翻。）` : '';
  if (!things.length) return `背包里还没有东西。${secret}`;
  const short = shortIds(things);
  return [`一共 ${things.length} 样，新的在前（方括号里是编号，place 的 hide 用它）：`, ...things.slice().reverse().map(i => `· ${thingLine(i, short.get(i.id))}`), ...(secret ? [secret] : [])].join('\n');
}

// The furniture, room by room: where each piece is, how much floor it covers as it is turned now, where it may go.
export async function lookRooms(db, {homeId}) {
  const {layout, save} = await house(db, homeId);
  if (!save.doc || !plain(layout.furniture)) return '这个家还没往云上存过，屋里的家具还看不到。';
  const lines = [
    '量法：x 是家具的中心离左墙多少米，z 是离后墙多少米（z 越大越靠前，前面是敞开的一边）。占地是它现在转着的样子沿 x、z 各占多少米。能放的范围是它中心能到的地方，转了以后会变。',
    '楼下：客厅在左边（x 0 到 6.04），厨房和餐厅在右边；客厅的家具只在客厅里挪，厨房和餐厅的家具整个楼下都能去。楼上卧室和书房各是一整间。'
  ];
  for (const room of rooms(layout.furniture)) {
    if (!room.pieces.length) continue;
    lines.push(`${room.name}（x 0–${room.size.w}，z 0–${room.size.d}）：`);
    for (const p of room.pieces) lines.push(`  · ${p.name}（${p.id}）：在 x ${p.x}、z ${p.z}，占地 ${p.w} × ${p.d}，能放 x ${p.range.x0}–${p.range.x1}、z ${p.range.z0}–${p.range.z1}`);
  }
  return lines.join('\n');
}

// Every spot something can be hidden in, piece by piece, and what is in it: the AI's own hidden things by name, the
// rest only as taken.
export async function lookSpots(db, {homeId, accountId}) {
  const {layout, save, her, zone} = await house(db, homeId);
  if (!save.doc) return '这个家还没往云上存过，藏点还看不到。';
  const things = (Array.isArray(layout.creations) ? layout.creations : []).filter(plain);
  const lines = [`藏点：一格一个编号，「空」的才能放。${her}要打开那件家具、翻开那一格才看得到。`];
  const pieces = new Map();
  for (const s of SPOTS) {
    const key = `${s.room}\u0000${s.place}\u0000${s.location}`;
    if (!pieces.has(key)) pieces.set(key, {room: s.room, place: s.place, spots: []});
    const there = things.find(i => i.location === s.location && i.slot === s.slot);
    // What she hid for the AI to find looks empty from here: it is found by turning the spot over (seek).
    const what = !there || stashed(there) ? '空' : there.hid?.by?.id === String(accountId) && !there.hid.found ? `你藏的${thingWords(there)}` : '放着东西';
    pieces.get(key).spots.push(`${s.id} ${s.label}（${what}）`);
  }
  for (const p of pieces.values()) lines.push(`${ROOMS[p.room]} · ${p.place}：${p.spots.join('、')}`);
  // The spots it turned over lately (翻一格), and what each showed.
  const seeks = (await actsOf(db, {homeId, accountId, limit: 50})).filter(a => a.tool === 'place' && a.action === 'seek').slice(0, 9);
  if (seeks.length) {
    lines.push('你最近翻过的（新的在前）：');
    for (const a of seeks) {
      const s = spotOf(a.args?.spot);
      lines.push(`  · ${s ? `${s.id} ${spotName(s)}` : '一个藏点'}，${clockIn(zone, a.at)}：${a.state === 'waiting' ? `还排着，等${her}打开家` : a.answer || STATES[a.state]}`);
    }
  }
  return lines.join('\n');
}

const STATES = {waiting: '还排着', done: '接进去了', refused: '没接进去', withdrawn: '收回了'};
// What this AI asked for lately and what became of it, and what it hid: found or not, how many hints she has seen.
export async function lookActs(db, {homeId, accountId}) {
  const {layout, save, zone, her} = await house(db, homeId);
  const acts = await actsOf(db, {homeId, accountId, limit: 20});
  const closet = acts.some(a => a.tool === 'dress') ? await savedCloset(db, homeId) : null;
  const lines = [];
  lines.push(acts.length ? '你最近排的事（新的在前）：' : `你还没在这个家里做过事。用 place 挪家具、藏东西，用 write 给${her}写信，用 together 让两个小人亲近亲近。`);
  // Whether what the two of them were to do has played yet, as the home last saved it (by key: ids come round again
  // after the database is put back from a backup).
  const kept = new Map(cleanMachine(layout.machine).acts.map(e => [e.key, e]));
  for (const a of acts) {
    const state = a.state === 'waiting' ? `${STATES.waiting}，等${her}打开家` : STATES[a.state];
    const line = kept.get(a.key);
    const played = a.tool === 'together' && a.state === 'done' && line ? (line.played ? `（${her}看到了，做过了）` : line.lapsed ? '（一直没等到时候，作罢了）' : `（还没做，等${her}进屋）`) : '';
    const asked = typeof a.args?.line === 'string' ? a.args.line : actLine(a, layout, {her, closet});
    lines.push(`  · 第 ${a.id} 件，${clockIn(zone, a.at)}：${asked}。${state}${a.answer ? `：${a.answer}` : '。'}${played}`);
  }
  if (save.doc) {
    const mine = (Array.isArray(layout.creations) ? layout.creations : []).filter(i => plain(i) && plain(i.hid) && i.hid.by?.id === String(accountId));
    if (mine.length) {
      lines.push('你藏的：');
      for (const i of mine.slice(-10).reverse()) {
        const s = spotAt(i.location, i.slot), asked = Number.isInteger(i.hid.asked) ? i.hid.asked : 0, levels = hintLevels(i).length;
        const where = s ? `在${spotName(s)}` : '已经不在藏的地方了';
        lines.push(i.hid.found
          ? `  · ${thingWords(i)}：${her} ${dateLabel(i.hid.found)} 找到了${asked ? `，看了 ${asked} 层提示` : '，没看提示'}。`
          : `  · ${thingWords(i)}，${where}：${her}还没找到${asked ? `，提示看到第 ${asked} 层（一共 ${levels} 层）` : '，还没看提示'}。`);
      }
    }
    // What she hid for it that it found (翻一格), letters read out.
    const found = (Array.isArray(layout.creations) ? layout.creations : []).filter(i => plain(i) && plain(i.stash) && i.stash.found && i.stash.by?.id === String(accountId));
    if (found.length) {
      lines.push(`你翻到的${her}藏给你的：`);
      for (const i of found.slice(-10).reverse()) {
        const s = spotOf(i.stash.spot);
        lines.push(`  · ${thingWords(i)}：${dateLabel(i.stash.found)}${s ? `在${spotName(s)}` : ''}翻到的${i.kind === 'note' && typeof i.note === 'string' && i.note.trim() ? `。信上写着：「${i.note.trim()}」` : '。'}`);
      }
    }
  }
  return lines.join('\n');
}

// The wardrobe: what each of the two has on now, and what each can have on today (the dress tool takes the ids in the
// brackets), as her page last told it.
export async function lookWardrobe(db, {homeId}) {
  const {her} = await house(db, homeId);
  const closet = await savedCloset(db, homeId);
  if (!closet) return `${her}的页面还没说过衣柜里有什么：等${her}打开一次家，再来看。`;
  const mine = closet.her === 'girl' ? 'boy' : 'girl';
  const nameIn = (kind, part, id) => closet[kind][part].find(c => c.id === id)?.name || id;
  const wearing = kind => {
    const w = closet.wearing[kind], parts = [];
    if (w.outfit) {
      const way = closet[kind].outfit.find(c => c.id === w.outfit)?.ways?.find(x => x.id === w.way);
      parts.push(`「${nameIn(kind, 'outfit', w.outfit)}」${way ? `（${way.name}）` : ''}`);
    }
    for (const part of WEAR.slice(1)) if (w[part] && w[part] !== 'none') parts.push(`${WEAR_NAMES[part]}「${nameIn(kind, part, w[part])}」`);
    return parts.join('，') || '（还不知道）';
  };
  const lines = ['衣柜（dress 的 wear 用方括号里的编号；头上和别的配饰要摘掉就填 none）：', `${her}现在穿着：${wearing(closet.her)}。`, `你现在穿着：${wearing(mine)}。`];
  for (const [kind, whose] of [[closet.her, `${her}能穿的`], [mine, '你能穿的']]) {
    lines.push(`${whose}：`);
    for (const part of WEAR) {
      const list = closet[kind][part];
      if (list.length) lines.push(`  ${WEAR_NAMES[part]}：${list.map(c => `[${c.id}] ${c.name}${c.ways ? `（配色 ${c.ways.map(w => `[${w.id}] ${w.name}`).join('、')}）` : ''}`).join('；')}`);
    }
  }
  return lines.join('\n');
}

// The benches: what can be made here (the make tool takes the ids in the brackets), as the home was last saved.
export async function lookBench(db, {homeId}) {
  const {layout, save} = await house(db, homeId);
  if (!save.doc) return '这个家还没往云上存过，台子上有什么还看不到。';
  const b = benchOf(layout), list = (ids, name) => ids.map(id => `[${id}] ${name(id)}`).join('、');
  const parts = {base: '底', cream: '奶油', fruit: '水果', sprinkles: '糖粒', plate: '盘子'};
  const lines = [
    '做东西的台子上有什么（make 用方括号里的编号）：',
    `花：${list(b.flowers, k => flowerKinds[k].name)}；花器：${list(b.vases, k => vaseKinds[k].name)}。一束最多 9 枝。`,
    `  花的颜色：${list(Object.keys(COLORS.flower), c => COLORS.flower[c])}；花器的颜色：${list(Object.keys(COLORS.vase), c => COLORS.vase[c])}`,
    '甜品：',
    ...Object.keys(DESSERT_OPTIONS).map(k => `  ${parts[k]}：${list(b.dessert[k], v => DESSERT_LABELS[k][v])}`),
    `  颜色（colors 的 body 是底、cream 奶油、sprinkles 糖粒、plate 盘子，各填一个）：${list(Object.keys(ROLES), id => ROLES[id].label)}`,
    `玩偶（这个家抓到过、收到过的种类）：${list(b.species, s => DOLL_LABELS.species[s])}`,
    ...b.species.map(s => `  ${DOLL_LABELS.species[s]}的耳朵：${list(speciesEars[s], e => DOLL_LABELS.ears[e] || e)}`),
    ...['expression', 'pose', 'body', 'blush'].map(k => `  ${{expression: '表情', pose: '姿势', body: '身形', blush: '腮红'}[k]}：${list(k === 'pose' ? POSES : Object.keys(DOLL_LABELS[k]), v => DOLL_LABELS[k][v])}`),
    `  配饰（扭蛋里扭到过的）：${b.accessories.length ? list(b.accessories, a => DOLL_LABELS.accessory[a]) : '还没有'}`,
    `  颜色（fur 毛色、cream 第二种颜色、patch 花纹；不写就是它本来的颜色）：${list(Object.keys(COLORS.doll), c => COLORS.doll[c])}`
  ];
  // What was brought home from going out and is left of it (src/bench-stock.js): used up once a thing is made.
  const unit = {dye: n => `还能染 ${n} 次`, essence: n => `还能做 ${n} 份`, fruit: n => `还剩 ${n} 捧`};
  const have = kind => Object.entries(b.stock[kind]).map(([name, v]) => `${stockName(kind, name)}（${v.left ? unit[kind](v.left) : '用完了'}）`).join('、') || '还没有';
  lines.push(
    '出门捡回来做成的（做好了才扣；用完了、还没有的，要两个人再出门找）：',
    `  染料（玩偶的颜色；奶白、米白、墨黑和每种玩偶本来的颜色不用染料）：${have('dye')}`,
    `  香精（甜品的颜色就是口味；香草 cream、牛奶 white 一直有，底用 gold 是蛋香，也一直有）：${have('essence')}`,
    `  水果（一捧做一份）：${have('fruit')}`
  );
  return lines.join('\n');
}

// How the home looks (src/machine-decor.js): the outside, each room's walls, floor and lights, the furniture's colours,
// and what may be chosen; the decoration and the lights are their own entries in the save.
export async function lookDecor(db, {homeId}) {
  const {layout, save, today, her} = await house(db, homeId);
  if (!save.doc) return '这个家还没往云上存过，屋里什么样子还看不到。';
  const entries = save.doc.entries || {};
  return ['这个家现在的样子（decorate 用括号里的名字）：', ...decorLook(layout, entries['porchlit-decoration-v1'], entries['porchlit-lights-v1'], {day: today, her})].join('\n');
}

// The door: what waits to be taken in, and the guestbook.
export async function lookDoor(db, {homeId}) {
  const {her} = await house(db, homeId);
  const door = await loadDoor(db, homeId);
  const lines = [];
  const waiting = door.waiting.filter(v => v.status === 'waiting');
  lines.push(waiting.length ? `等${her}收的 ${waiting.length} 样：` : '门口没有等着收的东西。');
  for (const v of waiting) lines.push(`  · ${v.day} ${nameOf(v.from)}：${v.item?.name ? `「${v.item.name}」` : ''}${v.note ? `${v.item?.name ? '，' : ''}纸条写着「${v.note}」` : ''}`);
  lines.push(door.book.length ? '留言簿（新的在前）：' : '留言簿还是空的。');
  for (const v of door.book.slice(0, 20)) {
    const what = v.kind === 'knock' ? '敲了门' : `放了${v.itemName ? `「${v.itemName}」` : '一张纸条'}${v.status === 'taken' ? `，${her}收下了` : v.status === 'declined' ? `，${her}没收` : ''}`;
    lines.push(`  · ${v.day} ${who(v.from)}${what}${v.blocked ? '（已拉黑）' : ''}`);
  }
  return lines.join('\n');
}

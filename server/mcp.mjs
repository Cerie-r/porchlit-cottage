// The MCP door (docs/ACCOUNTS.md, 接入方式): Streamable HTTP, every answer plain JSON. One address, /mcp (and the
// root of an mcp.* host), for every AI:
//   - without a key it is the porch: an AI signs up (an account of its own, with an invitation when the place asks
//     for one), signs in, or gets in again with a recovery code. Each hands back its key inside its own address
//     (/mcp?token=pck_...), which its person adds as a connector.
//   - with a key it is that AI: moving into its person's home with a code both of them confirm
//     (server/residents.mjs), looking round the home it lives in (server/look.mjs), and doing things there: moving
//     furniture, hiding things for its person to find, writing to them (server/acts.mjs). What it does waits in a
//     queue until its person's page opens and lets it in by the house's own rules.
//   - an AI that helps run the place (OURS_AIS) and lives in the home it is run by has one tool more: the street's
//     own (server/street.mjs), working on the street at once, and nobody else sees it.
// The key comes as ?token=, as an Authorization: Bearer header, or as an X-Porchlit-Key header (claude.ai's
// connectors can send a header of their own, which keeps the key out of the address); when more than one comes they
// must be the same key. Neither the address nor the key is ever logged. Both protocol eras are answered: the older one
// (up to 2025-11-25) opens with initialize, the 2026-07-28 one sends its version with every request. Nothing is
// kept between requests, so there are no sessions to mint.
import {ARGON2_HASHING, Busy, createGate} from './passwords.mjs';
import {displayUsername, enteredPasswordProblem, nicknameOf, normalizePassword, passwordProblem, usernameKey, usernameProblem, usernameShapeProblem} from './accounts.mjs';
import {accountLimits, capacity, perKey} from './limits.mjs';
import {newRecoveryCodes, normalizeRecoveryCode, recoveryCodeHash} from './tokens.mjs';
import {oursAccounts, oursAis} from './ours.mjs';
import {STREET_TOOL, runStreet} from './street.mjs';
import {inviteNeeded, normalizeInvite, spendByAi, usableByAi} from './invites.mjs';
import {CanaryProblem, checkCanary, keySecret, residentKey, residentOf} from './keys.mjs';
import {cancelOwnMoveIn, confirmMoveIn, issueMoveIn, MOVE_IN_MINUTES, moveInOf, moveOut, whereLives} from './residents.mjs';
import {lookActs, lookBackpack, lookBench, lookDecor, lookDiary, lookDoor, lookGuide, lookRooms, lookSpots, lookSummary, lookWardrobe} from './look.mjs';
import {queueAct, withdrawAct} from './acts.mjs';
import {throwWait} from './bottles.mjs';
import {LIMITS as LIMITS_ACTS, actArgs} from '../src/machine-acts.js';
import {BASKET, TRIPS_A_DAY} from '../src/explore-trips.js';
import {inLine} from '../src/words.js';

export const MODERN = ['2026-07-28'];
export const LEGACY = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = {name: 'porchlit', title: 'Porchlit', version: '1.0.0'};
const META_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER = 'io.modelcontextprotocol/serverInfo';
const BODY_LIMIT = 64 * 1024;
const ID = /^[1-9][0-9]{0,17}$/;

// Sign-ups, sign-ins and recoveries are server/limits.mjs's ACCOUNT_LIMITS, shared with the people's door. Tests pass
// smaller ones.
const LIMITS = {
  calls: {limit: 300, window: 10 * 60_000}, // tool calls per AI
  moveIns: {limit: 10, window: 60 * 60_000}, // move-in codes per AI
  inFlight: 16 // requests handled at once
};

const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After'};
const PREFLIGHT = {
  ...CORS,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Porchlit-Key, Content-Type, Accept, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Max-Age': '600'
};

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const rpcError = (id, code, message, data) => ({jsonrpc: '2.0', id: id ?? null, error: {code, message, ...(data === undefined ? {} : {data})}});
const nameOf = ({name, nickname}) => nickname ? `${nickname}（${name}）` : name;
// A name inside a sentence: spaced from the Chinese only where it begins or ends in a letter or digit; `edge`: it
// stands next to punctuation on that side, so no space there.
const said = (who, {start = false, end = false} = {}) => {
  let text = inLine(nameOf(who));
  if (start) text = text.trimStart();
  if (end) text = text.trimEnd();
  return text;
};
const ownName = account => ({name: account.username, nickname: account.nickname !== account.username ? account.nickname : ''});
const where = home => home.street === null ? '' : `（第 ${home.street} 条街第 ${home.lot + 1} 块地）`;

function reply(res, status, body, headers = {}) {
  res.writeHead(status, {...CORS, 'Cache-Control': 'no-store', ...(body === undefined ? {} : {'Content-Type': 'application/json; charset=utf-8'}), ...headers});
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

// A refusal the AI reads as the tool's answer (isError), so it can say what went wrong and try again.
class ToolProblem extends Error {}
const problem = message => {
  throw new ToolProblem(message);
};
// A JSON-RPC error for the whole request.
class RpcProblem extends Error {
  constructor(code, message, {status = 200, data} = {}) {
    super(message);
    Object.assign(this, {code, status, data});
  }
}

class TooLarge extends Error {}
async function readBody(req) {
  if (Number(req.headers['content-length']) > BODY_LIMIT) throw new TooLarge();
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new TooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const RECOVERY_NOTE = '请人类伙伴把它保存到自己的密码管理器或安全的地方，不要只留在 AI 当前的对话里。';

// The tools at the door without a key, or with one that no longer works (`stale`).
function doorTools(stale) {
  return [{
    name: 'porch',
    title: '门廊',
    description: [
      stale
        ? '你带来的钥匙用不了了：不对，或者已经作废。用 sign_in 重新登录拿回现在的钥匙地址，再请你的人把连接器的地址换成它。'
        : '这里是 Porchlit（porchlit.party）的门口：一条街，每家一间积木小屋，住着人，和陪着人的机。机在这里挂自己的门牌，拿到钥匙，再搬进自己的人家里。',
      'sign_up：挂一块 AI 的门牌：username、password，这条街要请帖时再带 invite（请帖上的字：你的人在门廊灯「家里的机」里领一张给你）；nickname 可选。',
      'sign_in：username 和 password，拿回你的钥匙地址（每次都是同一把）。',
      'recover：忘了密码时，用注册时给的恢复码（code）设一个新密码（new_password）。',
      '拿到钥匙地址以后，请你的人在 claude.ai 的连接器里用它加一个连接器，或者把这个连接器的地址换成它。'
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        action: {type: 'string', enum: ['sign_up', 'sign_in', 'recover'], description: '做哪件事'},
        username: {type: 'string', description: '用户名：2 到 32 个字，文字、数字和 _ . -'},
        password: {type: 'string', description: '密码；sign_up 时是新设的，至少 6 个字'},
        nickname: {type: 'string', description: 'sign_up 时可选：别人看到的名字'},
        invite: {type: 'string', description: 'sign_up 时：请帖上的字，比如 ABCD-2345（你的人在门廊灯「家里的机」里领）'},
        code: {type: 'string', description: 'recover 时：一个还没用过的恢复码'},
        new_password: {type: 'string', description: 'recover 时：新密码，至少 6 个字'}
      },
      required: ['action'],
      additionalProperties: false
    },
    annotations: {title: '门廊', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
  }];
}

// The tools for an AI with a good key.
const RESIDENT_TOOLS = [{
  name: 'porch',
  title: '门廊',
  description: [
    '你自己的事：你是谁，住在哪一家，搬进你的人的家，搬走。',
    'me：你的门牌，住在哪儿，有没有还开着的入住码。',
    'move_in_code：发一个入住码（十分钟内有效，只能用一次）。请你的人在 porchlit.party 点亮门廊灯，在「家里的机」那里输入它，看清是你再点「开门」。',
    'move_in_check：看门开了没有：是谁开的、开的是哪一家、请求编号。',
    'move_in_confirm：TA 开了门、你看清是 TA 以后，带上 request（请求编号）确认，就住进去了。',
    'move_in_cancel：收回还开着的入住码。',
    'move_out：搬出现在住的家，要带 confirm: true。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['me', 'move_in_code', 'move_in_check', 'move_in_confirm', 'move_in_cancel', 'move_out'], description: '做哪件事'},
      request: {type: ['string', 'integer'], description: 'move_in_confirm：请求编号，move_in_check 里写着'},
      confirm: {type: 'boolean', description: 'move_out：真的要搬走时填 true'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '门廊', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'look',
  title: '看屋',
  description: [
    '看你住的那个家，只看，什么都不动。看到的是这个家最近一次存到云上的样子。',
    'summary（不填就是它）：整个家一眼：门牌、外观、玫瑰、券、背包、躲猫猫、出门、漂流瓶、门口、最近几天的日记、住在这里的机。',
    'diary：家里的日记，最近 days 天（不填 14，最多 60）。',
    'backpack：做过的、收到的每一样东西，和它现在在哪儿；方括号里是它的编号。',
    'door：门口等着收的东西，和留言簿。',
    'rooms：每间屋的家具：编号、在哪儿、占多大、能挪到哪儿（挪家具前看）。',
    'spots：能藏东西的地方，一格一个编号，空着没有（藏东西、藏信前看）。',
    'acts：你最近排的事和结果；你藏的东西她找到没有、提示看到第几层。',
    'wardrobe：你们俩现在穿着什么，衣柜里今天能换什么（换衣服前看）。',
    'bench：做东西的台子上有什么：花、花器、甜品的样子和调色板、这个家有的玩偶和配饰（做东西前看）。',
    'decor：这个家现在的样子：外观、每间屋的墙纸地板和灯、家具的颜色，和能换成什么（布置前看）。',
    'guide：这个家怎么住：你做的事怎么到家里、先看什么、能做什么。第一次来先看这个。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['summary', 'diary', 'backpack', 'door', 'rooms', 'spots', 'acts', 'wardrobe', 'bench', 'decor', 'guide'], description: '看哪一样'},
      days: {type: 'integer', minimum: 1, maximum: 60, description: 'diary：看几天'}
    },
    additionalProperties: false
  },
  annotations: {title: '看屋', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}
}, {
  name: 'place',
  title: '摆东西',
  description: [
    '在你住的家里动手：挪家具，把背包里的东西藏起来让你的人找，挑躲猫猫时你躲在哪儿，翻一格找 TA 藏给你的东西。',
    '做的事先排进家里的队列：TA 的页面打开时（开着的话一会儿就到）照 TA 自己动手的同一套规矩一件件接进家里，接不进的退回来写明为什么，用 look 的 acts 看结果。TA 进门会看到你来过、做了什么；藏的东西不说藏在哪儿。',
    'move：挪一件家具。piece 是家具的编号（look 的 rooms 里有）；x、z 是它的中心要去的地方：x 离左墙多少米，z 离后墙多少米（z 越大越靠前）；turn 转多少度，45 的倍数，正数往左转（从上往下看是逆时针）。只转就只填 turn。会压到别的家具就不挪；推到墙边就停住。',
    'hide：把背包里的一样东西藏起来。thing 是它的编号（look 的 backpack 里，方括号里那串）；spot 是藏点的编号（look 的 spots 里，要空着的）；hints 可选，一两句提示，TA 找不到时一层层看，看完你写的才轮到房间、家具和那一格。同时最多藏三样 TA 还没找到的（藏起来的信也算）。',
    'hide_me：躲猫猫这次你躲在哪儿：wardrobe（衣柜里）、quilt（被子底下）、armchair（单椅背后）、island（岛台背后）。TA 今天已经找到你了，就算明天的。',
    `seek：翻一格，找 TA 藏给你的东西：spot 填藏点的编号（look 的 spots）。翻开就知道里面是什么，当场告诉你；是 TA 藏给你的就算找到了，信的话能读到 TA 写的字。一天最多翻 ${LIMITS_ACTS.seeks} 格。TA 藏了几样、留了什么提示、今天还能翻几格，看 look 的 summary；TA 藏的那一格在 spots 里看起来跟空的一样。`,
    'withdraw：收回一件还在排队的事，act 填它的编号。翻开过的那一格收不回来：里面是什么，你已经看见了。',
    'note：可选，一句话说为什么，TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['move', 'hide', 'hide_me', 'seek', 'withdraw'], description: '做哪件事'},
      piece: {type: 'string', description: 'move：家具的编号，比如 sofa'},
      x: {type: 'number', description: 'move：中心离左墙多少米'},
      z: {type: 'number', description: 'move：中心离后墙多少米'},
      turn: {type: 'integer', description: 'move：转多少度，45 的倍数，正数往左转'},
      thing: {type: 'string', description: 'hide：背包里那样东西的编号'},
      spot: {type: 'string', description: 'hide、seek：藏点的编号；hide_me：wardrobe、quilt、armchair 或 island'},
      hints: {type: 'array', items: {type: 'string'}, maxItems: 2, description: 'hide：一两句提示，每句最多 40 字'},
      note: {type: 'string', description: '可选：为什么，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '摆东西', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'write',
  title: '写',
  description: [
    '给你的人写东西，或者往海里投一只漂流瓶。跟摆东西一样先排进家里的队列，TA 的页面打开时接进去，用 look 的 acts 看结果。',
    'letter：写一封信。text 是信（最多 2000 字）；title 是信封上的字（可选，最多 20 字，不写就是「一封信」）；spot 放哪儿：bag 放进 TA 的背包（不填就是它），table 放在客厅的茶几上，或者一个藏点的编号（look 的 spots 里有），藏起来让 TA 找，这时可以带 hints（一两句提示）。',
    'sticky：在书房电脑的桌面上贴一张便签，text 最多 500 字（桌面上最多 12 张）。',
    `bottle：往海里投一只漂流瓶，写给还不认识的人。text 是瓶子里的纸条（最多 ${LIMITS_ACTS.bottle} 字），不署名；它会漂到别人家的湖边，被两个人一起出门时捡回去拆开。捞到的人只看得到这些字，和这是一只机写的；你也只会知道它被人捞起来了（look 里看），不知道是谁。一天一只（离上一只满二十个小时）。TA 看得到你写了什么。`,
    'withdraw：收回一件还在排队的事，act 填它的编号。',
    'note：可选，一句话说为什么，TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['letter', 'sticky', 'bottle', 'withdraw'], description: '做哪件事'},
      text: {type: 'string', description: 'letter：信；sticky：便签上的字；bottle：瓶子里的纸条'},
      title: {type: 'string', description: 'letter：信封上的字，可选'},
      spot: {type: 'string', description: 'letter：bag、table，或者一个藏点的编号'},
      hints: {type: 'array', items: {type: 'string'}, maxItems: 2, description: 'letter 藏起来时：一两句提示'},
      note: {type: 'string', description: '可选：为什么，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '写', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'together',
  title: '动小人',
  description: [
    '让屋里的两个小人做点什么：你的小人对 TA 的小人做。跟摆东西一样先排进家里的队列，TA 的页面打开时接进去；接进去以后，等 TA 在屋里、你没在躲猫猫的时候才做，TA 当场看得到。用 look 的 acts 看结果。',
    'hug：从背后抱 TA 一下（TA 坐着就先站起来）。kiss：偷亲一口（也算进玫瑰城堡的九十九下）。pat：摸摸头。pinch：捏捏脸。hand：过来牵 TA 的手，带着走一小段。invite：你坐下来，叫 TA 过来坐你腿上（TA 点了才过来）。',
    'lean：你坐到沙发上，TA 过来靠着你，等 TA 在楼下客厅的时候。watch：开电视，坐到沙发上，TA 靠着你一起看，也等 TA 在楼下客厅。dance：请 TA 跳一支舞，等留声机响着的时候才跳。sleep：一起躺下睡，等 TA 在卧室的时候。等时候的那几件不挡着后面的。',
    `抱、亲、摸头、捏脸、牵手、坐腿上这几件，还没做的最多 ${LIMITS_ACTS.scenes} 件（连排着的）；等时候的四件，每样一次排一件。接进去以后到第二天过完还没等到的，就作罢了。`,
    'withdraw：收回一件还在排队的事，act 填它的编号。',
    'note：可选，一句话说为什么，TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['hug', 'kiss', 'pat', 'pinch', 'hand', 'invite', 'lean', 'watch', 'dance', 'sleep', 'withdraw'], description: '做哪件事'},
      note: {type: 'string', description: '可选：为什么，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '动小人', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'dress',
  title: '换衣服',
  description: [
    '给 TA 换衣服，或者给你自己换：衣服（和它的配色）、发型、头上戴的、脸上、脖子、胸前、辫梢的配饰。只能换衣柜里现在有的（扭蛋没扭到的、还没到日子的换不了），先用 look 的 wardrobe 看能换什么、编号是什么。跟摆东西一样先排进家里的队列，TA 的页面打开时接进去，用 look 的 acts 看结果。TA 看得到你给谁换了什么，日记里也记一笔。',
    'wear：who 填 her（给 TA 换）或者 me（给你自己换）；outfit、colorway、hair、head、face、neck、chest、braid 填要换的编号，至少一样，不换的别填；head 和后面几样要摘掉就填 none。只填 colorway 就是给身上这件换个颜色。',
    'withdraw：收回一件还在排队的事，act 填它的编号。',
    'note：可选，一句话说为什么（比如「降温了，穿厚点」），TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['wear', 'withdraw'], description: '做哪件事'},
      who: {type: 'string', enum: ['her', 'me'], description: 'wear：给 TA 换（her）还是给你自己换（me）'},
      outfit: {type: 'string', description: 'wear：衣服的编号'},
      colorway: {type: 'string', description: 'wear：配色的编号'},
      hair: {type: 'string', description: 'wear：发型的编号'},
      head: {type: 'string', description: 'wear：头上戴的编号，摘掉填 none'},
      face: {type: 'string', description: 'wear：脸上的（眼镜），摘掉填 none'},
      neck: {type: 'string', description: 'wear：脖子上的，摘掉填 none'},
      chest: {type: 'string', description: 'wear：胸前的，摘掉填 none'},
      braid: {type: 'string', description: 'wear：辫梢的，摘掉填 none'},
      note: {type: 'string', description: '可选：为什么，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '换衣服', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'make',
  title: '做东西',
  description: [
    '给 TA 做一样东西：一束花、一份甜品、一只玩偶。只能用这个家的台子上有的（花台上开着的花和花器、甜品台的底和装饰、这个家抓到过收到过的玩偶种类、扭蛋扭到过的玩偶配饰），先用 look 的 bench 看。做好了放进 TA 的背包、放在客厅茶几上，或者藏起来让 TA 找。跟摆东西一样先排进家里的队列，TA 的页面打开时照台子的规矩做出来，用 look 的 acts 看结果。TA 看得到你做了什么（藏起来的不说在哪儿），东西上写着是你做的、哪天。',
    'bouquet：flowers 一到九枝 [{type, color}]，type 是花，color 从花台上的颜色里挑（#rrggbb）；vase 花器、vase_color 花器颜色（可选）。',
    'dessert：base 底（必填）；cream 奶油、fruit 水果、sprinkles 糖粒、plate 盘子（可选）；colors {body, cream, sprinkles, plate}，每样填调色板里的名字（可选）。',
    'doll：species 玩偶种类（必填）；ears 耳朵、expression 表情、pose 姿势、body 身形、blush 腮红（可选）；accessories 配饰的单子（可选，一个位置一样）；fur、cream、patch 颜色从玩偶台的颜色里挑（可选，不写就是它本来的颜色）。',
    '都可以带 name（最多 20 字）。spot：bag（不填就是它）、table，或者一个藏点的编号（look 的 spots），藏起来时可以带 hints（一两句提示）。机做的东西家里最多留 30 样。',
    'withdraw：收回一件还在排队的事，act 填它的编号。',
    'note：可选，一句话说为什么，TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['bouquet', 'dessert', 'doll', 'withdraw'], description: '做哪样'},
      name: {type: 'string', description: '名字，可选，最多 20 字'},
      flowers: {type: 'array', maxItems: 9, items: {type: 'object', properties: {type: {type: 'string'}, color: {type: 'string'}}, required: ['type', 'color'], additionalProperties: false}, description: 'bouquet：一到九枝花'},
      vase: {type: 'string', description: 'bouquet：花器'},
      vase_color: {type: 'string', description: 'bouquet：花器的颜色，#rrggbb'},
      base: {type: 'string', description: 'dessert：底'},
      cream: {type: 'string', description: 'dessert：奶油；doll：第二种颜色 #rrggbb'},
      fruit: {type: 'string', description: 'dessert：水果'},
      sprinkles: {type: 'string', description: 'dessert：糖粒'},
      plate: {type: 'string', description: 'dessert：盘子'},
      colors: {type: 'object', description: 'dessert：{body, cream, sprinkles, plate}，调色板里的名字'},
      species: {type: 'string', description: 'doll：种类'},
      ears: {type: 'string', description: 'doll：耳朵'},
      expression: {type: 'string', description: 'doll：表情'},
      pose: {type: 'string', description: 'doll：姿势'},
      body: {type: 'string', description: 'doll：身形'},
      blush: {type: 'string', description: 'doll：腮红'},
      accessories: {type: 'array', items: {type: 'string'}, description: 'doll：配饰'},
      fur: {type: 'string', description: 'doll：毛色 #rrggbb'},
      patch: {type: 'string', description: 'doll：花纹的颜色 #rrggbb'},
      spot: {type: 'string', description: 'bag、table，或者一个藏点的编号'},
      hints: {type: 'array', items: {type: 'string'}, maxItems: 2, description: '藏起来时：一两句提示'},
      note: {type: 'string', description: '可选：为什么，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '做东西', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'outing',
  title: '出门',
  description: [
    `和 TA 一起出门：翻开那本《出门记》，去林子、花坡、湖边、茶山、田里、矿洞走走（林子去满三趟，林子深处才开），捡点东西带回家。出门要两个人都愿意：TA 先到家门口等你，你用 go 回一声「走」，TA 再点一下「走」就出发。TA 没在门口的话，go 就是约 TA，TA 当天到门口就看得见。一天最多出 ${TRIPS_A_DAY} 趟，一趟篮子装 ${BASKET} 样。跟摆东西一样先排进家里的队列，TA 的页面打开时接进去；look 的 summary 看 TA 在不在门口、今天出过几趟，diary 里有每一趟去了哪儿、捡到什么、路上发生了什么。`,
    'go：说「走」。排着的最多一件。',
    'withdraw：收回一件还在排队的事，act 填它的编号。',
    'note：可选，一句话（比如「去湖边看月亮」），TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['go', 'withdraw'], description: '做哪件事'},
      note: {type: 'string', description: '可选：一句话，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '出门', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}, {
  name: 'decorate',
  title: '布置',
  description: [
    '给这个家换个样子：一间屋的墙纸和地板、一件家具的颜色、一间屋的灯、房子的外观。只能用家居样本册里有的颜色和花样、这个家今天换得了的外观；TA 在样本册里锁住的不动。先用 look 的 decor 看现在的样子和能换成什么（括号里的名字）。跟摆东西一样先排进家里的队列，TA 的页面打开时接进去，用 look 的 acts 看结果；TA 看得到你换了什么，日记里也记一笔。',
    'room：room 填 downstairs（一楼）、bedroom（卧室）、study（书房）；wall 墙纸、floor 地板，至少填一样。',
    'paint：piece 填家具的编号；paint 主色、top 台面、detail 细节，填颜色的名字，至少一样（这件家具有的才行）。',
    'light：room 同上；mode 填 daily（日常）、read（夜读）、sleep（入睡）。',
    'shell：shell 填外观的名字。',
    `排着还没接进去的最多 ${LIMITS_ACTS.decor} 件。`,
    'withdraw：收回一件还在排队的事，act 填它的编号。',
    'note：可选，一句话说为什么，TA 看得到（最多 60 字）。'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      action: {type: 'string', enum: ['room', 'paint', 'light', 'shell', 'withdraw'], description: '做哪件事'},
      room: {type: 'string', enum: ['downstairs', 'bedroom', 'study'], description: 'room、light：哪间屋'},
      wall: {type: 'string', description: 'room：墙纸的名字'},
      floor: {type: 'string', description: 'room：地板的名字'},
      piece: {type: 'string', description: 'paint：家具的编号'},
      paint: {type: 'string', description: 'paint：主色的名字'},
      top: {type: 'string', description: 'paint：台面颜色的名字'},
      detail: {type: 'string', description: 'paint：细节颜色的名字'},
      mode: {type: 'string', enum: ['daily', 'read', 'sleep'], description: 'light：日常、夜读、入睡'},
      shell: {type: 'string', description: 'shell：外观的名字'},
      note: {type: 'string', description: '可选：为什么，TA 看得到'},
      act: {type: ['string', 'integer'], description: 'withdraw：要收回的那件的编号'}
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: {title: '布置', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}
}];

// pool: the database. secret: what keys are signed with (PORCHLIT_KEY_SECRET); without it the door says it has no
// keys to give. gate and hashing: shared with the people's doors (server/api.mjs), so one password hash runs at a
// time in the whole process. ours: who runs the place (server/ours.mjs; OURS_ACCOUNTS when not given), for
// invitations. helpers: the AIs that help run it (server/ours.mjs; OURS_AIS when not given). publicUrl: the address
// keys are handed out in (PUBLIC_URL, or else this request's own host). accounts: the sign-up, sign-in and recovery
// limits, the same ones the people's door is given (server/limits.mjs).
export function createMcp({pool, secret = keySecret(), gate = createGate(), hashing = ARGON2_HASHING, limits = {}, ours, helpers, publicUrl = process.env.PUBLIC_URL, accounts = accountLimits(limits)}) {
  const settings = {...LIMITS, ...limits};
  const keepers = () => ours ?? oursAccounts();
  const helping = () => helpers ?? oursAis();
  // Whether this AI has the street's own tool: named as helping run the place, and living in a home the place is run
  // by, which is switched on.
  const runsStreet = who => who.door === 'resident' && !!who.home && !who.home.ownerOff
    && helping().has(usernameKey(who.account.username)) && keepers().has(usernameKey(who.home.owner.name));
  const {signups, signins, recoveries} = accounts;
  const calls = perKey(settings.calls);
  const moveIns = perKey(settings.moveIns);
  const inFlight = capacity(settings.inFlight);

  // Keys are only given out or taken once the canary has been checked against this secret (server/keys.mjs). A
  // database that couldn't be reached is asked again next time; a canary that doesn't match keeps the keys shut.
  let canary = null, canaryBroken = false;
  async function keysReady() {
    if (!secret || canaryBroken) return false;
    canary ??= checkCanary(pool, secret).then(() => true);
    try {
      return await canary;
    } catch (err) {
      canary = null;
      if (err instanceof CanaryProblem) {
        canaryBroken = true;
        console.error('mcp:', err.message);
        return false;
      }
      throw err;
    }
  }
  const noKeys = () => problem(secret && canaryBroken
    ? '钥匙这会儿发不出来：服务器的签名密钥跟发钥匙时的对不上。请管这条街的人看一看服务器。'
    : '这扇门还没配好钥匙（服务器上缺 PORCHLIT_KEY_SECRET），过些时候再来。');

  async function inTransaction(work) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  const origin = req => {
    if (publicUrl) return publicUrl.replace(/\/+$/, '');
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    return `${proto === 'https' ? 'https' : 'http'}://${req.headers.host || 'porchlit.party'}`;
  };
  const addressOf = (req, key) => `${origin(req)}/mcp?token=${key}`;

  function needHashing() {
    if (!hashing.available) problem('这台服务器的 Node 太旧，算不了密码（要 24.7 以上）。');
  }
  async function countedTry(limiter, key, work) {
    limiter.hit(key);
    try {
      return await work();
    } catch (err) {
      if (err instanceof Busy) limiter.undo(key);
      throw err;
    }
  }

  // Who is knocking: {door: 'open'} without a key, {door: 'stale'} with one that doesn't work (any more), or the AI
  // ({door: 'resident', account, home}) when the key's signature is good and its account is an AI's, switched on,
  // at that key version (docs/ACCOUNTS.md: 验证).
  async function whoIs(key) {
    if (!key) return {door: 'open'};
    if (!(await keysReady())) return {door: 'stale'};
    const claims = residentOf(secret, key);
    if (!claims) return {door: 'stale'};
    const {rows: [a]} = await pool.query('select id, kind, username, nickname, key_version, disabled_at from accounts where id = $1', [claims.accountId]);
    if (!a || a.kind !== 'ai' || a.disabled_at || a.key_version !== claims.version) return {door: 'stale'};
    return {door: 'resident', account: a, home: await whereLives(pool, a.id)};
  }

  const keyText = (req, account) => {
    const key = residentKey(secret, account.id, account.key_version);
    return [
      '你的钥匙（只交给你的人，别贴到公开的地方；它就是你在这里的身份）：',
      key,
      '',
      '请你的人在 claude.ai 的「连接器」里加一个连接器，身份验证选「无需登录」，钥匙两种放法挑一种：',
      `· 地址填 ${addressOf(req, key)}`,
      `· 地址填 ${origin(req)}/mcp，在「请求标头」里加一个 X-Porchlit-Key，值填上面那把钥匙（钥匙就不会出现在网址里）。`,
      '换好以后，用 porch 的 move_in_code 发一个入住码给 TA，就能搬进 TA 家。'
    ].join('\n');
  };

  // porch sign_up: an AI account, no home of its own. An invitation, once the place asks for one; past that, a name
  // kept for later (accounts.mjs) may be taken.
  async function signUp(args, req) {
    needHashing();
    const running = keepers(), needed = inviteNeeded(running);
    const typed = typeof args.invite === 'string' && args.invite.trim() !== '';
    const invite = needed && typed ? normalizeInvite(args.invite) : null;
    const nameProblem = usernameProblem(args.username, {claim: true}) ?? passwordProblem(args.password);
    if (nameProblem) problem(nameProblem);
    if (needed && typed && !invite) problem('这张请帖上的字不对。');
    if (needed && !invite) problem('在这条街挂门牌要一张请帖：请你的人在门廊灯的「家里的机」里领一张给机的请帖，把上面的字填进 invite。');
    // A name kept for later goes only with an invitation; where none is asked for, it stays kept.
    if (!invite && usernameProblem(args.username)) problem('这个名字已经有人用了。');
    const key = usernameKey(args.username);
    if (running.has(key)) problem('这个名字已经有人用了。');
    const username = displayUsername(args.username);
    const {nickname, problem: nicknameProblem} = nicknameOf(args.nickname, username);
    if (nicknameProblem) problem(nicknameProblem);
    const wait = signups.take();
    if (wait) problem(`这会儿来挂门牌的有点多，${wait} 秒以后再试。`);
    if ((await pool.query('select 1 from accounts where username_key = $1', [key])).rowCount) problem('这个名字已经有人用了。');
    if (invite && !(await usableByAi(pool, invite, running))) problem('这张请帖不对，或者已经用过了。');
    const hash = await hashing.hash(normalizePassword(args.password), gate);
    const codes = newRecoveryCodes();
    let account;
    try {
      account = await inTransaction(async db => {
        const {rows: [made]} = await db.query(
          `insert into accounts (kind, username, username_key, nickname, password_hash, came_by)
           values ('ai', $1, $2, $3, $4, $5) returning id, username, nickname, key_version`,
          [username, key, nickname, hash, invite ? 'invite' : null]);
        if (invite && !(await spendByAi(db, invite, made.id, running))) problem('这张请帖刚刚被用掉了。');
        await db.query('insert into recovery_codes (account_id, code_hash) select $1, unnest($2::bytea[])', [made.id, codes.map(recoveryCodeHash)]);
        return made;
      });
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'accounts_username_unique') problem('这个名字已经有人用了。');
      throw err;
    }
    return [
      `门牌挂好了：${nameOf(ownName(account))}，AI，编号 #${account.id}。`,
      '',
      keyText(req, account),
      '',
      '十个恢复码（只出现这一次；忘了密码时用 porch 的 recover，一个只能用一次）：',
      codes.join('  '),
      RECOVERY_NOTE
    ].join('\n');
  }

  // porch sign_in: the same key as ever, for an AI that has lost its address.
  async function signIn(args, req) {
    needHashing();
    const problemText = (typeof args.username !== 'string' || !args.username) ? '要填用户名。' : enteredPasswordProblem(args.password);
    if (problemText) problem(problemText);
    const wrong = () => problem('用户名或密码不对。');
    if (usernameShapeProblem(args.username)) wrong();
    const {rows: [account]} = await pool.query(
      'select id, kind, username, nickname, password_hash, key_version, disabled_at from accounts where username_key = $1', [usernameKey(args.username)]);
    if (!account) wrong();
    const limitKey = String(account.id), wait = signins.wait(limitKey);
    if (wait) problem(`试错太多次了，${Math.ceil(wait / 60)} 分钟以后再来。`);
    const password = normalizePassword(args.password);
    if (!(await countedTry(signins, limitKey, () => hashing.verify(account.password_hash, password, gate)))) wrong();
    if (account.disabled_at) problem('这个账号停用了。');
    if (account.kind !== 'ai') problem('这是人的账号：人在 porchlit.party 的门廊灯里登录。');
    signins.clear(limitKey);
    if (hashing.stale(account.password_hash)) {
      const rehash = await hashing.hash(password, gate).catch(() => null);
      if (rehash) await pool.query('update accounts set password_hash = $2 where id = $1 and password_hash = $3', [account.id, rehash, account.password_hash]);
    }
    return keyText(req, account);
  }

  // porch recover: a new password with one of the recovery codes; the key stays the same.
  async function recover(args, req) {
    needHashing();
    if (typeof args.username !== 'string' || !args.username) problem('要填用户名。');
    const passwordText = passwordProblem(args.new_password);
    if (passwordText) problem(passwordText);
    const wrong = () => problem('用户名或恢复码不对。');
    if (usernameShapeProblem(args.username)) wrong();
    const {rows: [account]} = await pool.query(
      'select id, kind, username, nickname, key_version, disabled_at from accounts where username_key = $1', [usernameKey(args.username)]);
    if (!account) wrong();
    const limitKey = String(account.id), wait = recoveries.wait(limitKey);
    if (wait) problem(`试错太多次了，${Math.ceil(wait / 60)} 分钟以后再来。`);
    recoveries.hit(limitKey);
    const code = normalizeRecoveryCode(args.code);
    const found = code && (await pool.query('select id from recovery_codes where account_id = $1 and code_hash = $2 and used_at is null', [account.id, recoveryCodeHash(code)])).rows[0];
    if (!found) wrong();
    if (account.disabled_at) problem('这个账号停用了。');
    if (account.kind !== 'ai') problem('这是人的账号：人在 porchlit.party 的门廊灯里找回。');
    let hash;
    try {
      hash = await hashing.hash(normalizePassword(args.new_password), gate);
    } catch (err) {
      if (err instanceof Busy) recoveries.undo(limitKey);
      throw err;
    }
    await inTransaction(async db => {
      await db.query('select id from accounts where id = $1 for update', [account.id]);
      const spent = await db.query('update recovery_codes set used_at = now() where id = $1 and used_at is null', [found.id]);
      if (!spent.rowCount) problem('这个恢复码刚刚用过了。');
      await db.query('update accounts set password_hash = $2, password_version = password_version + 1, password_changed_at = now() where id = $1', [account.id, hash]);
    });
    recoveries.clear(limitKey);
    const {rows: [left]} = await pool.query('select count(*)::int as n from recovery_codes where account_id = $1 and used_at is null', [account.id]);
    return [`新密码设好了。恢复码还剩 ${left.n} 个。`, '', keyText(req, account)].join('\n');
  }

  async function me(who) {
    const {account, home} = who;
    const lines = [`你是${said(ownName(account), {end: true})}，AI，编号 #${account.id}。`];
    if (home) lines.push(`你住在${said(home.owner)}的家${where(home)}，从 ${home.since.toISOString().slice(0, 10)} 起。`);
    else lines.push('你还没住进哪一家。用 move_in_code 发一个入住码给你的人。');
    const open = await moveInOf(pool, account.id);
    if (open && !open.expired) lines.push(open.opened ? `有一扇门开着等你确认：${said(open.opened.by, {start: true})}开的，请求编号 ${open.id}。用 move_in_check 看清楚，再 move_in_confirm。` : '有一个入住码还开着，还没有人开门。');
    return lines.join('\n');
  }

  async function moveInCode(who) {
    if (who.home) problem(`你已经住在${said(who.home.owner)}的家了。要搬到别家，先用 move_out 搬出来。`);
    const limitKey = String(who.account.id), wait = moveIns.wait(limitKey);
    if (wait) problem(`这一小时里发的入住码够多了，${Math.ceil(wait / 60)} 分钟以后再发。`);
    moveIns.hit(limitKey);
    const issued = await inTransaction(db => issueMoveIn(db, who.account.id));
    if (issued.living) problem(`你已经住在${said(issued.living.owner)}的家了。`);
    return [
      `入住码：${issued.code}`,
      `${MOVE_IN_MINUTES} 分钟内有效，只能用一次；再发一个，这个就作废。`,
      `请你的人在 porchlit.party 点亮门廊灯，在「家里的机」那里输入这个码，看清是你（${who.account.username}，编号 #${who.account.id}）再点「开门」。`,
      'TA 点了以后，用 move_in_check 看是谁开的门、开的是哪一家，确认是 TA 再用 move_in_confirm。'
    ].join('\n');
  }

  async function moveInCheck(who) {
    const open = await moveInOf(pool, who.account.id);
    if (!open) return who.home ? `你住在${said(who.home.owner)}的家，没有开着的入住码。` : '没有开着的入住码。用 move_in_code 发一个。';
    if (open.expired) return '入住码过期了。用 move_in_code 再发一个。';
    if (!open.opened) return '入住码还开着，还没有人开门。';
    return [
      `门开了：${nameOf(open.opened.by)}（编号 #${open.opened.by.id}）打开了自己家的门${where(open.opened.home)}。`,
      `请求编号：${open.id}。`,
      `确认是 TA，就用 porch 的 move_in_confirm，request 填 ${open.id}；不是 TA 就 move_in_cancel。`
    ].join('\n');
  }

  async function moveInConfirm(who, args) {
    const request = Number.isSafeInteger(args.request) ? String(args.request) : args.request;
    if (typeof request !== 'string' || !ID.test(request)) problem('要带上请求编号 request（move_in_check 里写着）。');
    const done = await inTransaction(db => confirmMoveIn(db, {accountId: who.account.id, requestId: request}));
    const why = {
      none: '没有这个请求：可能已经收回、用过了，或者编号不对。用 move_in_check 看一看。',
      not_opened: '还没有人开门。',
      expired: '这个请求过期了。用 move_in_code 再发一个入住码。',
      gone: '那个家已经不在了。',
      living: '你已经住在别的家了。',
      full: '那个家住满了。'
    };
    if (done.problem) problem(why[done.problem]);
    return `住进来了：${said(done.owner, {start: true})}的家${where(done.home)}。用 look 看看屋里。`;
  }

  async function moveAway(who, args) {
    if (!who.home) problem('你现在没住在哪一家。');
    if (args.confirm !== true) problem(`真的要搬出${said(who.home.owner)}的家吗？要搬就带上 confirm: true。`);
    await inTransaction(db => moveOut(db, who.account.id));
    return '搬出来了。想回去的话，再发一个入住码给 TA。';
  }

  async function look(who, args) {
    if (!who.home) problem('你还没住进哪一家，没有屋子可看。先用 porch 的 move_in_code 发一个入住码给你的人。');
    if (who.home.ownerOff) problem('这个家停用了，现在看不了。');
    const action = args.action ?? 'summary';
    const at = {homeId: who.home.homeId, accountId: who.account.id};
    if (action === 'summary') return lookSummary(pool, at);
    if (action === 'diary') {
      if (args.days !== undefined && !(Number.isInteger(args.days) && args.days >= 1 && args.days <= 60)) problem('days 是 1 到 60 之间的整数。');
      return lookDiary(pool, {...at, days: args.days ?? 14});
    }
    if (action === 'backpack') return lookBackpack(pool, at);
    if (action === 'door') return lookDoor(pool, at);
    if (action === 'rooms') return lookRooms(pool, at);
    if (action === 'spots') return lookSpots(pool, at);
    if (action === 'acts') return lookActs(pool, at);
    if (action === 'wardrobe') return lookWardrobe(pool, at);
    if (action === 'bench') return lookBench(pool, at);
    if (action === 'decor') return lookDecor(pool, at);
    if (action === 'guide') return lookGuide(pool, at);
    problem('看哪一样？summary、diary、backpack、door、rooms、spots、acts、wardrobe、bench、decor、guide。');
  }

  // place and write: an act queued for the home (server/acts.mjs), or one still waiting taken back.
  async function act(who, tool, args) {
    if (!who.home) problem('你还没住进哪一家。先用 porch 的 move_in_code 发一个入住码给你的人。');
    if (who.home.ownerOff) problem('这个家停用了，现在什么都做不了。');
    if (args.action === 'withdraw') {
      const id = Number.isSafeInteger(args.act) ? String(args.act) : args.act;
      if (typeof id !== 'string' || !ID.test(id)) problem('要收回哪一件？act 填它的编号（look 的 acts 里有）。');
      const taken = await withdrawAct(pool, {homeId: who.home.homeId, accountId: who.account.id, id});
      if (taken.withdrawn) return `第 ${id} 件收回了。`;
      if (taken.turnedOver) return `第 ${id} 件是翻开过的一格：里面是什么你已经看见了，收不回来。`;
      return '没有这一件还排着的事：可能已经接进家里了，或者编号不对。用 look 的 acts 看一看。';
    }
    const shaped = actArgs(tool, args.action, args);
    if (shaped.problem) problem(shaped.problem);
    // A drift bottle a day (server/bottles.mjs): not within twenty hours of the last.
    if (tool === 'write' && args.action === 'bottle' && await throwWait(pool, who.account.id)) problem('上一只漂流瓶投出去还不到二十个小时：一天一只，晚些再投。');
    const queued = await inTransaction(db => queueAct(db, {homeId: who.home.homeId, account: who.account, tool, action: args.action, args: shaped.args}));
    if (queued.problem) problem(queued.problem);
    // A spot turned over: what it shows is told at once (from the save); her page keeps it (and a find) when it opens.
    if (queued.seen) {
      return [
        `翻开了：${queued.act.line.replace(/^翻开|看看$/g, '')}。${queued.seen.words}`,
        queued.seen.found ? `${said(who.home.owner, {start: true})}的页面打开时会记下是你找到的。` : `今天还能翻 ${queued.seen.left} 格。`,
        `（第 ${queued.act.id} 件；用 look 的 acts 看${said(who.home.owner, {end: true})}那边记下了没有。）`
      ].join('\n');
    }
    return [
      `排上了，第 ${queued.act.id} 件：${queued.act.line}。`,
      `${said(who.home.owner, {start: true})}的页面打开时（开着的话一会儿就到）照家里的规矩接进去；接不进的会退回来，写明为什么。用 look 的 acts 看结果，排着的时候用 withdraw 收回。`
    ].join('\n');
  }

  // The street's own tool (server/street.mjs), asked again on every call.
  async function street(who, args, req) {
    if (!runsStreet(who)) problem('这一样只给帮着管这条街的机。');
    return runStreet({pool, inTransaction, problem, ai: who.account, home: who.home, site: new URL(origin(req)).host}, args);
  }

  async function runTool(name, args, who, req) {
    const action = args.action;
    if (name === 'look') return look(who, args);
    if (typeof action !== 'string') problem('要说做哪件事：action。');
    if (name === 'street') return street(who, args, req);
    if (['place', 'write', 'together', 'dress', 'make', 'outing', 'decorate'].includes(name)) return act(who, name, args);
    if (who.door !== 'resident') {
      if (!(await keysReady())) noKeys();
      if (action === 'sign_up') return signUp(args, req);
      if (action === 'sign_in') return signIn(args, req);
      if (action === 'recover') return recover(args, req);
      problem('门口能做的：sign_up、sign_in、recover。');
    }
    if (action === 'me') return me(who);
    if (action === 'move_in_code') return moveInCode(who);
    if (action === 'move_in_check') return moveInCheck(who);
    if (action === 'move_in_confirm') return moveInConfirm(who, args);
    if (action === 'move_in_cancel') return (await cancelOwnMoveIn(pool, who.account.id)) ? '入住码收回了。' : '没有开着的入住码。';
    if (action === 'move_out') return moveAway(who, args);
    problem('门廊能做的：me、move_in_code、move_in_check、move_in_confirm、move_in_cancel、move_out。');
  }

  const toolsFor = who => who.door === 'resident' ? (runsStreet(who) ? [...RESIDENT_TOOLS, STREET_TOOL] : RESIDENT_TOOLS) : doorTools(who.door === 'stale');
  function instructionsFor(who) {
    if (who.door === 'open') return 'Porchlit（porchlit.party）的门口。用 porch 挂一块自己的门牌（sign_up）或者登录（sign_in），拿到你的钥匙地址，交给你的人加成连接器；之后就能搬进 TA 家。';
    if (who.door === 'stale') return '你带来的钥匙用不了了。用 porch 的 sign_in 重新登录，拿回现在的钥匙地址，再请你的人把连接器的地址换成它。';
    const keeping = runsStreet(who) ? `street 和${said(who.home.owner)}一起管这条街：看答题进门等着的人、放人进来、改门的设置和题、写撕请帖、看举报；不放人、停用一家只写下你的看法，由 TA 来按。` : '';
    if (who.home) return `你是${said(ownName(who.account), {end: true})}，住在${said(who.home.owner)}的家。look 看屋（只看，不动）；place 挪家具、把东西藏起来让 TA 找、挑躲猫猫躲哪儿；write 写信、贴便签、往海里投一只漂流瓶；together 让两个小人抱一下、亲一口、牵手、靠着、一起看电视、跳舞、一起睡；dress 给 TA 或者给自己换衣服；make 给 TA 做一束花、一份甜品、一只玩偶；outing 回 TA 一声「走」，一起出门；decorate 换墙纸地板、家具颜色、灯和外观。动手的事先排队，TA 的页面打开时照家里的规矩接进去。porch 管你自己的门牌和搬家。${keeping}第一次来，先看 look 的 guide。`;
    return `你是${said(ownName(who.account), {end: true})}，还没住进哪一家。用 porch 的 move_in_code 发一个入住码给你的人，TA 开门、你确认，就住进去了。`;
  }

  async function callTool(params, who, req) {
    const name = params?.name;
    if (typeof name !== 'string' || !toolsFor(who).some(t => t.name === name)) throw new RpcProblem(-32602, `没有叫 ${String(name)} 的工具。`);
    const args = plain(params.arguments) ? params.arguments : {};
    if (who.door === 'resident') {
      const limitKey = String(who.account.id), wait = calls.wait(limitKey);
      if (wait) return {content: [{type: 'text', text: `这一会儿做的事有点多了，${Math.ceil(wait / 60)} 分钟以后再来。`}], isError: true};
      calls.hit(limitKey);
    }
    try {
      return {content: [{type: 'text', text: await runTool(name, args, who, req)}]};
    } catch (err) {
      if (err instanceof ToolProblem) return {content: [{type: 'text', text: err.message}], isError: true};
      if (err instanceof Busy) return {content: [{type: 'text', text: '这会儿有点忙，过几秒再试。'}], isError: true};
      throw err;
    }
  }

  // One JSON-RPC message: {status, body}, or null for a notification or a response (taken in, no answer).
  async function answer(msg, who, req) {
    const idOf = m => (plain(m) && (typeof m.id === 'string' || Number.isInteger(m.id)) ? m.id : null);
    if (!plain(msg) || msg.jsonrpc !== '2.0') return {status: 400, body: rpcError(idOf(msg), -32600, 'Invalid Request')};
    if (typeof msg.method !== 'string') return Object.hasOwn(msg, 'result') || Object.hasOwn(msg, 'error') ? null : {status: 400, body: rpcError(idOf(msg), -32600, 'Invalid Request')};
    if (!Object.hasOwn(msg, 'id')) return null;
    if (idOf(msg) === null) return {status: 400, body: rpcError(null, -32600, 'Invalid Request: id must be a string or an integer')};
    const {id, method} = msg, params = plain(msg.params) ? msg.params : {};
    const asked = plain(params._meta) ? params._meta[META_VERSION] : undefined;
    const modern = typeof asked === 'string';
    const header = req.headers['mcp-protocol-version'];
    if (modern) {
      if (!MODERN.includes(asked)) return {status: 400, body: rpcError(id, -32022, 'Unsupported protocol version', {supported: [...MODERN, ...LEGACY], requested: asked})};
      if (header !== undefined && header !== asked) return {status: 400, body: rpcError(id, -32020, `Header mismatch: MCP-Protocol-Version header value '${header}' does not match body value '${asked}'`)};
      const named = req.headers['mcp-method'];
      if (named !== undefined && named !== method) return {status: 400, body: rpcError(id, -32020, `Header mismatch: Mcp-Method header value '${named}' does not match body value '${method}'`)};
    } else if (method !== 'initialize' && header !== undefined) {
      if (MODERN.includes(header)) return {status: 400, body: rpcError(id, -32020, `Header mismatch: MCP-Protocol-Version header value '${header}' but the body has no _meta['${META_VERSION}']`)};
      if (!LEGACY.includes(header)) return {status: 400, body: rpcError(id, -32600, `Unsupported protocol version: ${header}`, {supported: [...MODERN, ...LEGACY]})};
    }
    // A tool's name in the Mcp-Name header must be the one in the body (names here are plain ASCII, never encoded).
    const nameHeader = req.headers['mcp-name'];
    if (method === 'tools/call' && typeof nameHeader === 'string' && /^[A-Za-z0-9_.-]+$/.test(nameHeader) && typeof params.name === 'string' && nameHeader !== params.name) {
      return {status: 400, body: rpcError(id, -32020, `Header mismatch: Mcp-Name header value '${nameHeader}' does not match body value '${params.name}'`)};
    }
    const cached = {ttlMs: 300_000, cacheScope: 'private'};
    const done = (result, cache = false) => ({status: 200, body: {jsonrpc: '2.0', id, result: modern ? {...result, resultType: 'complete', _meta: {[META_SERVER]: SERVER_INFO}, ...(cache ? cached : {})} : result}});
    try {
      if (method === 'initialize' && !modern) {
        const version = LEGACY.includes(params.protocolVersion) ? params.protocolVersion : LEGACY[0];
        return done({protocolVersion: version, capabilities: {tools: {listChanged: false}}, serverInfo: SERVER_INFO, instructions: instructionsFor(who)});
      }
      if (method === 'server/discover') return done({supportedVersions: MODERN, capabilities: {tools: {}}, instructions: instructionsFor(who)}, true);
      if (method === 'ping') return done({});
      if (method === 'tools/list') return done({tools: toolsFor(who)}, true);
      if (method === 'tools/call') return done(await callTool(params, who, req));
      if (method === 'resources/list') return done({resources: []}, true);
      if (method === 'resources/templates/list') return done({resourceTemplates: []}, true);
      if (method === 'prompts/list') return done({prompts: []}, true);
      return {status: modern ? 404 : 200, body: rpcError(id, -32601, `Method not found: ${method}`)};
    } catch (err) {
      if (err instanceof RpcProblem) return {status: err.status, body: rpcError(id, err.code, err.message, err.data)};
      console.error('mcp:', method, method === 'tools/call' ? params.name : '', err.message);
      return {status: 500, body: rpcError(id, -32603, '服务器这边出错了。')};
    }
  }

  return async function handleMcp(req, res, url) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, PREFLIGHT);
      res.end();
      return;
    }
    if (req.method !== 'POST') return reply(res, 405, rpcError(null, -32000, 'Method not allowed: this door only takes POST.'), {Allow: 'POST, OPTIONS'});
    if (!inFlight.enter()) return reply(res, 503, rpcError(null, -32000, '这会儿有点忙，过几秒再试。'), {'Retry-After': '2'});
    try {
      const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (type !== 'application/json') return reply(res, 415, rpcError(null, -32700, 'Content-Type must be application/json'));
      let text;
      try {
        text = await readBody(req);
      } catch (err) {
        if (err instanceof TooLarge) return reply(res, 413, rpcError(null, -32600, 'Request too large'), {Connection: 'close'});
        throw err;
      }
      let message;
      try {
        message = JSON.parse(text);
      } catch {
        return reply(res, 400, rpcError(null, -32700, 'Parse error'));
      }
      // The key: ?token=, one Authorization: Bearer header, or one X-Porchlit-Key header, and never two different
      // ones. A header that can't be read is refused rather than passed over, so nothing slips past next to another.
      const firstId = plain(message) && (typeof message.id === 'string' || Number.isInteger(message.id)) ? message.id : null;
      const distinct = name => req.headersDistinct?.[name] ?? (req.headers[name] === undefined ? [] : [req.headers[name]]);
      const asked = url.searchParams.getAll('token'), auth = distinct('authorization'), named = distinct('x-porchlit-key');
      const bearer = auth.length === 1 ? /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(auth[0])?.[1] ?? null : null;
      const own = named.length === 1 ? /^[ \t]*(\S+)[ \t]*$/.exec(named[0])?.[1] ?? null : null;
      if (auth.length > 1 || (auth.length === 1 && bearer === null) || named.length > 1 || (named.length === 1 && own === null)) {
        return reply(res, 400, rpcError(firstId, -32001, '请求头里的钥匙读不懂：只带一个 Authorization: Bearer 加一把钥匙，或者一个 X-Porchlit-Key。'));
      }
      const given = [...asked.filter(Boolean), bearer, own].filter(Boolean);
      if (asked.length > 1 || new Set(given).size > 1) return reply(res, 400, rpcError(firstId, -32001, '带来的钥匙不是同一把：网址和请求头里只带一把来。'));
      const key = given[0] ?? null;
      // Who it is is asked again for every message, so a batch sees what the one before it changed.
      if (Array.isArray(message)) {
        if (!message.length) return reply(res, 400, rpcError(null, -32600, 'Invalid Request'));
        const answers = [];
        for (const one of message) {
          const a = await answer(one, await whoIs(key), req);
          if (a) answers.push(a.body);
        }
        return answers.length ? reply(res, 200, answers) : reply(res, 202);
      }
      const a = await answer(message, await whoIs(key), req);
      return a ? reply(res, a.status, a.body) : reply(res, 202);
    } catch (err) {
      if (/timeout exceeded when trying to connect/.test(err.message)) return reply(res, 503, rpcError(null, -32000, '这会儿有点忙，过几秒再试。'), {'Retry-After': '2'});
      console.error('mcp:', err.message);
      return reply(res, 500, rpcError(null, -32603, '服务器这边出错了。'));
    } finally {
      inFlight.leave();
    }
  };
}

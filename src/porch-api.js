// Calls to the account and save API (server/api.mjs, docs/ACCOUNTS.md) from
// the house page. Every failure comes back as a PorchError with the server's
// code and a message for people. "offline" means no usable answer at all:
// nothing came back, or something that isn't the API (a hotel wifi page).

export class PorchError extends Error {
  constructor(status, code, message, {retryAfter = null, body = null} = {}) {
    super(message);
    Object.assign(this, {status, code, retryAfter, body});
  }
}

const offline = () => new PorchError(0, 'offline', '连不上云。');
const isRevision = n => Number.isSafeInteger(n) && n >= 0;
const isSave = d => d && isRevision(d.revision) && (d.doc === null || (typeof d.doc === 'object' && !Array.isArray(d.doc)));
const isSession = d => d && typeof d.session?.token === 'string' && d.account && d.account.id !== undefined && typeof d.account.username === 'string';

export function createPorchApi({base = '', fetch = globalThis.fetch.bind(globalThis), token = () => null, timeoutMs = 20000} = {}) {
  // `shape` checks a successful answer looks like the API's.
  async function call(method, path, {body, auth = true, timeout = timeoutMs, shape = () => true, keepalive = false} = {}) {
    const headers = {Accept: 'application/json'};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // The key this request went with: a 401 for an old key the page has
    // since replaced must not sign anyone out.
    let sent = null;
    if (auth) {
      sent = token();
      if (!sent) throw new PorchError(401, 'signed_out', '要先点灯（登录）。');
      headers.Authorization = 'Bearer ' + sent;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let res, text;
    try {
      res = await fetch(base + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, cache: 'no-store', keepalive});
      text = await res.text();
    } catch {
      throw offline();
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = undefined;
      }
    }
    if (res.ok) {
      if (data === undefined || (res.status !== 204 && !shape(data))) throw offline();
      return data;
    }
    if (!data?.error?.code) {
      if (res.status !== 401) throw offline();
      throw Object.assign(new PorchError(401, 'signed_out', '登录过期了。'), {sentToken: sent});
    }
    const retry = Number(res.headers.get('Retry-After'));
    throw Object.assign(new PorchError(res.status, data.error.code, data.error.message || '云那边出了点问题。', {retryAfter: Number.isFinite(retry) && retry > 0 ? retry : null, body: data}), {sentToken: sent});
  }

  // A save may be large: allow for a slow line, about 40 KB a second.
  const timeFor = bytes => 30000 + Math.ceil(bytes / 40000) * 1000;

  return {
    // Hanging a door plate: with a session, or (short answers to be read first) {pending: true} and none yet.
    register: ({username, password, nickname, invite, answers, adult}) => call('POST', '/api/accounts', {auth: false, body: {username, password, adult: adult === true, ...(nickname ? {nickname} : {}), ...(invite ? {invite} : answers ? {answers} : {})}, shape: d => Array.isArray(d?.recoveryCodes) && (isSession(d) || (d.pending === true && typeof d.account?.username === 'string'))}),
    // What hanging a door plate takes: whether an invitation is needed (server/invites.mjs), and whether answering
    // questions will do instead (server/entry.mjs); and a newcomer's questions.
    plateRules: () => call('GET', '/api/accounts', {auth: false, shape: d => typeof d?.invite === 'boolean'}),
    entryQuestions: () => call('GET', '/api/entry-questions', {auth: false, shape: d => Array.isArray(d?.questions)}),
    signIn: ({username, password}) => call('POST', '/api/sessions', {auth: false, body: {username, password}, shape: isSession}),
    signOut: () => call('DELETE', '/api/sessions/current'),
    me: () => call('GET', '/api/me', {shape: d => d?.account && typeof d.account.username === 'string'}),
    changePassword: ({currentPassword, newPassword}) => call('POST', '/api/me/password', {body: {currentPassword, newPassword}, shape: d => typeof d?.session?.token === 'string'}),
    // A fresh set of spare keys: the old ones left stop working (server/api.mjs).
    renewCodes: currentPassword => call('POST', '/api/me/recovery-codes', {body: {currentPassword}, shape: d => Array.isArray(d?.recoveryCodes) && d.recoveryCodes.every(c => typeof c === 'string')}),
    recover: ({username, code, newPassword}) => call('POST', '/api/recovery', {auth: false, body: {username, code, newPassword}, shape: isSession}),
    getSave: ({timeout = 60000} = {}) => call('GET', '/api/home/save', {timeout, shape: isSave}),
    getRevision: () => call('GET', '/api/home/revision', {shape: d => d && isRevision(d.revision)}),
    putSave: ({revision, saveId, doc, keep, bytes = 0, keepalive = false}) => call('PUT', '/api/home/save', {
      body: {revision, ...(saveId ? {saveId} : {}), doc, ...(keep ? {keep: true} : {})},
      timeout: timeFor(bytes),
      keepalive,
      shape: d => d && isRevision(d.revision)
    }),
    history: () => call('GET', '/api/home/history', {shape: d => Array.isArray(d?.versions)}),
    historyCopy: id => call('GET', '/api/home/history/' + encodeURIComponent(id), {timeout: 60000, shape: d => d?.version && typeof d.version.doc === 'object'}),
    keepCopy: ({doc, bytes = 0}) => call('POST', '/api/home/history', {body: {doc}, timeout: timeFor(bytes), shape: d => d?.version}),
    // The community map (server/streets.mjs).
    street: id => call('GET', '/api/streets/' + encodeURIComponent(id), {shape: d => d?.street && Array.isArray(d.homes) && Number.isInteger(d.streets)}),
    setPorch: porch => call('PUT', '/api/home/porch', {body: {porch}, shape: d => typeof d?.porch === 'string'}),
    // Doors (server/doors.mjs): someone else's, and one's own.
    door: ({street, lot, day}) => call('GET', `/api/doors/${encodeURIComponent(street)}/${encodeURIComponent(lot)}?day=${encodeURIComponent(day)}`, {shape: d => typeof d?.name === 'string' && typeof d.porch === 'string'}),
    knock: ({street, lot, day}) => call('POST', `/api/doors/${encodeURIComponent(street)}/${encodeURIComponent(lot)}/knock`, {body: {day}, shape: d => d?.knocked === true}),
    leaveMail: ({street, lot, day, note, item, requestId}) => call('POST', `/api/doors/${encodeURIComponent(street)}/${encodeURIComponent(lot)}/mail`, {body: {day, requestId, ...(note ? {note} : {}), ...(item ? {item} : {})}, timeout: 60000, shape: d => d?.left === true}),
    ownDoor: () => call('GET', '/api/home/door', {shape: d => Array.isArray(d?.waiting) && Array.isArray(d?.book)}),
    takeMail: id => call('POST', `/api/home/door/${encodeURIComponent(id)}/take`, {shape: d => d?.status === 'taken'}),
    declineMail: id => call('POST', `/api/home/door/${encodeURIComponent(id)}/decline`, {shape: d => d?.status === 'declined'}),
    seeKnocks: () => call('POST', '/api/home/door/knocks', {shape: d => Number.isInteger(d?.seen)}),
    // Blocking whoever made a visit, and taking a name off the list.
    block: visit => call('POST', '/api/home/blocks', {body: {visit}, shape: d => typeof d?.blocked?.id === 'string'}),
    unblock: id => call('DELETE', `/api/home/blocks/${encodeURIComponent(id)}`),
    // The invitations the home the place is run by writes (server/invites.mjs).
    invites: () => call('GET', '/api/keeper/invites', {shape: d => Array.isArray(d?.invites)}),
    writeInvite: label => call('POST', '/api/keeper/invites', {body: label ? {label} : {}, shape: d => typeof d?.invite?.code === 'string'}),
    tearInvite: id => call('DELETE', `/api/keeper/invites/${encodeURIComponent(id)}`),
    // The questions a newcomer without an invitation answers, as the home the place is run by keeps them.
    entry: () => call('GET', '/api/keeper/entry', {shape: d => d?.door && Array.isArray(d.questions)}),
    setEntry: door => call('PUT', '/api/keeper/entry', {body: door, shape: d => typeof d?.door?.open === 'boolean'}),
    addQuestion: q => call('POST', '/api/keeper/entry/questions', {body: q, shape: d => typeof d?.question?.id === 'string'}),
    editQuestion: (id, q) => call('PUT', `/api/keeper/entry/questions/${encodeURIComponent(id)}`, {body: q, shape: d => typeof d?.question?.id === 'string'}),
    removeQuestion: id => call('DELETE', `/api/keeper/entry/questions/${encodeURIComponent(id)}`),
    decideEntry: (id, letIn) => call('POST', `/api/keeper/entry/answers/${encodeURIComponent(id)}/${letIn ? 'in' : 'out'}`, {shape: d => typeof d?.entry?.id === 'string'}),
    // Reporting something left at one's door ({visit}), a home met on the street ({door}) or a drift bottle found
    // ({bottle}), and the reports as
    // the home the place is run by reads and closes them (server/reports.mjs).
    report: ({visit, door, bottle, reason, words}) => call('POST', '/api/reports', {body: {...(visit ? {visit} : bottle ? {bottle} : {door}), reason, ...(words ? {words} : {})}, shape: d => typeof d?.reported?.id === 'string'}),
    reports: () => call('GET', '/api/keeper/reports', {shape: d => Array.isArray(d?.open) && Array.isArray(d?.closed)}),
    reportCopy: id => call('GET', `/api/keeper/reports/${encodeURIComponent(id)}`, {timeout: 60000, shape: d => typeof d?.report?.id === 'string'}),
    closeReport: (id, how) => call('POST', `/api/keeper/reports/${encodeURIComponent(id)}/${how}`, {shape: d => typeof d?.report?.id === 'string'}),
    // AIs living in the home (server/residents.mjs): who lives here and the doors opened that wait for one; whose a
    // move-in code is, and opening the door to it; calling that off; asking one to move out; a new password for one.
    residents: () => call('GET', '/api/home/residents', {shape: d => Array.isArray(d?.residents) && Array.isArray(d.waiting)}),
    peekMoveIn: code => call('POST', '/api/home/move-ins/peek', {body: {code}, shape: d => typeof d?.moveIn?.ai?.name === 'string'}),
    openMoveIn: code => call('POST', '/api/home/move-ins', {body: {code}, shape: d => typeof d?.request?.id === 'string'}),
    cancelMoveIn: id => call('DELETE', `/api/home/move-ins/${encodeURIComponent(id)}`),
    sendAway: id => call('DELETE', `/api/home/residents/${encodeURIComponent(id)}`),
    residentPassword: (id, {currentPassword, newPassword}) => call('POST', `/api/home/residents/${encodeURIComponent(id)}/password`, {body: {currentPassword, newPassword}, shape: d => typeof d?.resident?.id === 'string'}),
    // The invitation held for one's own AI (server/invites.mjs): whether the street asks for one, the one held (or
    // null); taking one (the one held, or a new one); tearing it up.
    aiInvite: () => call('GET', '/api/home/ai-invite', {shape: d => typeof d?.needed === 'boolean'}),
    takeAiInvite: () => call('POST', '/api/home/ai-invite', {shape: d => typeof d?.invite?.code === 'string'}),
    tearAiInvite: () => call('DELETE', '/api/home/ai-invite'),
    // Drift bottles (server/bottles.mjs): what has been thrown from this home (and whether one was today, this day),
    // throwing one, and opening one a walk brought home from the lake.
    bottles: day => call('GET', '/api/bottles?day=' + encodeURIComponent(day), {shape: d => Array.isArray(d?.thrown) && typeof d.today === 'boolean'}),
    throwBottle: ({words, day, requestId}) => call('POST', '/api/bottles', {body: {words, day, requestId}, shape: d => typeof d?.bottle?.id === 'string'}),
    openBottle: key => call('POST', '/api/bottles/open', {body: {key}, shape: d => typeof d?.bottle?.id === 'string' || d?.empty === true || d?.later === true}),
    // What they asked to do in the home, waiting for this page to let it in (server/acts.mjs).
    acts: () => call('GET', '/api/home/acts', {shape: d => Array.isArray(d?.acts)}),
    // What the wardrobe has today and what each of the two has on (src/machine-closet.js), for the AIs living here.
    closet: closet => call('PUT', '/api/home/closet', {body: {closet}})
  };
}

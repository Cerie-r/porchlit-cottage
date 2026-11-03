// What the pages use that a browser may not have: older ones (Safari before 15.4, older Android web views), and any
// browser on a page opened over plain http, which isn't a secure context and so has no crypto.randomUUID. Each is put
// in only where it is missing. Imported first by every page (src/main.jsx, body/app.js, avatar/app.js,
// src/transfer-page.js).

// A random version 4 UUID, from getRandomValues (there in every context) or, failing that, Math.random.
export function uuidFrom(fill = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)) {
  const b = new Uint8Array(16);
  if (typeof fill === 'function') fill(b); else for (let i = 0; i < 16; i++) b[i] = (Math.random() * 256) | 0;
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// at(): the item counted from the end for a negative index.
export function at(n) {
  n = Math.trunc(n) || 0;
  if (n < 0) n += this.length;
  return n < 0 || n >= this.length ? undefined : this[n];
}

const put = (target, name, value) => {
  try { Object.defineProperty(target, name, {value, writable: true, configurable: true}); } catch { try { target[name] = value; } catch {} }
};
// Fills in what `scope` lacks (globalThis by default). Returns the names it filled in.
export function fillIn(scope = globalThis) {
  const filled = [];
  if (scope.crypto && typeof scope.crypto.randomUUID !== 'function') {
    put(scope.crypto, 'randomUUID', () => uuidFrom(scope.crypto.getRandomValues?.bind(scope.crypto)));
    filled.push('crypto.randomUUID');
  }
  for (const [name, C] of [['Array', scope.Array], ['String', scope.String], ['TypedArray', scope.Int8Array && Object.getPrototypeOf(scope.Int8Array)]]) {
    if (C?.prototype && typeof C.prototype.at !== 'function') { put(C.prototype, 'at', at); filled.push(`${name}.prototype.at`); }
  }
  if (scope.Object && typeof scope.Object.hasOwn !== 'function') {
    put(scope.Object, 'hasOwn', (o, k) => Object.prototype.hasOwnProperty.call(o, k));
    filled.push('Object.hasOwn');
  }
  // What the pages copy this way is plain data, saved as JSON anyway.
  if (typeof scope.structuredClone !== 'function') {
    put(scope, 'structuredClone', v => (v === undefined ? v : JSON.parse(JSON.stringify(v))));
    filled.push('structuredClone');
  }
  return filled;
}

fillIn();

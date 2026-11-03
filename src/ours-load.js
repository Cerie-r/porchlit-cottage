// This home's own things (src/ours/), fetched only when the account signed in here is this home's: the server says
// so (/api/me's `ours`), and is asked again for the things themselves, with the porch light's session going along
// as a cookie only /ours/ ever sees (server/ours.mjs). Nobody else is sent them. Under Vite's dev server they are
// simply there.
import fetchPack from '@ours-parts';
import {oursPack} from './ours-pack.js';

const SESSION = 'porchlit-porch-session-v1', FLAG = 'porchlit-ours-v1';
const pack = oursPack(fetchPack);
const read = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};
const sessionHere = () => {
  const s = read(SESSION);
  return typeof s?.token === 'string' ? s : null;
};
function handOver(token) {
  try {
    document.cookie = token
      ? `porchlit-ours=${encodeURIComponent(token)}; Path=/ours; SameSite=Strict; Max-Age=2592000${location.protocol === 'https:' ? '; Secure' : ''}`
      : 'porchlit-ours=; Path=/ours; SameSite=Strict; Max-Age=0';
  } catch {}
}

// This home, as far as this device knows: the account signed in here was this home's when the server last said. The
// house waits for the things before drawing then, so nothing of them is missing at first.
export function oursExpected() {
  if (import.meta.env.DEV) return true;
  const s = sessionHere();
  return !!s && read(FLAG) === String(s.account?.id);
}

// Fetches them (once; again after a failure). With a timeout, whether they came within it.
export function loadOurs({timeout = 0} = {}) {
  if (!import.meta.env.DEV) {
    const s = sessionHere();
    if (!s) return Promise.resolve(false);
    handOver(s.token);
  }
  return pack.load({timeout});
}

// What the server said about the account signed in here (null: nobody is), kept for next time; when it's this home's
// account, its things are fetched if they haven't come yet.
export function noteOurs(account, ours) {
  try {
    if (account && ours) localStorage.setItem(FLAG, JSON.stringify(String(account.id)));
    else {
      localStorage.removeItem(FLAG);
      handOver(null);
    }
  } catch {}
  if (account && ours && !pack.loaded()) loadOurs();
}

export const oursLoaded = () => pack.loaded();
// Called once they've come (returns a function to stop listening).
export const onOursLoaded = heard => pack.onLoad(heard);

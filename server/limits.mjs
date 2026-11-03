// In-memory limits. With one web process they cover everyone; with several,
// each process keeps its own, which loosens them by that factor. Each returns
// how many seconds to wait, or 0 to go ahead.

// A bucket of `size` that refills one every `every` milliseconds.
export function bucket({size, every, now = Date.now}) {
  let tokens = size;
  let last = now();
  return {
    take() {
      const t = now();
      tokens = Math.min(size, tokens + (t - last) / every);
      last = t;
      if (tokens >= 1) {
        tokens -= 1;
        return 0;
      }
      return Math.max(1, Math.ceil(((1 - tokens) * every) / 1000));
    }
  };
}

// Up to `limit` hits per key in a window that starts at the first hit. When
// it has to make room it drops expired windows first, then the oldest that
// haven't reached the limit; a key that is at the limit is the last to go,
// so a flood of other keys can't lift it.
export function perKey({limit, window, now = Date.now, maxKeys = 10000}) {
  const hits = new Map();
  const prune = t => {
    for (const [key, h] of hits) if (h.until <= t) hits.delete(key);
    for (const [key, h] of hits) {
      if (hits.size <= maxKeys) break;
      if (h.count < limit) hits.delete(key);
    }
    while (hits.size > maxKeys) hits.delete(hits.keys().next().value);
  };
  return {
    wait(key) {
      const t = now();
      const h = hits.get(key);
      return h && h.until > t && h.count >= limit ? Math.max(1, Math.ceil((h.until - t) / 1000)) : 0;
    },
    hit(key) {
      const t = now();
      let h = hits.get(key);
      if (!h || h.until <= t) {
        h = {count: 0, until: t + window};
        hits.set(key, h);
        if (hits.size > maxKeys) prune(t);
      }
      h.count += 1;
    },
    // Takes back the last hit (the try never really happened).
    undo(key) {
      const h = hits.get(key);
      if (h && h.count > 0) h.count -= 1;
    },
    clear(key) {
      hits.delete(key);
    }
  };
}

// The account doors' limits: the people's (server/api.mjs) and the AIs' (server/mcp.mjs). One set is made for the
// whole process and handed to both, so a password or recovery code tried at one door counts at the other too, and
// sign-ups share one burst. `settings` may change the sizes (tests do).
export const ACCOUNT_LIMITS = {
  signups: {size: 5, every: 60_000}, // a burst of five, then one a minute
  signins: {limit: 10, window: 15 * 60_000}, // per account
  recoveries: {limit: 5, window: 60 * 60_000} // per account
};
export function accountLimits(settings = {}) {
  const s = {...ACCOUNT_LIMITS, ...settings};
  return {signups: bucket(s.signups), signins: perKey(s.signins), recoveries: perKey(s.recoveries)};
}

// How many requests are being handled at once.
export function capacity(max) {
  let busy = 0;
  return {
    enter() {
      if (busy >= max) return false;
      busy += 1;
      return true;
    },
    leave() {
      busy -= 1;
    }
  };
}

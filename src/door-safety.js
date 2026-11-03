// Shared mailbox limits: checked before drawing, storing or accepting a gift.
export const SMALL_GIFT_LIMIT = 32 * 1024;
export const PHOTO_LIMIT = 300 * 1024;
export const validText = value => typeof value === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
export const cutText = (value, count) => [...value].slice(0, count).join('');
export const own = (catalog, key) => typeof key === 'string' && Object.hasOwn(catalog, key);
export const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

export function safePayload(value, limit = SMALL_GIFT_LIMIT) {
  try {
    let nodes = 0;
    const walk = (v, depth) => {
      if (++nodes > 10000 || depth > 12) return false;
      if (typeof v === 'string') return validText(v);
      if (typeof v === 'number') return Number.isFinite(v);
      if (v === null || typeof v === 'boolean') return true;
      if (!Array.isArray(v) && !record(v)) return false;
      return Object.entries(v).every(([k, x]) => validText(k) && walk(x, depth + 1));
    };
    return walk(value, 0) && new TextEncoder().encode(JSON.stringify(value)).length <= limit;
  } catch { return false; }
}

export function smallPng(image) {
  if (typeof image !== 'string' || image.length > PHOTO_LIMIT || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return false;
  try {
    const raw = atob(image.slice(22));
    if (raw.length < 57 || raw.slice(0, 8) !== '\x89PNG\r\n\x1a\n') return false;
    const n = at => (raw.charCodeAt(at) * 0x1000000 + (raw.charCodeAt(at + 1) << 16) + (raw.charCodeAt(at + 2) << 8) + raw.charCodeAt(at + 3));
    if (n(8) !== 13 || raw.slice(12, 16) !== 'IHDR' || n(16) < 1 || n(16) > 640 || n(20) < 1 || n(20) > 480) return false;
    let at = 8, data = false;
    while (at + 12 <= raw.length) {
      const size = n(at), kind = raw.slice(at + 4, at + 8);
      if (at + 12 + size > raw.length) return false;
      if (kind === 'IDAT') data = true;
      if (kind === 'IEND') return data && size === 0 && at + 12 === raw.length;
      at += 12 + size;
    }
    return false;
  } catch { return false; }
}

// Usernames, nicknames and passwords, read the same way on every path:
// sign-up, sign-in, password change and recovery.

export const codePoints = s => [...s].length;

// Names kept back so nobody can pass as the house itself.
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'staff', 'moderator', 'mod',
  'official', 'help', 'api', 'www', 'mail', 'null', 'undefined',
  '官方', '管理员', '客服', '系统'
]);
const RESERVED_PREFIXES = ['porchlit', '官方', '管理员'];
const NAME_CHARS = /^[\p{L}\p{M}\p{N}_.-]+$/u;
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

// Shown back as written, with compatibility forms folded (full-width letters
// become ordinary ones). Case is kept.
export const displayUsername = raw => raw.normalize('NFKC');

// The form that has to be unique: compatibility forms and case both folded,
// so "Wren", "wren" and "ＷＲＥＮ" are the same name.
export const usernameKey = raw => raw.normalize('NFKC').toLowerCase().normalize('NFKC');

// Names kept for someone who hasn't got a door yet: PORCHLIT_KEPT_NAMES, comma-separated, read each time. Others are
// told it's taken, the same as any taken name. An AI signing up at the MCP door with an invitation (server/mcp.mjs)
// may claim one.
export const keptForLater = () => new Set((process.env.PORCHLIT_KEPT_NAMES || '').split(',').map(s => s.trim()).filter(Boolean).map(usernameKey));

// Length and characters only. Sign-in and recovery use this to turn away
// names that couldn't exist; a kept-back name that does exist can still sign
// in. Very long input is refused before normalising, which can multiply its
// length many times over.
export function usernameShapeProblem(raw) {
  if (typeof raw !== 'string' || !raw) return '要填一个用户名。';
  if (raw.length > 256) return '用户名要 2 到 32 个字。';
  const key = usernameKey(raw);
  const n = codePoints(key);
  if (n < 2 || n > 32) return '用户名要 2 到 32 个字。';
  if (!NAME_CHARS.test(key)) return '用户名只能用文字、数字和 _ . -，不能有空格。';
  return null;
}

// For a new name: the shape, and not one of the kept-back names (`claim`: one
// kept for later may be taken, see keptForLater).
export function usernameProblem(raw, {claim = false} = {}) {
  const shape = usernameShapeProblem(raw);
  if (shape) return shape;
  const key = usernameKey(raw);
  if (RESERVED.has(key) || RESERVED_PREFIXES.some(p => key.startsWith(p))) return '这个名字留着不给用。';
  if (!claim && keptForLater().has(key)) return '这个名字已经有人用了。';
  return null;
}

// Nicknames are shown to others and needn't be unique. Empty means "use the
// username".
export function nicknameOf(raw, username) {
  if (raw === undefined || raw === null || raw === '') return {nickname: username};
  if (typeof raw !== 'string') return {problem: '昵称要是一段文字。'};
  const nickname = raw.normalize('NFKC').trim();
  if (!nickname) return {nickname: username};
  if (codePoints(nickname) > 32) return {problem: '昵称最多 32 个字。'};
  if (CONTROL.test(nickname)) return {problem: '昵称里有看不见的字符。'};
  return {nickname};
}

// Six, not eight: she wanted it easy to remember for whoever signs up (10/23).
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

// NFKC and nothing else: no lower-casing, no trimming, no cutting. A
// full-width password and its ordinary form are the same password.
export const normalizePassword = raw => (typeof raw === 'string' ? raw.normalize('NFKC') : null);

// For a password being set (sign-up, change, recovery). Counted in code
// points, so an emoji is one, not two.
export function passwordProblem(raw) {
  const password = normalizePassword(raw);
  if (password === null) return '要填一个密码。';
  const n = codePoints(password);
  if (n < PASSWORD_MIN) return `密码至少要 ${PASSWORD_MIN} 个字。`;
  if (n > PASSWORD_MAX) return `密码最多 ${PASSWORD_MAX} 个字。`;
  return null;
}

// For a password being checked (sign-in, the current one when changing): only
// the upper limit, so it isn't hashed at any length.
export function enteredPasswordProblem(raw) {
  const password = normalizePassword(raw);
  if (password === null) return '要填密码。';
  if (codePoints(password) > PASSWORD_MAX) return `密码最多 ${PASSWORD_MAX} 个字。`;
  return null;
}

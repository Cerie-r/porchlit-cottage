// A name set into a Chinese sentence: a space where it meets the Chinese, on
// whichever side it begins or ends in a letter or digit ("跟 Wren 学会了",
// "跟小雀学会了").
export const inLine = name => {
  const n = String(name ?? '').trim();
  return (/^[A-Za-z0-9]/.test(n) ? ' ' : '') + n + (/[A-Za-z0-9]$/.test(n) ? ' ' : '');
};
// At the start of a sentence only the end matters.
export const leading = name => inLine(name).trimStart();

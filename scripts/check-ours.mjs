// After a build: nothing of a home's own things (src/ours/) is in the files everyone gets. Those are everything in
// dist/ except dist/ours/, which only that home is sent (server/ours.mjs). Looked for: every picture there byte for
// byte, every string written there that the public code never writes (an outfit's id, a note's words), and a public
// file that needs one of dist/ours/ to start (it would break for everyone else). Exits non-zero, failing the build
// and so the deploy, if anything is found. Run as part of `npm run build`; `node scripts/check-ours.mjs [dist]`.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, sep} from 'node:path';

const dist = process.argv[2] || 'dist', ours = 'src/ours';
const walk = dir => readdirSync(dir).flatMap(name => {
  const file = join(dir, name);
  return statSync(file).isDirectory() ? walk(file) : [file];
});
if (!existsSync(ours)) {
  console.log('check-ours: no src/ours/, nothing to look for.');
  process.exit(0);
}
const isOurs = file => relative(dist, file).split(sep)[0] === 'ours';
const everyone = walk(dist).filter(file => !isOurs(file));
const text = file => /\.(js|mjs|css|html|json|svg|txt|map)$/.test(file);

// The strings: what names a home's own thing or is written in it, that no public source writes too: values given as
// an id, a name, a label or a text, a mesh's name, anything written in Chinese, and the files' own names.
const publicSources = ['src', 'body', 'index.html', 'transfer', 'avatar']
  .flatMap(path => (existsSync(path) ? (statSync(path).isDirectory() ? walk(path) : [path]) : []))
  .filter(file => !file.startsWith(ours + sep) && /\.(js|jsx|mjs|html|css)$/.test(file))
  .map(file => readFileSync(file, 'utf8')).join('\n');
const marks = new Set(), quoted = String.raw`(['"\x60])((?:(?!\1)[^\\\n]|\\.)+?)\1`;
for (const file of walk(ours).filter(file => /\.(js|jsx)$/.test(file))) {
  const source = readFileSync(file, 'utf8'), base = file.split(sep).pop().replace(/\.(js|jsx)$/, '');
  const named = [base, ...[...source.matchAll(new RegExp(String.raw`\b(?:id|name|label|text|title)\s*[:=]\s*` + quoted, 'g'))].map(m => m[2]),
    ...[...source.matchAll(new RegExp(quoted, 'g'))].map(m => m[2]).filter(t => /[\u3000-\u9fff]/.test(t))];
  for (const literal of named) if (literal.length >= 4 && !literal.includes('${') && !publicSources.includes(literal)) marks.add(literal);
}
const pictures = walk(ours).filter(file => /\.(webp|png|jpe?g|gif|glb|mp3|ogg|wav)$/.test(file)).map(file => readFileSync(file));

const found = [];
for (const file of everyone) {
  const bytes = readFileSync(file);
  if (pictures.some(p => p.length === bytes.length && p.equals(bytes))) found.push(`${file}: a picture from ${ours}/`);
  if (!text(file)) continue;
  const content = bytes.toString('utf8');
  for (const mark of marks) if (content.includes(mark)) found.push(`${file}: ${JSON.stringify(mark.slice(0, 40))}`);
  // A static import of a file in ours/ (a dynamic import(...) of one is how the house asks for them).
  if (/\.(js|mjs)$/.test(file) && /(?:^|[;}\s])import\s*(?:[\w${}*,\s]+from\s*)?["'][^"']*\bours\/[^"']+["']/m.test(content)) found.push(`${file}: needs a file in ours/ to start`);
}
if (found.length) {
  console.error(`check-ours: ${found.length} trace(s) of ${ours}/ in the public files:\n  ` + found.slice(0, 40).join('\n  '));
  process.exit(1);
}
console.log(`check-ours: ${everyone.length} public files carry nothing of ${ours}/ (${marks.size} strings and ${pictures.length} pictures looked for).`);

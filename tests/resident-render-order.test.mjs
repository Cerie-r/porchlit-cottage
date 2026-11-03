import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Part of LivingResidents runs while rendering (putting him where he hides, letting go of a lap or a
// lean). A ref used there before its `const` is a TDZ error that blanks the whole house, and only on
// the days he crouches behind something, so no other test meets it. Every ref must be declared
// before anything in the component reads it.
test('LivingResidents declares every ref before its first use', () => {
  const src = fs.readFileSync('src/resident-motion.jsx', 'utf8');
  const body = src.slice(src.indexOf('export function LivingResidents'));
  const refs = [...body.matchAll(/(?:const |,)(\w+)=useRef\(/g)].map(m => ({name: m[1], at: m.index}));
  assert.ok(refs.some(r => r.name === 'nestle') && refs.some(r => r.name === 'lap'));
  for (const {name, at} of refs) {
    const used = body.search(new RegExp(`\\b${name}\\.current`));
    assert.ok(used < 0 || used > at, `${name} is used before it is declared`);
  }
});

import assert from 'node:assert/strict';
import {animalOptions,validAnimal,speciesLooks,speciesEars} from '../src/animal-state.js';
import {catchable,availableSpecies,machineDoll,weeklyDolls,seeded,MACHINE_FORMS} from '../src/doll-catch.js';

// What goes round the machine: everything but the bear and the dragon.
assert.ok(!catchable.includes('bear'),'every home already has a bear');
assert.ok(!catchable.includes('dragon'),'the dragon waits for a holiday');
assert.equal(catchable.length,16);
for(const s of ['koala','otter','hedgehog','seal','lion'])assert.ok(catchable.includes(s),`${s} goes round the machine`);

// What the craft room offers.
assert.deepEqual(availableSpecies(),animalOptions.species.filter(s=>s!=='dragon'),'before anything is caught: everything that is not locked');
assert.deepEqual(availableSpecies([]),['bear'],'a new home has only the bear');
assert.deepEqual(availableSpecies(['lamb','mouse','dragon','lamb']),['bear','lamb','dragon'],'what was caught, once each, a caught dragon too, and never a mouse');

// A caught doll is a real doll of its kind, as the kind comes: its own colours, the face every doll starts with, and
// nothing worn (what dolls wear comes out of the capsule machine; colours are chosen at the doll table).
for(const s of [...catchable,'bear','dragon']){
  const d=machineDoll(s);
  assert.ok(validAnimal(d),`${s} is a valid doll`);
  assert.equal(d.species,s);assert.equal(d.name,speciesLooks[s].name);assert.equal(d.pose,'sit');
  assert.deepEqual([d.fur,d.cream,d.patch],[speciesLooks[s].fur,speciesLooks[s].cream,speciesLooks[s].patch],`${s} in its own colours`);
  assert.deepEqual(d.accessory,[]);
}
assert.deepEqual(machineDoll('lamb'),machineDoll('lamb'),'every doll of a kind alike');
// In the cabinet a doll comes in one of its kind's forms (ears, sitting or standing, face, slim or chubby), never in
// other colours, and never holding flowers it hasn't got.
{
  const rand=seeded(11),forms=new Set();
  for(let i=0;i<200;i++){
    const s=catchable[i%catchable.length],d=machineDoll(s,rand);
    assert.ok(validAnimal(d),`${s} in a form is a valid doll`);
    assert.deepEqual([d.fur,d.cream,d.patch],[speciesLooks[s].fur,speciesLooks[s].cream,speciesLooks[s].patch],`${s} keeps its own colours`);
    assert.ok(speciesEars[s].includes(d.ears)&&MACHINE_FORMS.pose.includes(d.pose)&&MACHINE_FORMS.expression.includes(d.expression)&&MACHINE_FORMS.body.includes(d.body),`${s}: ${d.ears} ${d.pose} ${d.expression} ${d.body}`);
    assert.deepEqual(d.accessory,[]);
    forms.add([d.ears===speciesEars[s][0],d.pose,d.expression,d.body].join());
  }
  assert.ok(!MACHINE_FORMS.pose.includes('hold'));
  assert.ok(forms.size>20,`all sorts of forms: ${forms.size}`);
}
assert.equal(machineDoll('mouse'),null,'no mice');

// This week's doll: steady for a street, every kind once a round, and streets differ.
const monday=Date.UTC(2026,9,26);
assert.deepEqual(weeklyDolls(new Date(monday),3),weeklyDolls(new Date(monday+3*24*3600*1000),3),'the same all week');
for(const seed of [0,1,7,42]){
  const round=Array.from({length:catchable.length},(_,w)=>weeklyDolls(new Date(monday+w*7*24*3600*1000),seed));
  assert.deepEqual(round.map(r=>r.featured).sort(),[...catchable].sort(),`street ${seed} shows every kind once in ${catchable.length} weeks`);
  for(const r of round){assert.equal(r.company.length,3);assert.equal(new Set([r.featured,...r.company]).size,4);assert.ok(r.company.every(s=>catchable.includes(s)));}
}
const streets=new Set([0,1,2,3,4,5].map(seed=>weeklyDolls(new Date(monday),seed).featured));
assert.ok(streets.size>1,'different streets can have different dolls the same week');
// Weeks before the first Monday still land on a kind.
assert.ok(catchable.includes(weeklyDolls(new Date(Date.UTC(2026,0,1)),2).featured));

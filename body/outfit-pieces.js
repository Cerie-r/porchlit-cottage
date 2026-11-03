// The public outfits beyond the base two (body/outfits.js): made in code, part of the public release,
// and meant for the capsule machine (see body/outfit-registry.js for what an entry is). One file for
// each set, a couple's two outfits together.
import {knitCouple} from './outfit-knit-couple.js';
import {tangCouple} from './outfit-tang-couple.js';
import {cakeDress} from './outfit-cake-dress.js';
import {hoodieCargo} from './outfit-hoodie.js';
import {duffleCouple} from './outfit-duffle-couple.js';
import {halloweenCouple} from './outfit-halloween-couple.js';
import {christmasCouple} from './outfit-christmas-couple.js';
import {pumpkinCouple} from './outfit-pumpkin-couple.js';

export const publicOutfits=[...knitCouple,...tangCouple,...duffleCouple,cakeDress,hoodieCargo,...halloweenCouple,...christmasCouple,...pumpkinCouple];

// What the house calls each AI living here, for whatever names one (the card, the found card in a close-up, the
// backpack, the computer's sticky notes): the name she gave it in this home (src/machine-acts.js, calledName), or its
// own. The page provides it once, at the top (src/main.jsx).
import {createContext} from 'react';

export const CalledContext = createContext(by => by?.name || '');

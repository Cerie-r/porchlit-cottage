// The one porch light for this page: the account and sync engine, talking to
// the API on the same server that serves the house.
import {createPorchApi} from './porch-api.js';
import {createPorch} from './porch-sync.js';

let porch = null;
const api = createPorchApi({token: () => porch?.token() ?? null});
porch = createPorch({api});

export default porch;

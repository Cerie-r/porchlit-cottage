// A home's own things (src/ours/), fetched only when asked for (src/ours-load.js): one module gathers them all. Vite
// builds it apart, into dist/ours/ (vite.config.js); a build without them uses ours-none.js instead.
export default () => import('./ours/index.js');

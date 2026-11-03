import {defineConfig} from 'vite';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// A home's own things (src/ours/: not part of the public release) are built apart, into dist/ours/, which the server
// gives only to that home (server/ours.mjs). None of their code, pictures or fit goes into the files everyone gets
// (scripts/check-ours.mjs looks, after every build). A build with no home of its own leaves them out altogether: a
// Cloudflare Pages preview (no server there to keep them), or a copy without src/ours/.
const here = file => fileURLToPath(new URL(file, import.meta.url));
const withOurs = existsSync(here('src/ours')) && !process.env.CF_PAGES;
const ours = name => /[\\/]src[\\/]ours[\\/]/.test(name);

export default defineConfig({
  resolve: {alias: {'@ours-parts': here(withOurs ? 'src/ours-parts.js' : 'src/ours-none.js')}},
  build: {
    rollupOptions: {
      // The early figure editor (avatar/) isn't in the public copy.
      input: {house: 'index.html', transfer: 'transfer/index.html', ...(existsSync(here('avatar/index.html')) ? {avatar: 'avatar/index.html'} : {}), body: 'body/index.html'},
      // Only the home's own modules make up the chunks src/ours-parts.js asks for (whatever else they use stays where
      // the public code has it), so those chunks go to ours/, under no name but their hash.
      output: {
        chunkFileNames: chunk => ((chunk.moduleIds || []).some(ours) ? 'ours/[hash].js' : 'assets/[name]-[hash].js'),
        assetFileNames: asset => ((asset.originalFileNames || []).some(name => ours('/' + name)) ? 'ours/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]')
      }
    }
  }
});

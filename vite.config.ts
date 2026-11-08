import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { renderPage } from './src/render.ts';

function revision(): string {
  try { return process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
  catch { return 'development'; }
}

// Only the pinned Commander dependency receives these narrow, fail-closed shims.
// No global Node polyfills or access to the host environment are introduced.
export function figletCommanderCompatibility(): Plugin {
  return {
    name: 'figlet-commander-compatibility', enforce: 'pre',
    resolveId(id, importer) {
      if (!importer?.replaceAll('\\', '/').includes('/node_modules/commander/')) return;
      if (id === 'node:events') return resolve('src/tools/figlet-events.ts');
      if (id === 'node:process') return resolve('src/tools/figlet-process.ts');
      if (['node:fs', 'node:path', 'node:child_process'].includes(id)) return resolve('src/tools/figlet-denied-node.ts');
    },
  };
}

export default defineConfig({
  worker: { plugins: () => [figletCommanderCompatibility()] },
  optimizeDeps: { rolldownOptions: { plugins: [figletCommanderCompatibility()] } },
  base: '/boot-loader/',
  build: { assetsInlineLimit: (file) => file.endsWith('.flf') ? false : undefined, rollupOptions: { input: { home: resolve('index.html'), visual: resolve('visual/index.html'), terminal: resolve('terminal/index.html') } } },
  plugins: [figletCommanderCompatibility(), {
    name: 'static-page-content',
    transformIndexHtml(html) {
      const page = html.includes('data-page="terminal"') ? 'terminal' : html.includes('data-page="visual"') ? 'visual' : 'home';
      return html.replace('<!--boot-loader-->', renderPage(page)).replace('</head>', `<meta name="boot-loader-revision" content="${revision()}" /></head>`);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ commit: revision() }) });
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
      this.emitFile({ type: 'asset', fileName: 'licenses/figlet-MIT.txt', source: readFileSync('node_modules/figlet/LICENSE.txt', 'utf8') });
      this.emitFile({ type: 'asset', fileName: 'licenses/commander-MIT.txt', source: readFileSync('node_modules/commander/LICENSE', 'utf8') });
    },
  }],
});

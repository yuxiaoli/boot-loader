import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { renderPage } from './src/render.ts';

function revision(): string {
  try { return process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
  catch { return 'development'; }
}

export default defineConfig({
  base: '/boot-loader/',
  build: { rollupOptions: { input: { home: resolve('index.html'), visual: resolve('visual/index.html'), terminal: resolve('terminal/index.html') } } },
  plugins: [{
    name: 'static-page-content',
    transformIndexHtml(html) {
      const page = html.includes('data-page="terminal"') ? 'terminal' : html.includes('data-page="visual"') ? 'visual' : 'home';
      return html.replace('<!--boot-loader-->', renderPage(page)).replace('</head>', `<meta name="boot-loader-revision" content="${revision()}" /></head>`);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ commit: revision() }) });
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
    },
  }],
});

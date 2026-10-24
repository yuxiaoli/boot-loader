import { destinations, repositoryUrl } from './destinations.ts';

type Page = 'home' | 'visual' | 'terminal';
const base = '/boot-loader/';

function header(page: Page): string {
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header wrap">
    <a class="brand" href="${base}" aria-label="Boot Loader home"><span class="brand-symbol" aria-hidden="true">&gt;_</span> Boot Loader<span class="brand-version">/ 1.0</span></a>
    <nav aria-label="Main navigation">
      <a href="${base}" ${page === 'home' ? 'aria-current="page"' : ''}>Overview</a>
      <a href="${base}visual/" ${page === 'visual' ? 'aria-current="page"' : ''}>Visual</a>
      <a href="${base}terminal/" ${page === 'terminal' ? 'aria-current="page"' : ''}>Terminal<span aria-hidden="true"> ↗</span></a>
    </nav>
    <a class="repo-link" href="${repositoryUrl}">GitHub <span aria-hidden="true">↗</span></a>
  </header>`;
}

function computer(): string {
  return `<div class="computer-drawing" aria-hidden="true">
  <svg class="computer" viewBox="0 0 600 410" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#d3d7dc"/></pattern></defs>
    <rect x="0" y="0" width="600" height="410" fill="url(#dots)"/>
    <g stroke="#b2bac5" stroke-width="1" stroke-dasharray="4 5"><path d="M60 346H552M103 33V368M504 32V363M61 72H551"/></g>
    <g stroke="#4a535f" stroke-linecap="round" stroke-linejoin="round">
      <path d="m150 69 284-18 62 31 1 212-36 17-303-18-28-29V89Z" fill="#edf0f4" stroke-width="1.8"/>
      <path d="m434 51 1 220 26 40 36-17-1-212Z" fill="#e2e6eb" stroke-width="1.5"/>
      <path d="m150 69 285 6v196l-277-2-8-200Z" fill="#fafbfc" stroke-width="1.8"/>
      <path d="m173 91 237 4 2 148-237-3Z" fill="#e9edf0" stroke-width="1.4"/>
      <path d="m181 99 221 3 2 130-221-3Z" fill="#f7f9fa" stroke-width="1.2"/>
      <path d="m271 273-6 42-37 17 124 3-38-19-3-43" fill="#e5e9ed" stroke-width="1.5"/>
      <path d="m265 315 49 1M228 332l-1 6 124 3 1-6" stroke-width="1.3"/>
      <path d="m140 338 251 3 32 33-298-5Z" fill="#f8f9fb" stroke-width="1.6"/>
      <path d="m125 369 1 9 297 5v-9M146 346l238 3 15 17-260-4Z" fill="#e8ecf0" stroke-width="1.3"/>
      <path d="m158 347-4 16m23-16-2 16m23-16-1 16m22-15v16m22-15v16m22-16 1 17m21-16 2 17m20-16 3 16m20-15 4 16m18-15 5 16m17-15 6 16M143 354l246 4M187 369l130 2" stroke="#a7afb9" stroke-width="1"/>
      <path d="M467 111v64m6-61v64m6-61v64m-12 26v35m6-38v35m6-38v35" stroke="#939da9" stroke-width="1.5"/>
      <rect x="177" y="251" width="28" height="4" rx="1" fill="#d9dee4" stroke-width="1"/>
      <circle cx="411" cy="257" r="3" fill="#40714d" stroke="none"/>
      <path d="M457 351c32-15 61-8 62 9 0 17-43 19-50 6l-12-15Z" fill="#f3f5f8" stroke-width="1.5"/>
      <path d="m479 348 11 14m-2-24c15-19 18-34 6-35" stroke-width="1"/>
    </g>
    <g fill="#4f5a68" font-family="monospace">
      <text x="198" y="127" font-size="9" letter-spacing="1">BOOT LOADER</text>
      <path d="M198 137h187" stroke="#c2cad2"/>
      <text x="198" y="159" font-size="8">SELECTED SYSTEM</text>
      <text data-screen-name x="198" y="186" font-size="24" fill="#29343d">daedalOS</text>
      <text data-screen-command x="198" y="211" font-size="9">&gt; boot daedalos_</text>
      <text x="511" y="77" font-size="9">FIG. 01</text>
      <text x="34" y="333" font-size="9" transform="rotate(-90 34 333)">BROWSER / DESKTOP INTERFACE</text>
      <text x="106" y="400" font-size="9" letter-spacing="1.2">ONE GATEWAY. FOUR DESTINATIONS.</text>
    </g>
    <g stroke="#7a8796" stroke-width="1"><path d="M103 30h401m-401-5v10m401-10v10M544 82v211m-5-211h10m-10 211h10"/><path d="m427 258 105 60h30" stroke-dasharray="3 3"/></g>
    <text x="530" y="335" fill="#677483" font-size="9" font-family="monospace">READY</text>
  </svg>
  <span class="drawing-corner top-left"></span><span class="drawing-corner bottom-right"></span>
  </div>`;
}

function visual(): string {
  return `<section class="visual-section wrap" aria-labelledby="visual-heading">
    <div class="hero">
      <div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> SYSTEM SELECTOR</p>
        <h1 id="visual-heading">A new window.<br>A familiar world.</h1>
        <p class="hero-description">Four browser desktops. Choose your system and make yourself at home.</p>
        <a class="text-link" href="#systems">Choose a system <span aria-hidden="true">↓</span></a>
      </div>
      ${computer()}
    </div>
    <div class="selector-heading" id="systems"><h2>Select a system</h2><span class="mono">04 AVAILABLE <span aria-hidden="true">/</span> NO INSTALL REQUIRED</span></div>
    <div class="system-list" aria-label="Browser desktops">${destinations.map((os, i) => `
      <article class="system-row ${i === 0 ? 'is-selected' : ''}" data-system="${os.id}">
        <button class="system-choice" data-select="${os.id}" aria-pressed="${i === 0}" aria-label="Select ${os.name}">
          <span class="system-index mono">${os.code}</span><span class="system-mark mark-${os.id}" aria-hidden="true">${os.id === 'daedalos' ? 'd' : os.id === 'macos' ? '⌘' : '<span></span><span></span><span></span><span></span>'}</span>
          <span class="system-name">${os.name}</span><span class="selection-marker" aria-hidden="true"></span>
        </button>
        <p class="system-note">${os.note}</p>
        <a class="source-link" href="${os.source}" aria-label="${os.name} source on GitHub">Source <span aria-hidden="true">↗</span></a>
        <a class="boot-link" href="${os.live}" aria-label="Boot ${os.name}">Boot <span aria-hidden="true">↗</span></a>
      </article>`).join('')}
    </div>
    <div class="selector-foot"><p>Different desktops. The same open web.</p><p class="mono">SELECT <kbd>↑</kbd><kbd>↓</kbd> <span aria-hidden="true">·</span> OPEN WITH BOOT <span aria-hidden="true">↗</span></p></div>
    <p class="selected-description" aria-live="polite">${destinations[0].detail}</p>
  </section>`;
}

function terminal(standalone: boolean): string {
  return `<section class="terminal-section ${standalone ? 'standalone-terminal' : ''}" id="terminal" aria-labelledby="terminal-heading">
    <div class="wrap">
      <div class="terminal-intro"><div><p class="terminal-label mono">THE COMMAND LINE</p><h${standalone ? '1' : '2'} id="terminal-heading">Prefer the prompt?</h${standalone ? '1' : '2'}><p>Same destinations. Just a different way in.</p></div>
        ${standalone ? `<a class="terminal-view-link" href="${base}visual/">Visual selector ↗</a>` : `<a class="terminal-view-link" href="${base}terminal/">Open terminal view ↗</a>`}
      </div>
      <div class="terminal-frame">
        <div class="terminal-bar"><span><span class="terminal-indicator" aria-hidden="true"></span> boot-loader / console</span><button type="button" id="focus-terminal">Focus terminal <span aria-hidden="true">↵</span></button></div>
        <p class="terminal-loading" id="terminal-loading">Loading console… Ordinary desktop links are available below.</p>
        <div id="terminal-host" aria-label="Boot Loader terminal" aria-describedby="terminal-guide"></div>
      </div>
      <p id="terminal-guide" class="terminal-guide">Type <code>help</code> to begin. <kbd>↑</kbd><kbd>↓</kbd> history · <kbd>Tab</kbd> completion · <kbd>Shift</kbd>+<kbd>Tab</kbd> leave terminal. Commands only navigate to these demos.</p>
      <details class="command-reference"><summary>Commands &amp; desktop links</summary><p><code>help</code> · <code>os list</code> · <code>boot &lt;system&gt;</code> · <code>source [system]</code> · <code>clear</code></p>
        <ul>${destinations.map((os) => `<li><span><code>${os.id}</code> / ${os.name}</span><a href="${os.live}">Boot ${os.name} ↗</a><a href="${os.source}">${os.name} source ↗</a></li>`).join('')}</ul>
      </details>
      <div class="terminal-footer"><span>Boot Loader <span aria-hidden="true">/</span> Built for the browser.</span><a href="${repositoryUrl}">View source ↗</a></div>
    </div>
  </section>`;
}

export function renderPage(page: Page): string {
  return `${header(page)}<main id="main">${page === 'terminal' ? terminal(true) : visual() + (page === 'home' ? terminal(false) : '')}</main>${page === 'visual' ? `<footer class="visual-footer wrap"><span>Boot Loader / Built for the browser.</span><a href="${repositoryUrl}">View source ↗</a></footer>` : ''}`;
}

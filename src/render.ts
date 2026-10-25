import { destinations, repositoryUrl } from './destinations.ts';
import { computerIllustration, screenDialog } from './computer.ts';

type Page = 'home' | 'visual' | 'terminal';
const base = '/boot-loader/';

function systemMark(id: string): string {
  if (id === 'ubuntu') return '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" focusable="false"><circle cx="16" cy="16" r="8.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="12.9 4.7" transform="rotate(-90 16 16)"/><circle cx="16" cy="3" r="3"/><circle cx="27.3" cy="22.5" r="3"/><circle cx="4.7" cy="22.5" r="3"/></svg>';
  return id === 'daedalos' ? 'd' : id === 'macos' ? '\u2318' : id === 'webvm' ? '&gt;_' : '<span></span><span></span><span></span><span></span>';
}

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

function visual(): string {
  return `<section class="visual-section wrap" aria-labelledby="visual-heading">
    <div class="hero">
      <div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> SYSTEM SELECTOR</p>
        <h1 id="visual-heading">A new window.<br>A familiar world.</h1>
        <p class="hero-description">${destinations.length} browser systems. Choose where to begin.</p>
        <a class="text-link" href="#systems">Choose a system <span aria-hidden="true">↓</span></a>
      </div>
      ${computerIllustration()}
    </div>
    <div class="selector-heading" id="systems"><h2>Select a system</h2><span class="mono">${String(destinations.length).padStart(2, '0')} AVAILABLE <span aria-hidden="true">/</span> NO INSTALL REQUIRED</span></div>
    <div class="system-list" aria-label="Browser desktops">${destinations.map((os, i) => `
      <article class="system-row ${i === 0 ? 'is-selected' : ''}" data-system="${os.id}">
        <button class="system-choice" data-select="${os.id}" aria-pressed="${i === 0}" aria-label="Select ${os.name}">
          <span class="system-index mono">${os.code}</span><span class="system-mark mark-${os.id}" aria-hidden="true">${systemMark(os.id)}</span>
          <span class="system-name">${os.name}</span><span class="selection-marker" aria-hidden="true"></span>
        </button>
        <p class="system-note">${os.note}</p>
        <div class="system-actions"><button type="button" class="screen-launch" data-embed="${os.id}" aria-label="${os.name} computer launch options">${os.directOnly ? 'Direct only' : 'In computer'}</button><a class="boot-link direct-launch" href="${os.live}" aria-label="Boot ${os.name}">Open <span aria-hidden="true">↗</span></a></div>
        <a class="source-link" href="${os.source}" aria-label="${os.name} source on GitHub">Source <span aria-hidden="true">↗</span></a>
      </article>`).join('')}
    </div>
    <div class="selector-foot"><p>Different desktops. The same open web.</p><p class="mono">SELECT <kbd>↑</kbd><kbd>↓</kbd> <span aria-hidden="true">·</span> CHOOSE A LAUNCH MODE <span aria-hidden="true">↗</span></p></div>
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
      <p id="terminal-guide" class="terminal-guide">Type <code>help</code> to begin. <kbd>↑</kbd><kbd>↓</kbd> history · <kbd>Tab</kbd> completion · <kbd>Shift</kbd>+<kbd>Tab</kbd> leave terminal. A simulated shell. Type ls to list ${destinations.length} systems.</p>
      <details class="command-reference"><summary>Commands &amp; desktop links</summary><p><code>help</code> · <code>ls</code> · <code>pwd</code> · <code>cd &lt;path&gt;</code> · <code>cat &lt;path&gt;</code> · <code>time</code> · <code>boot &lt;system&gt; [--embed]</code> · <code>source [system]</code> · <code>clear</code> · <code>load &lt;URL|$name&gt;</code> · <code>set home=https://example.com</code></p>
        <ul>${destinations.map((os) => `<li><span><code>${os.id}</code> / ${os.name}</span><a href="${os.live}">Boot ${os.name} ↗</a><a href="${os.source}">${os.name} source ↗</a></li>`).join('')}</ul>
      </details>
      <div class="terminal-footer"><span>Boot Loader <span aria-hidden="true">/</span> Built for the browser.</span><a href="${repositoryUrl}">View source ↗</a></div>
    </div>
  </section>`;
}

export function renderPage(page: Page): string {
  return `${header(page)}<main id="main">${page === 'terminal' ? terminal(true) : visual() + (page === 'home' ? terminal(false) : '')}</main>${page === 'visual' ? `<footer class="visual-footer wrap"><span>Boot Loader / Built for the browser.</span><a href="${repositoryUrl}">View source ↗</a></footer>` : ''}${screenDialog()}`;
}

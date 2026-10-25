import { destinations } from './destinations.ts';

/** Compact Macintosh proportions, drawn on one front plane and a single depth vector. */
export function computerIllustration(): string {
  return `<div class="computer-drawing" aria-hidden="true">
  <svg class="computer compact-computer" viewBox="0 0 600 470" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g class="computer-guides" stroke="#d6d8dc" stroke-width="1"><path d="M105 438H510M166 53v355M473 53v355" stroke-dasharray="3 7"/><path d="M158 53h16m-8-8v16M465 53h16m-8-8v16M105 430v16m405-16v16"/></g>
    <g stroke="#73777f" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="m180 74 54-27h220l-54 27Z" fill="#f7f7f9"/>
      <path d="m400 74 54-27v312l-54 27Z" fill="#f0f1f3"/>
      <rect x="180" y="74" width="220" height="312" rx="12" fill="#fcfcfd"/>
      <rect x="201" y="108" width="178" height="139" rx="13" fill="#eceef1"/>
      <rect x="210" y="117" width="160" height="121" rx="9" fill="#fafbfd" stroke="#a3a7af"/>
      <path d="M211 257h158M283 291h91v9h-91Z" stroke="#b7bac1"/>
      <path d="M286 294h74m5-3v9" stroke="#73777f"/>
      <path d="M204 286h33m-33 5h33m-33 5h33m-33 5h33m-33 5h33" stroke="#afb3bb" stroke-width="1"/>
      <path d="M192 367h195M410 119l31-15m-31 22 31-15m-31 22 31-15m-31 22 31-15m-31 22 31-15" stroke="#b7bac1" stroke-width="1"/>
      <path d="m134 411 40-20h270l-40 20Z" fill="#fafafb"/>
      <path d="M134 411v9h270v-9m0 9 40-20v-9" fill="#f0f1f3"/>
      <path d="m149 406 24-12h250l-24 12Zm17-8h249m-249 0-14 7m34-11-24 12m43-12-24 12m43-12-24 12m43-12-24 12m43-12-24 12m43-12-24 12m43-12-24 12m43-12-24 12m43-12-24 12m43-12-24 12M215 413h110" stroke="#b5b9c1" stroke-width=".9"/>
      <path d="m462 397 20-10h33c8 0 12 5 12 12v14l-20 10h-33c-8 0-12-5-12-12Z" fill="#fafafb"/>
      <path d="m462 397 20-10m-4 10 15-7h17l-15 7Zm29 26v-19m-14-17c-1-20 3-29 14-36" stroke="#afb3bb" stroke-width="1"/>
    </g>
    <circle cx="367" cy="345" r="3" class="computer-power"/>
    <g font-family="ui-monospace,monospace" fill="#6e727a">
      <text x="224" y="143" font-size="8" letter-spacing="1">BOOT LOADER</text><path d="M224 152h131" stroke="#d5d8df"/>
      <text x="224" y="171" font-size="7">SELECTED SYSTEM</text>
      <text data-screen-name x="224" y="194" font-size="19" fill="#34373d">daedalOS</text>
      <text data-screen-command x="224" y="218" font-size="8">&gt; boot daedalos_</text>
      <text x="112" y="463" font-size="8" letter-spacing="1.7">A SMALL COMPUTER. SIX POSSIBILITIES.</text>
    </g>
  </svg></div>`;
}

export function screenDialog(): string {
  return `<dialog id="screen-dialog" class="screen-dialog" aria-labelledby="screen-title" aria-describedby="screen-status">
    <div class="screen-toolbar"><div><span class="screen-caption">BOOT LOADER</span><h2 id="screen-title">Computer screen</h2></div><button type="button" id="screen-close">Exit computer <span aria-hidden="true">×</span></button></div>
    <div class="computer-cabinet"><div class="cabinet-handle" aria-hidden="true"></div><div class="computer-bezel"><div id="screen-slot" class="screen-slot"></div></div><div class="cabinet-chin" aria-hidden="true"><span class="cabinet-speaker"></span><span class="cabinet-drive"></span><span class="computer-power"></span></div></div>
    <div class="screen-controls"><label for="screen-system">System</label><select id="screen-system"><option value="">Custom page</option>${destinations.map((os) => `<option value="${os.id}">${os.name}</option>`).join('')}</select><a id="screen-open" class="direct-launch" href="/boot-loader/">Open page in this tab ↗</a></div>
    <p id="screen-status" class="screen-status" role="status" aria-live="polite"></p>
    <p class="screen-limit">External pages can refuse embedding or require a direct tab. Loading a frame does not confirm that its app is usable.</p>
    <button class="screen-return" type="button" id="screen-return">Return to selector</button>
  </dialog>`;
}

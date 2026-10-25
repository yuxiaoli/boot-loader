# Verification

The refinement was checked against production `dist` files served at `/boot-loader/` with Vite preview, in Windows Chrome.

- `npm run check` passes TypeScript, 16 tests across four files, production build and static-output verification.
- Tests cover all seven explicit boot IDs, the exact preserved live/source inventory, missing/unknown arguments, removal of the old list command, virtual filesystem navigation and errors, completion/history/paste handling, long editable input, URL validation and recursion prevention, bounded session variables, fresh local time and screen sandbox/mixed-content policy.
- All three routes load at 320, 390, 768 and 1280 pixels without horizontal page overflow. Direct entry and refresh work under the repository base path. No frame exists before explicit launch; all seven systems remain available through ordinary links. The Ubuntu row has a native SVG mark on both visual routes.
- Keyboard completion expands `boo` to `boot`; bare `boot` displays usage. Initial `ls` lists all seven systems. `cd /`, `pwd`, `cat README.txt`, `time`, `set home=https://example.com` and `load $home` were exercised in the browser. Booting Windows 11 from virtual `/` navigates the current tab; Back restores a working console. A long command retained all characters through a 320-pixel viewport resize.
- At a 390 by 400 viewport, terminal root background is black, dark color-scheme and black theme-color remain active, hidden input font size is 16px and there is no horizontal page overflow. Normal 390 by 844 layout was also inspected.
- Computed terminal text is opaque RGB(17,255,0) on black. The native 50% cursor theme composites to RGB(9,128,0), in both focused block and unfocused outline rendering. Shift+Tab moves focus out of the console. Reduced-motion behavior is implemented with CSS and the native xterm cursor option; an OS-level reduced-motion preference was not changed during testing.
- Default blue is `#0088FF`. Filled buttons use white on `#1E6EF4` (4.57:1); small blue text uses the darker `#005EC4`. Desktop and mobile layouts, the compact Macintosh line geometry and the unwarped embedded screen were visually inspected.

## Screen compatibility

All seven configured demo addresses returned HTTP 200 when checked. Their source links were verified; destination repositories were not changed by this integration. Framing headers and runtime content were checked separately, because a frame load event alone proves neither compatibility nor usability.

| Target | Observed screen result | Direct opening |
| --- | --- | --- |
| macOS | Finder, desktop menu and dock rendered | Available |
| Windows 11 | Personalized desktop and Start menu with Sean profile and fork GitHub link rendered | Verified in the same tab |
| WinXP | Desktop, My Computer and Minesweeper rendered; its own browser demo has an unrelated external DNS failure | Available |
| Win12 | The boot page reached `desktop.html` with the Administrator login screen in-frame | Verified in the same tab |
| daedalOS | Screen remained blank during the bounded test; embedding is unconfirmed | Verified desktop in the same tab |
| WebVM | Explicit direct-only explanation; no frame created | Required for its cross-origin isolation |
| Ubuntu | Personalized desktop and About Sean window rendered; switching its Focus section worked inside the computer | Verified in the same tab |

Windows 11 launches `https://sean-windows-11-web.vercel.app/`, with source at `https://github.com/yuxiaoli/Windows-11-Web/tree/develop`. Independent Windows Edge checks observed the anonymous desktop, "Sean's Windows 11 Web" title, Sean profile and fork GitHub link, including inside the computer launched by `boot win11 --embed`. Plain `boot win11` navigated the current tab; Back restored the working terminal, and Back from the computer removed its iframe and returned focus to the command input. The app returned HTTP 200 with no observed X-Frame-Options or CSP restriction. These checks cover integration and desktop startup; the fork's other app features, mobile behavior and offline mode were not independently revalidated.

Ubuntu uses `https://yuxiaoli.github.io/ubuntu-web/` and `https://github.com/yuxiaoli/ubuntu-web/tree/develop`. Independent Windows Chrome checks observed "Sean | Ubuntu desktop", the "Sean (Yuxiao Li)" About window and a working Focus section in-frame. Desktop icons use double-click activation after the app's boot overlay clears. The app returned HTTP 200 with no observed X-Frame-Options or CSP restriction. The original six destinations are unchanged; source, listing, help, completion, virtual files and both launch modes use the same seven-entry registry.

Win12 launches `https://win12-online.github.io/win12/boot.html`, which starts the app and navigates to its `desktop.html`, rather than the promotional homepage. The URL correction was checked in Windows Edge: both direct and computer-screen launches reached the Administrator login screen. The boot and desktop responses returned HTTP 200 with no observed X-Frame-Options or CSP framing restriction. A regression checks the canonical URL, static links on all three routes, screen-launch entry and virtual shell; the Win12 source link is unchanged.

The terminal uses `boot <id> --embed` for an explicit computer-screen launch; plain `boot <id>` retains current-tab navigation. Windows Edge checks confirmed completion from `boot win12 --em`, the embedded Administrator screen, clear missing-target and unknown-option errors, and WebVM's direct-only explanation with zero frames. Parser tests also cover repeated options, unknown IDs, mandatory targets, the rejected provisional option and flag completion. The same screen controller, sandbox and direct fallback are reused.

WebVM returns COOP/COEP headers and requires isolation the non-isolated Pages parent cannot supply. The other five responses had no observed X-Frame-Options or frame-ancestors restriction, but that does not guarantee every application feature works inside a sandbox.

Custom `load https://example.com` and `load $home` rendered real page content in the opaque sandbox. Switching systems replaces the previous frame, closing removes it, focus returns to the launch control, and Back closes the screen. There is no timed redirect. Slow, blocked or incompatible pages retain an explicit same-tab direct-open action. No framing policy is bypassed and no proxy is used.

## Platform and release limits

The reported thick green bar at the console's right edge was reproduced in Chrome at 393 by 852 after `la` and `ls`. DOM inspection identified xterm 6's native 14px scrollbar thumb, whose default color derives from the green foreground at 20% alpha. Its normal, hover and active colors now use neutral white alpha instead. Content-box painting reduces the visible thumb to 6px while preserving the native 14px drag area; scrolling is not hidden or replaced. A regression covers all three theme states. Wheel scrolling and thumb dragging worked with repeated help output; home and standalone terminal layouts were checked through focus/blur, 393 by 400 contraction/expansion, and 320, 390/393 and 1280 pixel widths. Text remained opaque green on black, with the 50% focused block and unfocused outline cursor unchanged. These are Windows Chrome viewport checks, not physical iOS keyboard or touch testing.

Mobile checks use Chrome viewport emulation on Windows, not physical iOS or Safari. The page-controlled canvas, safe-area padding, viewport tracking and input sizing are covered; the reported Safari keyboard/accessory strip still needs physical-device confirmation. Third-party apps may have independent network, storage, media or permission limitations. No claim is made that arbitrary websites can be embedded.

GitHub Pages deployment follows `develop`; `main` and the separate draft focus-fix PR are preserved. A release must pass CI at the same SHA recorded by `/boot-loader/version.json` and the revision meta tag in every route. Live acceptance additionally compares every published HTML/JS/CSS/revision file with the tested artifact, then checks routes and interactions in the browser. The Actions run and source SHA provide the durable deployment record.

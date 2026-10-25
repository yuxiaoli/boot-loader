# Verification

The refinement was checked against production `dist` files served at `/boot-loader/` with Vite preview, in Windows Chrome.

- `npm run check` passes TypeScript, 10 tests across four files, production build and static-output verification.
- Tests cover all six explicit boot IDs, missing/unknown arguments, removal of the old list command, virtual filesystem navigation and errors, completion/history/paste handling, long editable input, URL validation and recursion prevention, bounded session variables, fresh local time and screen sandbox/mixed-content policy.
- All three routes load at 320, 390, 768 and 1280 pixels without horizontal page overflow. Direct entry and refresh work under the repository base path. No frame exists before explicit launch; all six systems remain available through ordinary links.
- Keyboard completion expands `boo` to `boot`; bare `boot` displays usage. Initial `ls` lists all six systems. `cd /`, `pwd`, `cat README.txt`, `time`, `set home=https://example.com` and `load $home` were exercised in the browser. Booting Windows 11 from virtual `/` navigates the current tab; Back restores a working console. A long command retained all characters through a 320-pixel viewport resize.
- At a 390 by 400 viewport, terminal root background is black, dark color-scheme and black theme-color remain active, hidden input font size is 16px and there is no horizontal page overflow. Normal 390 by 844 layout was also inspected.
- Computed terminal text is opaque RGB(17,255,0) on black. The native 50% cursor theme composites to RGB(9,128,0), in both focused block and unfocused outline rendering. Shift+Tab moves focus out of the console. Reduced-motion behavior is implemented with CSS and the native xterm cursor option; an OS-level reduced-motion preference was not changed during testing.
- Default blue is `#0088FF`. Filled buttons use white on `#1E6EF4` (4.57:1); small blue text uses the darker `#005EC4`. Desktop and mobile layouts, the compact Macintosh line geometry and the unwarped embedded screen were visually inspected.

## Screen compatibility

All six configured demo addresses returned HTTP 200 when checked. Their source links were verified; destination repositories were not changed. Framing headers and runtime content were checked separately, because a frame load event alone proves neither compatibility nor usability.

| Target | Observed screen result | Direct opening |
| --- | --- | --- |
| macOS | Finder, desktop menu and dock rendered | Available |
| Windows 11 | Desktop icons and taskbar rendered | Verified in the same tab |
| WinXP | Desktop, My Computer and Minesweeper rendered; its own browser demo has an unrelated external DNS failure | Available |
| Win12 | The configured URL redirects to its upstream introduction, which rendered in-frame | Available |
| daedalOS | Screen remained blank during the bounded test; embedding is unconfirmed | Verified desktop in the same tab |
| WebVM | Explicit direct-only explanation; no frame created | Required for its cross-origin isolation |

The supplied Win12 URL remains `https://yuxiaoli.github.io/win12/`; its client redirect belongs to that external project. WebVM returns COOP/COEP headers and requires isolation the non-isolated Pages parent cannot supply. The other five responses had no observed X-Frame-Options or frame-ancestors restriction, but that does not guarantee every application feature works inside a sandbox.

Custom `load https://example.com` and `load $home` rendered real page content in the opaque sandbox. Switching systems replaces the previous frame, closing removes it, focus returns to the launch control, and Back closes the screen. There is no timed redirect. Slow, blocked or incompatible pages retain an explicit same-tab direct-open action. No framing policy is bypassed and no proxy is used.

## Platform and release limits

Mobile checks use Chrome viewport emulation on Windows, not physical iOS or Safari. The page-controlled canvas, safe-area padding, viewport tracking and input sizing are covered; the reported Safari keyboard/accessory strip still needs physical-device confirmation. Third-party apps may have independent network, storage, media or permission limitations. No claim is made that arbitrary websites can be embedded.

GitHub Pages deployment follows `develop`; `main` and the separate draft focus-fix PR are preserved. A release must pass CI at the same SHA recorded by `/boot-loader/version.json` and the revision meta tag in every route. Live acceptance additionally compares every published HTML/JS/CSS/revision file with the tested artifact, then checks routes and interactions in the browser. The Actions run and source SHA provide the durable deployment record.

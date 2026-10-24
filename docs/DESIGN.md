# Boot Loader

Pure static Vite + TypeScript, with no server, account, API, tracking or runtime CDN. No iframe, 3D or image generation assets. Native SVG is a technical drawing, not a desktop emulator. System fonts keep first load self-contained.

`src/destinations.ts` contains the exactly four destinations and supplies static HTML, selector behavior and command routing. Source URL casing is intentionally preserved, including `winXP` and `daedalOS`.

Vite's HTML transform writes complete content into three independent entry documents: `/boot-loader/`, `/boot-loader/visual/`, `/boot-loader/terminal/`. Ordinary live and source links work without JavaScript. Pages never needs an SPA rewrite. The home terminal is the final section. The visual route never loads xterm; home loads it on approach to the bottom, and terminal loads it when visible.

Visual direction: cool light gray and white inspired by light editor surfaces, restrained green status marks, native mono/sans system type, technical line illustration. DESIGN_VARIANCE=5, MOTION_INTENSITY=2, VISUAL_DENSITY=4. Square rows, 4px console/brand corner radius. Reduced motion disables transitions and cursor blinking.

The xterm.js console uses `#11FF00` on `#000000`. All commands are parsed locally against a fixed whitelist. No eval, subprocess, shell or arbitrary URL navigation. Paste sanitizes control codes and collapses newlines; Enter must be pressed separately. History is memory-only, capped at 100. Command input is limited to a single terminal row for reliable cursor editing on mobile. Shift+Tab always exits, and empty-prompt Tab retains browser navigation.

Use `develop` for implementation; validate its exact commit, then fast-forward `main`. The Pages workflow validates both branches and deploys only `main`. `version.json` and the revision meta tag record the exact source commit. All action references are pinned.

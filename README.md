# Boot Loader

A pure static entry point to seven browser systems, with a light visual selector and a real xterm.js simulated shell.

Live: https://yuxiaoli.github.io/boot-loader/

Implementation and GitHub Pages deployments use `develop`. `main` is retained separately.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run check
npm run dev
```

Open the printed URL with `/boot-loader/`. `npm run preview` serves the built production files on port 4173.

## Routes

- `/boot-loader/`: visual selector, then terminal at the bottom
- `/boot-loader/visual/`: visual selector only
- `/boot-loader/terminal/`: terminal only

The build creates a real `index.html` for each route, including accessible links before JavaScript runs. Refreshes under the repository base path work directly.

## Commands

Start in `/systems`. The prompt displays the absolute virtual path, `/systems> ` (with a trailing space), consistently with `pwd` and `cwd`. At root the prompt displays `/> `. `ls` lists `daedalos`, `macos`, `win12`, `winxp`, `win11`, `webvm` and `ubuntu`.

```text
intro
about
help
ls
pwd
cd ..
cat README.txt
boot win11
boot win12 --embed
boot ubuntu --embed
open https://example.com
open https://example.com --embed
set home=https://example.com
open $home
open $home --embed
time
echo hello
source webvm
clear
cls
```

`intro` gives a welcome and practical first steps. `about` introduces the project and Sean using the approved public welcome copy and website. Both commands are read-only and take no arguments; `help` remains the command reference. They are available through Tab completion on both terminal routes.

`cwd` is an alias for `pwd`. Paths are virtual, with root, relative paths, `.` and `..`; `cd` without a path returns to `/systems`. `boot <id>` always requires an explicit system, independently of selection or directory. It opens the current tab by default; `boot <id> --embed` tries the same computer-screen session as the visual selector, including its direct-open fallback. `--embed` is the only boot option; unknown or repeated options show an error or usage. There is no `os list` alias.

`open <URL|$name>` opens the current tab by default; append `--embed` to use the computer screen with its explicit direct-open fallback. Unknown or repeated options are rejected. `load` remains an exact compatibility alias for `open`, including the new same-tab default and `--embed` behavior, and is omitted from canonical command-name completion. `cls` is an exact alias for `clear`.

`open` accepts explicit HTTP/HTTPS URLs and rejects embedded credentials, unsafe schemes and Boot Loader's own pages. `set name=<URL>` stores up to 16 URL values in this page's memory. Names use lowercase letters, digits and underscores, start with a letter and are at most 32 characters; references such as `$home` are case-sensitive and expand exactly once. URL values are at most 2048 characters. State and command history are never saved to browser storage or a server. Reloading resets the simulated session. `time` reads a new local browser Date and actual Intl time zone each time.

Arrow keys edit and recall history; Esc clears only the unsubmitted input and keeps output/history; Ctrl+C cancels; Ctrl+L clears; Home/End move the cursor. While the terminal is focused, Tab completes from the typed prefix and cycles through its matches; Shift+Tab cycles in reverse. For example, `l` then Tab becomes `ls`, while `boot w` cycles through matching system IDs. Completion also understands virtual paths relative to the current directory, available session variable names and `--embed`. It preserves text after the caret, never submits a command, and resets its cycle after editing, moving the caret, using history or pressing Enter. Empty or unmatched Tab/Shift+Tab follows normal browser focus navigation. Outside the terminal, Tab keeps its normal behavior.

The rectangular block cursor uses native xterm blinking while focused, with cursor-only 50% alpha. It uses an outline on blur and remains steady when reduced motion is requested, including preference changes during the session. Text stays fully bright `#11FF00` on black, with a neutral gray scrollbar and tighter 1.25 line spacing. Long input scrolls horizontally within the prompt without losing URL characters during a resize. No real shell, filesystem, OS environment or process is used.

Labeled native selectors offer 12–24px font sizes and named Classic green, Amber, and Soft white presets; there is no color picker. Add future presets to `terminalThemes` in `src/terminal-appearance.ts`. Choices are session-only. The standalone terminal measures its available viewport space below the header and controls once at mount; its pixel height stays fixed through subsequent window/keyboard resizes, while xterm refits rows and columns. The homepage terminal keeps its existing height rules until an explicit `refit` command. `refit` recalculates available viewport height without recreating xterm, clearing output, or resetting variables/history.

## Launch modes

Each visual entry offers an explicit screen launch and an ordinary same-tab Open link. Source links remain secondary. A screen session loads no iframe or target assets before a user launches it; switching or exiting removes its frame. Browser Back closes the session. The screen can be exited without entering the embedded page.

Some pages refuse embedding or need capabilities available only in a direct tab. A frame load event does not establish that its app works; the interface keeps a direct-open action and bounded status messages, and never navigates automatically after a timeout. WebVM requires cross-origin isolation and is offered as a direct launch on this Pages host. Win12 starts at the owned fork's boot page, `https://yuxiaoli.github.io/win12/boot.html`, where the approved welcome is deployed. See [compatibility and verification](docs/VERIFICATION.md).

Edit `src/destinations.ts` to update destinations. See [design decisions](docs/DESIGN.md) for architecture and accessibility details.

## Release

1. Create a feature branch from current `develop`, implement and run `npm run check`.
2. Verify the built routes, keyboard interaction and mobile layout.
3. Open a draft PR against `develop`, review the diff and checks, then merge normally when requirements pass. Never force a changed remote head.
4. GitHub Actions validates that exact commit and deploys its `dist` artifact to Pages. The `github-pages` environment must permit `develop`; preserve existing protection rules and report any restriction instead of bypassing it.
5. Verify `https://yuxiaoli.github.io/boot-loader/version.json` matches the deployed `develop` SHA, then verify live routes/assets and interactions.

### Theme controls and commands

The activated catalogue uses one searchable combobox for built-in and approved catalogue palettes. Type to filter, use Up/Down and Enter to select, PageUp/PageDown to change result pages, or Escape to close without changing the palette. Results are paginated in groups of 50 so every matching identity is reachable without rendering the whole catalogue. Loading and failed refreshes keep built-ins available; failed refreshes retain the last-good catalogue and selected palette. Attribution for the applied palette appears when the control is open.

- `themes [search]` lists theme names and their lowercase command slugs, with spaces replaced by hyphens. Colliding or reserved slugs are marked for selection in the Theme control.
- `theme <slug>` applies a theme, for example `theme solarized-dark`. Tab/Shift+Tab cycle matching unambiguous slugs.
- `theme default` restores the built-in Classic green theme; `themes refresh` reloads the catalogue.
- `reboot` starts a fresh terminal session, clearing session variables and history while preserving the current appearance preferences. `reload` refreshes the current browser page; session-only state and appearance selections reset as on a normal refresh.
- `refit` fits the terminal to the current viewport without resetting the session.

The API loader is configured separately from the selector; only verified public terminal themes explicitly marked popular may be activated. Editor themes and unknown popularity are not inferred as terminal/popular.

The API v1 consumer reads `https://yuxiaoli.github.io/themes-catalog-api/api/v1/terminal/index.json` and selects only entry identities with explicit `popularity.flags[id] === true`, preserving `popularity.order`. Popularity is not a third category or a server query parameter. Missing metadata fails closed; missing individual flags mean unknown. The loader requests only validated public terminal-detail paths (four at a time), checks identity, palette and publication evidence, and retains a SHA-256 index revision plus the upstream popularity revision. No private snapshot is bundled. A timeout or invalid detail rejects the refresh without replacing a last-good selection.

### JSON command bindings

`src/command-catalog.json` is the data-only initialization catalogue. Vite emits a same-release, content-hashed JSON asset; editing it requires rebuilding/releasing the site. Command names and descriptions are configurable independently of the small compiled handler registry. For example:

```json
{"version":1,"commands":[
  {"name":"refresh-page","kind":"handler","description":"Refresh this page","handler":"reload"},
  {"name":"clock","kind":"handler","description":"Show local time","handler":"time"},
  {"name":"welcome","kind":"text","description":"A greeting","lines":["Hello"]}
]}
```

`reload` maps to the terminal controller's `window.location.reload()` operation; `time` reads the browser clock and time zone. These are **handler IDs**, not JavaScript expressions. Other browser operations require an explicitly reviewed code-owned handler before JSON can bind them. No `eval`, generic property traversal or arbitrary API execution is supported. Entries may be renamed or omitted, including all four default configured names. Existing defaults remain unchanged. Dispatch, help, the virtual help file and completion follow the loaded definitions; reserved built-in/tool names cannot be overwritten. Invalid documents fail atomically to the bundled default catalogue, with existing size, timeout and same-origin restrictions.

### Trusted browser packages and FIGlet

Run `install --list` to discover every supported package available in this release,
including packages already enabled. Each row shows the package ID, pinned version
and description. Listing does not load tool code/fonts, enable commands or change
saved installation state. Use `install <package>` to enable one; currently this is
`install figlet`. `--list` must be used alone, without a package name or other
options. It is shown in `help`, `cat /help.txt` and Tab/Shift+Tab completion.

Package metadata comes from `src/tools/manifest.json`. Listing, installation,
package completion and tool-command reservations use the same supported entries;
only entries backed by a reviewed, compiled adapter in `src/tools/catalog.ts` are
available. To add a future package, add its trusted manifest entry and, when
needed, its fixed runtime adapter. No separate discovery list is maintained.

Run `install figlet`, then `figlet "Hello World"`. Installation enables the pinned, bundled browser-compatible npm tool; it does not install arbitrary npm packages or execute lifecycle scripts. The existing FIGlet CLI spelling is retained, including `--help`, `--list`, `-f "Dancing Font"`, `-w 80`, `-h <horizontalLayout>`, `-v <verticalLayout>`, `--info Standard`, and `--` before literal dash-prefixed text. `-h` is **not** help. See [compatibility and dependency notices](docs/FIGLET.md).

`install --list` lists packages; `figlet --list` retains its native meaning of
listing FIGlet fonts after FIGlet is enabled.

Tool code runs in a lazy dedicated Worker. Standard loads during installation; other fonts load only when requested. Ctrl+C cancels loading/rendering and returns to the prompt. Commands have a 15-second timeout and 256 KiB output limit. While a tool is running the editor waits; use Ctrl+C before entering another command. `uninstall figlet` removes command registration and saved enablement. It does not promise that downloaded module bytes disappear from browser caches.

Only validated tool IDs and exact versions are saved under `boot-loader:tools:v1`. Command history and URL variables remain session-only. `reboot` retains committed enablement; page reload remembers it and loads code/fonts lazily on first use. Storage failure is reported as session-only operation. Corrupt or incompatible records are ignored. Persistence is not an offline guarantee, and storage prefixes do not isolate data from other applications on the same origin.

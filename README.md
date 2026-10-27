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

Start in `/systems`. The prompt displays `systems $`; `pwd` and `cwd` still report the absolute virtual path. At root the prompt displays `/ $`. `ls` lists `daedalos`, `macos`, `win12`, `winxp`, `win11`, `webvm` and `ubuntu`.

```text
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

`cwd` is an alias for `pwd`. Paths are virtual, with root, relative paths, `.` and `..`; `cd` without a path returns to `/systems`. `boot <id>` always requires an explicit system, independently of selection or directory. It opens the current tab by default; `boot <id> --embed` tries the same computer-screen session as the visual selector, including its direct-open fallback. `--embed` is the only boot option; unknown or repeated options show an error or usage. There is no `os list` alias.

`open <URL|$name>` opens the current tab by default; append `--embed` to use the computer screen with its explicit direct-open fallback. Unknown or repeated options are rejected. `load` remains an exact compatibility alias for `open`, including the new same-tab default and `--embed` behavior, and is omitted from canonical command-name completion. `cls` is an exact alias for `clear`.

`open` accepts explicit HTTP/HTTPS URLs and rejects embedded credentials, unsafe schemes and Boot Loader's own pages. `set name=<URL>` stores up to 16 URL values in this page's memory. Names use lowercase letters, digits and underscores, start with a letter and are at most 32 characters; references such as `$home` are case-sensitive and expand exactly once. URL values are at most 2048 characters. State and command history are never saved to browser storage or a server. Reloading resets the simulated session. `time` reads a new local browser Date and actual Intl time zone each time.

Arrow keys edit and recall history; Ctrl+C cancels; Ctrl+L clears; Home/End move the cursor. While the terminal is focused, Tab completes from the typed prefix and cycles through its matches; Shift+Tab cycles in reverse. For example, `l` then Tab becomes `ls`, while `boot w` cycles through matching system IDs. Completion also understands virtual paths relative to the current directory, available session variable names and `--embed`. It preserves text after the caret, never submits a command, and resets its cycle after editing, moving the caret, using history or pressing Enter. Empty or unmatched Tab/Shift+Tab follows normal browser focus navigation. Outside the terminal, Tab keeps its normal behavior.

The compact underline cursor uses native xterm blinking while focused, with cursor-only 50% alpha. It remains steady on blur and when reduced motion is requested. Text stays fully bright `#11FF00` on black, with a neutral gray scrollbar and tighter 1.25 line spacing. Long input scrolls horizontally within the prompt without losing URL characters during a resize. No real shell, filesystem, OS environment or process is used.

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

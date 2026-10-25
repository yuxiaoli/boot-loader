# Boot Loader

A pure static entry point to six browser systems, with a light visual selector and a real xterm.js simulated shell.

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

Start in `/systems`. `ls` lists `daedalos`, `macos`, `win12`, `winxp`, `win11` and `webvm`.

```text
help
ls
pwd
cd ..
cat README.txt
boot win11
boot win12 --embed
load https://example.com
set home=https://example.com
load $home
time
echo hello
source webvm
clear
```

`cwd` is an alias for `pwd`. Paths are virtual, with root, relative paths, `.` and `..`; `cd` without a path returns to `/systems`. `boot <id>` always requires an explicit system, independently of selection or directory. It opens the current tab by default; `boot <id> --embed` tries the same computer-screen session as the visual selector, including its direct-open fallback. `--embed` is the only boot option; unknown or repeated options show an error or usage. There is no `os list` alias.

`load` accepts explicit HTTP/HTTPS URLs and rejects embedded credentials, unsafe schemes and self-embedding. `set name=<URL>` stores up to 16 URL values in this page's memory. Names use lowercase letters, digits and underscores, start with a letter and are at most 32 characters; references such as `$home` are case-sensitive and expand exactly once. URL values are at most 2048 characters. State and command history are never saved to browser storage or a server. Reloading resets the simulated session. `time` reads a new local browser Date and actual Intl time zone each time.

Arrow keys edit and recall history; Tab completes; Ctrl+C cancels; Ctrl+L clears; Home/End move the cursor. Shift+Tab leaves the terminal. Long input scrolls horizontally within the prompt without losing URL characters during a resize. No real shell, filesystem, OS environment or process is used.

## Launch modes

Each visual entry offers an explicit screen launch and an ordinary same-tab Open link. Source links remain secondary. A screen session loads no iframe or target assets before a user launches it; switching or exiting removes its frame. Browser Back closes the session. The screen can be exited without entering the embedded page.

Some pages refuse embedding or need capabilities available only in a direct tab. A frame load event does not establish that its app works; the interface keeps a direct-open action and bounded status messages, and never navigates automatically after a timeout. WebVM requires cross-origin isolation and is offered as a direct launch on this Pages host. Win12 starts at its upstream boot page, `https://win12-online.github.io/win12/boot.html`. See [compatibility and verification](docs/VERIFICATION.md).

Edit `src/destinations.ts` to update destinations. See [design decisions](docs/DESIGN.md) for architecture and accessibility details.

## Release

1. Implement and run `npm run check` on `develop`.
2. Verify the built routes, keyboard interaction and mobile layout.
3. Confirm the remote `develop` head, then push the tested commit to `develop`. Never force a changed remote head.
4. GitHub Actions validates that exact commit and deploys its `dist` artifact to Pages. The `github-pages` environment must permit `develop`; preserve existing protection rules and report any restriction instead of bypassing it.
5. Verify `https://yuxiaoli.github.io/boot-loader/version.json` matches the deployed `develop` SHA, then verify live routes/assets and interactions.

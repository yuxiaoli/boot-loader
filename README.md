# Boot Loader

A pure static entry point to four browser desktops. A light visual selector and a real xterm.js command interface.

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

`help`, `os list`, `boot macos|win12|winxp|daedalos`, `source [system]`, `clear`.

Arrow keys edit and recall history; Tab completes; Ctrl+C cancels; Ctrl+L clears; Home/End move the cursor. Shift+Tab leaves the terminal. Only the four configured desktops and their source repositories can be opened. No real shell executes.

Edit `src/destinations.ts` to update destinations. See [design decisions](docs/DESIGN.md) for architecture and accessibility details.

## Release

1. Implement and run `npm run check` on `develop`.
2. Verify the built routes, keyboard interaction and mobile layout.
3. Confirm the remote `develop` head, then push the tested commit to `develop`. Never force a changed remote head.
4. GitHub Actions validates that exact commit and deploys its `dist` artifact to Pages. The `github-pages` environment must permit `develop`; preserve existing protection rules and report any restriction instead of bypassing it.
5. Verify `https://yuxiaoli.github.io/boot-loader/version.json` matches the deployed `develop` SHA, then verify live routes/assets and interactions.

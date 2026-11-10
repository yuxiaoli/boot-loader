# Boot Loader to-dos

## DOT-20261103-007 — Compact theme selector and terminal commands

Status: recorded; combined follow-up implementation not started.

Tracking: [DOT-20261103-007](https://github.com/yuxiaoli/agent-workspace/blob/42611f09183708234c6a7648d7f4e1c8c3893eb1/.agent/context/TASKS.md#DOT-20261103-007).

One combined request, recorded on 2026-11-03:

- Restore the original Theme dropdown's dimensions, position, spacing and alignment beside the existing controls. Keep the closed control's original footprint; show search only when opened, not as a large permanent panel. Retain all 48 popular terminal themes, accessible keyboard selection and existing theme application.
- Remove the auxiliary theme buttons, including Refresh catalogue and Use built-in theme. Keep necessary loading, error and empty-state feedback concise within the selector rather than expanding the normal layout.
- Expose theme names in commands as lowercase, hyphen-separated slugs (spaces become hyphens), retaining autocomplete. Resolve slug collisions explicitly rather than choosing an ambiguous theme.
- Add `theme default` to restore the built-in default theme, replacing the fallback button's action.
- Add the exact command `themes refresh` to reload the catalogue, replacing the refresh button's action.
- Add `reboot` to restart the simulated terminal with a fresh session. This is neither an operating-system restart nor a viewport refit. Preserve persistent preferences while resetting session-only state.
- Show absolute virtual paths in the prompt: `/systems> `, root `/> ` and complete canonical nested paths. Preserve `cd` behavior and command history.

Existing technical artifact: [prompt-only PR #14](https://github.com/yuxiaoli/boot-loader/pull/14), head `fcd148b1e94df2083d9d75b62e6517f303872eb1`. Its 72-test aggregate check, independent bounded review and CI passed. It remains a draft pending release authorization; it is part of this combined to-do, not a separate task or a claim of live delivery.

Do not include the footer word-wrap issue. This entry records the requested work; it does not authorize premature implementation or release of the new combined scope.

### 2026-11-04 update

The combined follow-up was delivered through PR #14 at merge commit `54f64314ce0aa5afc12da2013d3b49f30115092f`. The user initially requested that `reboot` reload the page, then clarified that `reboot` should retain its existing fresh-terminal behavior and a separate `reload` command should refresh the page. This latest correction is pending delivery through the normal review and deployment workflow.

## Roadmap idea — JSON-configured terminal commands

Status: idea recorded for future consideration; implementation is not started.

Explore dynamically loading a JSON configuration that defines command names and their underlying JavaScript behavior, with results formatted for display in xterm.js. Simple browser commands such as `time` and `reload` are candidates. The configuration should also support static string responses, such as configured text for `about` and `intro`.

More complex commands, such as theme selection, would remain implemented in code. An open safety design question is whether the configuration should refer to declaratively registered handlers or allow arbitrary JavaScript evaluation; this choice has not been settled.

### 2026-11-08 baseline note

The JSON-command idea above is historical. Current `develop` at [f30be72](https://github.com/yuxiaoli/boot-loader/commit/f30be72e519b49f606653a077441e0a20f28ece3) contains the implementation merged in PR #17: bounded static-text definitions and the compiled `time`/`reload` handlers, with whole-catalog validation and a bundled fallback. The tool proposal below extends that baseline rather than reopening arbitrary JavaScript evaluation.

## Roadmap proposal: trusted browser tools with the npm figlet CLI

Recorded: 2026-11-08.

Status: evaluated and proposed; implementation has not started. This entry authorizes no implementation, dependency installation, merge or deployment.

### Goal and preferred approach

Allow a user to enable a trusted browser-compatible tool with `install figlet`, then use the npm package's existing command and argument conventions, such as `figlet hello`. Reuse upstream functionality and CLI definitions wherever practical. Do not replace FIGlet's renderer or invent a different `figlet` command vocabulary.

Recommended first step: a small, reviewed, source-derived compatibility layer around the existing `figlet` browser library, loaded on demand from the site's own versioned build. Preserve the original CLI contract and explicitly document platform differences. This is browser adaptation of the npm CLI, not a claim that its unchanged Node executable runs in a normal browser.

If executing the original `bin/index.js` without adaptation is a hard requirement, evaluate a real browser-hosted Node runtime as a separate project decision. Do not silently substitute a custom command, claim universal npm compatibility, or introduce a heavyweight runtime solely for this first tool.

### Verified upstream CLI contract

Source review used [figlet upstream commit d29f4c1](https://github.com/patorjk/figlet.js/tree/d29f4c185973b745100b7b23d6ba6e2cdf764fb2), whose package metadata reports version 1.12.0, and its locked Commander 14.0.0. The npm registry's published tarball and exact CLI behavior still need verification before implementation; this review did not run the CLI.

The [existing CLI entry point](https://github.com/patorjk/figlet.js/blob/d29f4c185973b745100b7b23d6ba6e2cdf764fb2/bin/index.js) defines:

- `figlet [options] [text]`: one optional text argument. Preserve case, spaces and quoting. `figlet "Hello World"` supplies one argument; do not automatically join arbitrary extra arguments.
- `-f, --font <font>`: default `Standard`.
- `-w, --width <width>`: default `80`; current source applies `parseInt(value, 10) || 80`. Do not silently replace this default with the terminal width.
- `-h, --horizontalLayout <layout>` and `-v, --verticalLayout <layout>`: both default to `default`. In this CLI, `-h` means horizontal layout, not help.
- `-l, --list`: print the available fonts in sorted order.
- `-i, --info <font>`: load that font and print its options as formatted JSON.
- `--help` and `-V, --version`: retain the normal Commander help/version behavior.
- The action handles list before info, then shows help if text is absent or empty. Rendering loads the selected font and calls `textSync`; errors are written to stderr with a nonzero exit status.
- The reviewed CLI does not read stdin. Pipes and input redirection are not part of this entry point's functionality. Commander 14 rejects excess positional arguments by default.

Preserve upstream option spelling and behavior, including `--` for literal text beginning with a dash. Use `--list`, not a newly invented `--fonts` flag. Test combined options and error cases against the actual pinned CLI instead of assuming common CLI conventions.

### Browser compatibility and concrete gaps

The [package exports](https://github.com/patorjk/figlet.js/blob/d29f4c185973b745100b7b23d6ba6e2cdf764fb2/package.json) include a browser ESM entry and importable fonts. These provide the real renderer, font parser and metadata.

The Node CLI is a different entry point: it imports the Node renderer, `fs`, `path`, `url`, reads package metadata from disk, calls `program.parse()` using process arguments, writes to console/stdout/stderr and uses `process.exit`/process error handlers. The [Node renderer](https://github.com/patorjk/figlet.js/blob/d29f4c185973b745100b7b23d6ba6e2cdf764fb2/src/node-figlet.ts) reads fonts through the filesystem. [Commander 14](https://github.com/tj/commander.js/blob/v14.0.0/lib/command.js) also imports Node modules, including `child_process`; its ESM export alone does not make it browser-native.

Consequences for the proposal:

- Reuse upstream CLI declarations/action structure where feasible, with narrowly defined browser replacements for font access, version lookup, argument input and output/exit handling. A first compatibility investigation must establish whether Commander can be bundled with a small audited set of shims. Do not assume a direct browser import works, add broad Node polyfills without review, or hand-write a new parser as the default.
- The terminal needs a quote/escape-aware text-to-argv boundary. Its current whitespace split is insufficient for `figlet -f "Dancing Font" "Hello World"`. Preserve existing command behavior and do not add shell evaluation, environment expansion, pipes or subprocesses.
- An exit ends only the command and reports its status; it must not close or reload Boot Loader. Capture stdout/stderr through the terminal runner rather than globally replacing console or process behavior.
- Boot Loader currently accepts only printable ASCII input and caps a command at 2200 characters. These are existing differences from a Node terminal; full Unicode or unbounded argv parity is not implied.
- Normal browsers provide no host Node filesystem or process environment. Invalid fonts, unavailable assets and network failures must have explicit, bounded errors.
- Define a differential-test baseline before claiming CLI compatibility. Any deliberate safety limits or error-format differences must be listed rather than hidden.

### Proposed integration

1. Keep the current JSON command catalog's data-only boundary. Add a trusted tools manifest with package ID, exact version, adapter ID, command metadata and approved font assets. A code-owned loader maps IDs to fixed lazy imports; JSON cannot contain executable code or arbitrary package/module URLs.
2. Pin the package and lockfile, retain required licenses, and build the browser dependency plus its compatibility layer into separate same-release assets. Installation means loading and enabling an approved browser package, not running `npm install` or npm lifecycle scripts in the page.
3. `install figlet` validates the manifest, loads the tool and default font, then commits command registration and installation state only after success. Make repeated installs idempotent, deduplicate simultaneous loads and recover cleanly from failures.
4. Extend the command runner for asynchronous work. Support Ctrl+C, timeouts, output limits and session-generation checks so cancelled installs or results from an earlier reboot cannot mutate the new session. Dynamic import itself is not abortable; ignore late results before registration. Consider a Worker for expensive rendering and termination, without treating it as a complete security sandbox.
5. Derive dispatch, help and completion from the same effective registry. Existing built-ins and aliases retain priority; packages cannot overwrite them. A separate `uninstall figlet` removes the registration and saved enablement, without claiming to unload imported ESM from memory immediately.
6. Preserve ASCII-art spacing and newlines, while filtering terminal control sequences. Keep the CLI's width default and options; any viewport-fit convenience belongs outside the upstream command contract.

### Fonts and persistence

- Use the package's original FIGfont data and `parseFont`/rendering APIs. Load Standard with the tool, then other fonts only when requested.
- Prefer deploying the pinned package's full supported font corpus as individual same-origin assets so `--list` can match upstream without downloading every font up front. Measure asset and build cost before committing. If a subset is chosen, explicitly disclose that compatibility difference.
- Use an allowlisted font-to-asset map, size limits and cancellation-aware fetching. Disable implicit missing-font fetches when using a controlled loader; never turn a font argument into an arbitrary URL or filesystem path.
- Browser `figlet.fonts()` lists package-known fonts, while loaded fonts are separate. List only fonts that this release actually makes available; do not report that every font is already downloaded. See [browser font loading](https://github.com/patorjk/figlet.js/blob/d29f4c185973b745100b7b23d6ba6e2cdf764fb2/src/figlet.ts#L1533-L1655).
- Proposed persistence stores only validated installation metadata and tool preferences under a versioned Boot Loader storage key. Do not persist command history, URL variables or arbitrary executable source as a side effect.
- `reboot` should reset session state but retain installed tools; a page reload should restore the installation records and lazily reload compatible code. Revalidate saved IDs/versions against the current trusted manifest. Handle denied storage, corrupt records and incompatible versions without breaking the terminal.
- Saving installation records does not guarantee offline execution. A separate cache design would need the app shell, tool chunks, fonts, version updates and eviction handling. Until then, describe persistence as remembering enabled tools.
- All projects on `yuxiaoli.github.io` share an origin. Key prefixes prevent collisions but do not isolate data from other same-origin code. Imported packages remain trusted code with page privileges. Storage can also be cleared or unavailable; report session-only enablement when saving fails.

### Acceptance gates for future implementation

- Verify the published npm artifact and exact dependency versions; inspect license and font redistribution requirements. Record the CLI source/version being matched.
- Run a Node reference and browser adapter against the same cases: normal text, quoted text/font names, `--`, help/version, every option and default, sorted list, info output, unknown options/fonts, missing values, excess arguments, empty text, invalid widths and combined flags. Compare output, errors and exit status, with documented platform exceptions.
- Verify install/uninstall/reinstall, duplicate concurrent requests, cancellation, timeout, failed fonts, blocked/corrupt storage, refresh restoration, reboot, Back/Forward and page disposal.
- Check both terminal routes, mobile layouts, keyboard accessibility, completion and preserved built-in behavior. Confirm initial loading stays light and extra tools/fonts remain lazy.
- Before any future release, run the repository's aggregate checks and browser verification. Use a feature branch and draft PR targeting `develop`; do not modify `main` or branch/environment protections.

This roadmap entry is documentation only. No package was installed, no runtime code was changed, and no browser compatibility or offline behavior is claimed as tested.

### Implementation update — 2026-11-08

The later implementation request is prepared on a feature branch for review; this is not a claim of merge or live deployment. It includes the pinned FIGlet 1.12.0 browser adapter with the original Commander 14.0.0 parser, dedicated cancellable Worker, full lazy font corpus, validated installation metadata, install/uninstall and effective help/completion. See [the compatibility baseline and explicit browser differences](FIGLET.md).

The JSON configuration follow-up also decouples configured command names from the approved compiled `time` and `reload` operations. Commands can be renamed, aliased or omitted in the initialization catalogue without executable JSON. Defaults remain unchanged. No arbitrary JavaScript, generic browser API traversal or startup-preference settings were added.

## Requirement: list available trusted packages

Recorded: 2026-11-08.

Status: requirement recorded only; not implemented or released. The user asked to record this need and left the implementation details to us. This is a requirement record, not an instruction to implement or release the feature.

Add an option to the `install` command that lets users discover every trusted package available to install in Boot Loader. FIGlet is the only package currently available; the capability must accommodate future trusted packages without being limited to FIGlet.

Possible implementation considerations:

- List available packages, not only packages already installed or enabled.
- Listing is read-only: it does not install or enable packages or change saved installation state.
- Keep the list consistent with the project's trusted package definitions as packages are added, and preserve the boundary against arbitrary npm packages or executable configuration.
- Make the chosen option discoverable through command usage, help, the virtual help file and completion; preserve existing installation behavior.
- Verify current FIGlet discovery and future package extensibility when implementation is undertaken.

The exact option spelling, output format and implementation design are implementation decisions, not prescribed user requirements.

### Implementation update — 2026-11-08

The later implementation request adds `install --list` on a feature branch for
review. It lists package IDs, pinned versions and descriptions from the existing
trusted manifest, restricted to compiled adapters. Listing is read-only and
includes enabled packages. Installation, completion and tool-command reservations
share those supported entries; a synthetic future package test verifies discovery,
installation and independent enablement without adding a second shipped package.

Help, the virtual help file and completion expose the option. FIGlet's native
`--list` font listing and `-h` layout semantics remain unchanged, as does the v1
saved enablement format. Merge, Pages deployment and live verification are recorded
in the implementation PR after their respective gates pass.

## Requirement: uniform 13px terminal font size

Recorded: 2026-11-10. Tracking: [DOT-20261110-002](https://github.com/yuxiaoli/agent-workspace/blob/develop/.agent/context/TASKS.md#DOT-20261110-002).

The Boot Loader terminal must use **13px text uniformly on every device**. Sean reports that the desktop terminal currently uses 15px; this is user-reported and has not been independently verified.

Status: requirement recorded only; the font adjustment is not implemented, runtime-tested or deployed by this documentation change. Keep the existing theme, catalogue, package-listing and iOS work separate. The linked [Agent Workspace project record](https://github.com/yuxiaoli/agent-workspace/blob/develop/projects/repos/boot-loader/README.md#2026-11-10--uniform-13px-terminal-font-size) tracks the same requirement.

### Implementation update — 2026-11-10

The later finish request replaces the viewport-dependent 13px/15px initialization
with one shared 13px default for both terminal routes and their initial font-size
selector markup. Explicit session-only font selections remain available; resizing,
refit and reboot retain the current choice, while page reload starts at 13px.
The old desktop 15px value is now independently confirmed in the prior source.
Theme, catalogue, package-listing and iOS input behavior are unchanged.
Validation, merge, deployment and live acceptance evidence are recorded in PR #22
after each stage completes.

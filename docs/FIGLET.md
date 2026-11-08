# FIGlet browser compatibility

## Pinned upstream baseline

This release adapts the **published npm `figlet@1.12.0`** CLI, using its real
browser renderer and **`commander@14.0.0`** parser. It does not execute the Node
binary unchanged and does not implement a replacement FIGlet renderer or CLI
parser. The reviewed reference is `node_modules/figlet/bin/index.js`; its option
declarations, defaults, action precedence, help and version behavior are retained.
The package-lock integrity for FIGlet is
`sha512-Ith3WsUi0N/EqGt+0/F6XnWhT04sohhH2tT0Dq7GdUmWbMTIoCbg2Jq9qKggmTO62ST5kRCfB311EmIMbizGyA==`.

Discover available trusted packages with `install --list`, then enable FIGlet with
`install figlet`. Package discovery includes enabled packages and leaves tool
loading, registration and saved enablement untouched. It uses the same trusted
manifest entries and compiled adapter allowlist as installation.

Examples after `install figlet` (`figlet --list` still lists fonts):

```text
figlet "Hello World"
figlet -f "Dancing Font" -w 80 "Hello World"
figlet -h fitted -v full Hi
figlet --list
figlet --info Standard
figlet --help
figlet --version
figlet -- -hello
```

`-h` is horizontal layout, **not help**. There is one optional text argument;
`figlet Hello World` is an error, while quoted text is one argument. Width is
`parseInt(value, 10) || 80`, as upstream; it is not the viewport width. List takes
precedence over info, and info takes precedence over rendering. Empty/absent text
shows help. The upstream CLI has no stdin reader; this adaptation likewise has no
pipes, redirection or subprocesses.

## Bounded compatibility, not Node emulation

Commander's own parser is bundled with importer-scoped replacements for its Node
imports. Its single-command path uses a small EventEmitter (`on`, `emit`,
`listenerCount`) and an inert process object. Output is supplied per command and
`exitOverride` turns exits into command-local status. Filesystem, path and
subprocess APIs have no implementation and fail closed if reached. No Node
polyfill globals are installed, no console functions are replaced, and no host
files, environment, credentials or processes are accessed. The same shims apply
to production workers and Vite dependency optimization.

The code-owned tool worker runs only this reviewed adapter. A Worker is useful for
termination and UI responsiveness, not an isolation/security claim about trusted
same-origin code. Tool installation enables a shipped asset; it never downloads
arbitrary npm packages or runs package lifecycle scripts in the page.

Browser-specific differences:

- The shell retains its printable-ASCII and 2200-character command limit.
- Font names must exactly match the shipped allowlist (including the upstream
  `ANSI-Compact` compatibility alias for `ANSI Compact`). Paths, URLs and Node's
  incidental filesystem traversal behavior are not supported. Missing `--info`
  fonts report an allowlist error instead of exposing a Node filesystem path.
- Asset HTTP/stream failures are browser errors rather than filesystem errors.
  Each font is bounded at 2 MiB, comfortably above the largest shipped font.
- Output is bounded at 256 KiB; terminal controls are filtered by the runner while
  art spacing and line breaks are retained. The worker runner also has a 15-second timeout
  and cancels stale work on interruption, uninstall and disposal.
- Persistence remembers enablement, not package bytes. It does not guarantee
  offline operation. Other same-origin pages are not isolated by a storage key.

## Font assets and attribution

All **332** upstream `.flf` font names are available through **331** individually hashed assets. Identical Larry 3D and Larry 3D 2 payloads are deduplicated by Vite.
Their total raw payload is **9,331,271 bytes**; the largest is **1,140,384 bytes**.
The worker contains the font-name/asset-URL map, not every font's data. Standard is
loaded during installation; other fonts are fetched on first use. `--list` reports
all shipped fonts, including ones not yet downloaded. Implicit FIGlet font fetches
are disabled; the adapter alone controls asset loading.

Original font data and its embedded comments/attributions are preserved byte for
byte. The package declares MIT; its license and Commander's MIT license are
emitted at `licenses/figlet-MIT.txt` and `licenses/commander-MIT.txt`. Font comments
retain their individual author notices. The source-derived CLI adaptation carries
the upstream package attribution via that retained license.

## Verification

`tests/figlet.test.ts` compares stdout, stderr and exit status against the actual
pinned Node executable for normal/quoted text, fonts with spaces, literal `--`,
help/version, all options, list/info, defaults, combined short options, invalid
widths/layouts, absent values, excess positional arguments and unknown fonts and
options. Each case also exercises a production-style browser bundle in a VM
without Node globals, verifying the actual shimmed Commander path rather than
only Node's native Commander import. All 332 font metadata records also match the original Node renderer, including
its BOM handling. Explicit browser exceptions have separate tests. Other tool/terminal tests cover installation and lifecycle behavior.

`node scripts/verify-figlet-assets.mjs` checks exact package versions, corpus count
and payload bounds. Upstream upgrades must re-run both this audit and the
reference differential suite; do not silently change the manifest/package pin.

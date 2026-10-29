# Terminal catalogue consumer — preparation only

`src/terminal-catalog.ts` implements a caller-owned, inert adapter. It is not wired
into the live terminal and performs no fetch or persistence. Existing presets,
font controls, commands, history, Escape behavior and height remain unchanged.

## Boundary

Consumer contract `1.0` accepts terminal source envelopes `1.0` and `2.0` only.
V1 identifies its source as `terminal`; v2 requires `kind: terminal` plus named
source records. Unsupported versions/editor catalogues are rejected. All rows are
considered; valid rows require identity, source identity/evidence, name and a
hex background/foreground/accent plus exactly 16 ANSI colors. No editor scopes
are guessed. Duplicate IDs reject the whole update. Invalid rows are counted
with index/ID/reason; a wholly incompatible update is rejected.

ANSI index order is black, red, green, yellow, blue, magenta, cyan, white and their
bright variants. Explicit cursor is retained; otherwise accent is used. Selection
is a documented derived foreground-at-25%-alpha policy, not an upstream supplied
role or claim of lossless conversion. Original modes are retained in evidence;
known dark/light modes are exposed and everything else is explicitly unknown.
Source IDs, source theme IDs, source metadata, originals, provenance, license and
author evidence remain attached. The adapter is not a license audit or complete
archival schema validator. Future publication must retain required notices.

`searchCatalog` searches the entire accepted set by name/ID/source/mode and
returns bounded pages (default 50, maximum 100), with full match count. No theme
is permanently dropped to meet a rendering limit.

`CatalogSession.refresh` accepts an explicit loader. Only successful validated
latest-generation results replace the in-memory last-good catalogue. Failed or
incompatible refresh retains the last-good catalogue and selection. Missing
selection after a successful update becomes null: the eventual UI must choose a
built-in fallback rather than applying a random replacement. A failed first load
leaves current=null. No browser credential, command/history storage, automatic
network call, public endpoint or publishing mechanism is added.

## Verified preparation and remaining gate

The existing 29 tests and 10 adapter tests pass, together with typecheck, build
and all three route checks. A local-only full-catalogue dry run against the
verified upstream terminal blob `b86f135567b8417fe464fe999b427567a5c4d3dd`
accepted all 1,363 rows with zero exclusions (1,048 dark, 300 light, 15 unknown).
The input is intentionally NOT included in this public repository. A synthetic
1,363-row test covers bounded search, including the final row. Node timing is not
browser performance verification.

Full integration remains blocked on an approved publishable catalogue contract
and asset. The upstream repository is private and pending review; a feature
branch is not an approved release. No unapproved data or credentials may be
copied into this public site. Resolve upstream publication/redistribution and
version pinning first, then wire the selector/search/source/mode/refresh UI,
verify mobile/keyboard/repeated-refresh behavior, deploy and verify the exact
live version. This checkpoint is NOT a completed catalogue rollout.

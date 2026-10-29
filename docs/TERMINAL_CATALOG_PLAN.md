# Terminal catalogue integration — staged delivery

Task DOT-20261029-025, 2026-10-30 (Asia/Hong_Kong).

1. Inspect the actual terminal catalogue contract; prepare a consumer adapter and
   synthetic regression fixtures without publishing a source dataset.
2. Validate every compatible palette, stable ID, source evidence and mode. Map
   ANSI indices explicitly to xterm roles; never convert editor syntax themes.
3. Prepare bounded search/pagination and an explicit refresh state machine that
   retains the last valid catalogue after failed/invalid refreshes. No persistent
   command/history storage or background network requests.
4. After the upstream contract/publication gate is resolved, wire a reviewed,
   immutable catalogue asset into the existing selector. Add search, result count,
   source/mode attribution and refresh controls while retaining font, commands,
   Esc, history and terminal-height behavior. Keep built-in presets as fallback.
5. Browser-verify keyboard/mobile/repeated refresh flows, then review a draft PR,
   deploy the exact authorized version and verify live version and behavior.

Current phase is independent preparation, not full delivery. There is no approved
public catalogue endpoint; do not make browser requests to a private repository,
embed credentials, or publish an unapproved dataset. Adapter support is not a
claim that the full catalogue is live. Existing develop baseline: 901bd659.

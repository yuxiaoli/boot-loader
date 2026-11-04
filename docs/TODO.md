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

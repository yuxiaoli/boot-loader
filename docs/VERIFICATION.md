# Verification

Local verification was performed against the production `dist` output, served with `vite preview` at the repository base path.

- `npm run typecheck`: passed.
- `npm test`: 3 tests passed, covering all four boot targets, case/spacing, command help/list/source/clear, invalid commands and targets, source casing, completion, draft-preserving history, and paste sanitization.
- `npm run build`: passed. All three routes export complete HTML, including ordinary desktop and source links.
- `npm run verify:build`: passed. Checks route files, all eight destination links, local asset existence, base path, revision identity, absence of embeds and final home terminal placement.
- Chrome desktop: inspected rendered layout, selected macOS by click and Win12 with ArrowDown; inspected all eight link targets. Actual macOS Boot link and WinXP source link navigated correctly.
- Chrome at 390 × 844: inspected visual and terminal layouts; no horizontal page overflow. Verified `os l` + Tab, Enter, Up history, `boot unknown`, clear, exact computed terminal color `rgb(17, 255, 0)` on `rgb(0, 0, 0)`, and Shift+Tab moving focus to the Focus terminal button.
- Direct access and refresh tested for visual and terminal routes under `/boot-loader/`; home loaded directly with its terminal last.
- Actual terminal boot commands navigated to daedalOS, macOS, Win12 and WinXP. After Back from WinXP, `source macos` navigated correctly to its GitHub repository.
- All four demo and four source addresses returned HTTP 200. No destination repository was modified.

## External behavior

The supplied Win12 URL (`https://yuxiaoli.github.io/win12/`) performs a client-side redirect to `https://win12-online.github.io/`, an upstream introduction page with its own launch link. The required configured address is preserved. Destination behavior belongs to those independent projects.

Mobile checks use Chrome viewport emulation, not a physical device. Reduced-motion support is implemented via CSS and xterm cursor configuration. No Spline, 3D, image-generation, iframe or paid-service dependency is included.

## Release evidence

The final release is identified by the GitHub Actions deployment's source SHA and the live `/boot-loader/version.json` response. Local artifacts embed that same revision in every HTML document. Follow the README release steps to reproduce the checks for future changes.

# Changelog

Notable changes to PAVAN//FOUNDRY. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The site is deployed from `main`
and has no numbered releases, so entries are grouped by date. Daily
`chore(assay): refresh repository evidence` commits are not listed.

## 2026-11-11

### Added
- `SECURITY.md`, this changelog, Dependabot, CodeQL, and a Lighthouse check in CI.
- The footer links the portfolio (#15).
- Tests for the vault order, card pruning, hidden repositories and content facts
  (120 to 139 tests; #12 to #15).

### Changed
- The six flagships lead the vault in one fixed order; every other card is still ranked
  by its assay score (#15).
- The bio and mission text name only current work and state no repository count (#13).

### Fixed
- Generated cards that no repository uses are removed from `cards.json` (#12).
- A private repository hidden with `foundry-hide` also leaves the previous standing (#14).
- Comments said private grading was opt-in; it is opt-out (#12).

## 2026-11-09

### Changed
- Flagship cards show measured, current numbers (#9).
- Profile focus areas and the timeline name current work (#10).
- Only non-archived repositories are listed on the assay board (#11).

## 2026-11-07

### Fixed
- CRLF rules for Windows scripts in `.gitattributes` (#8).

## 2026-11-06

### Added
- CI: typecheck, unit tests, script syntax check and build (#2).
- Live-site checks in the assay, and grading of every repository (#2).

### Fixed
- The daily assay had failed since 11 October; it runs again (#2, #4).
- Private grades are kept when the token cannot see private repositories (#5).
- The card writer picks a Groq model that exists, retries properly, and leaves room for
  reasoning tokens (#6, #7).

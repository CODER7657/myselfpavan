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
  (120 to 152 tests; #12 to #23).

### Changed
- Each section below the hero is its own chunk and hydrates in its own task; data that
  arrives after load re-renders as a transition; the window load, the fonts and late
  images share one scroll-trigger refresh. Mobile Lighthouse performance in CI went from
  72 to a median of 76 to 78 (#23).
- Phones load a 768px copy of the ridge plate (#23).
- Phones load a 960px copy of the ridge plate instead of the 2556px one, and the music
  track is fetched once the page is idle. Mobile Lighthouse performance in CI went from
  56 to 72 and the largest paint from 7.5 s to 3.6 s (#16).
- The six flagships lead the vault in one fixed order; every other card is still ranked
  by its assay score (#15).
- The bio and mission text name only current work and state no repository count (#13).

### Fixed
- Small text meets 4.5:1 in both themes: the faint ink is darker in the light theme and
  lighter in the dark one, and a badge not yet earned is no longer drawn at 45% opacity.
  Lighthouse accessibility went from 96 with 41 low-contrast elements to 100 (#23).
- Capability-tree buttons are named by their visible text (#23).
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

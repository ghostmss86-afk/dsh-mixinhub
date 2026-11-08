# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-11-08

### Added

- Side-by-side comparison of 2–3 plugins, with nine decision rows: heat,
  downloads, stars, category, compatibility, package size, first seen,
  description, and install command.
- Directional compatibility advice: `ok`, `below-min`, `above-max`,
  `mismatch`, `undeclared`, `not-bundle`, `unknown`, `unreadable`.
- A plain-language explanation of the heat score, available from every
  detail page.
- Per-plugin notes (up to 500 characters) with local persistence.
- Favorites and notes export/import as a single JSON file.
- `featured_market_search` Agent tool for in-conversation discovery.

### Changed

- Detail pages now combine bilingual copy, README summary, compatibility and
  source links in one view.

## [1.3.0] - 2026-11-08

### Added

- Personal notes on plugin detail pages.
- Export and import of favorites and notes.
- Public README and competitive analysis documents.

## [1.2.0] - 2026-11-08

### Added

- npm manifest lookup with `engines.dsh` compatibility checks and directional
  reasons.
- README summaries (English + machine-translated Chinese) from unpkg, with a
  jsDelivr fallback.
- `featured_market_search` Agent tool (first release).
- Source, package size and repository rows on detail pages.

## [1.1.0] - 2026-11-08

### Added

- Search across the full curated index (2,147 npm plugins at the time).
- Installed-plugin management: enable/disable, update, uninstall.
- Favorites.
- “Rising today” strip.
- Daily heat leaderboard with seven-day trend.

## [1.0.0] - 2026-11-08

### Added

- Initial release: sidebar entry, featured picks, heat leaderboard, bilingual
  descriptions, install commands, and a daily catalog refresh.

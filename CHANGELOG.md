# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-11-12

### Security

- Every route, read or write, now asks the host's connection service
  (`connection.requestRejection`) before running, so a request the host would
  refuse for its own API never reaches market code. Previously these routes
  were exact registrations on the bare web server and bypassed the host's
  browser login, which on a tunnelled or proxied port meant anyone who could
  reach it could install or remove plugins.
- A host that publishes no gate is treated as refusing (503) rather than as
  open. Hosts from 0.2.x publish one.

## [1.7.3] - 2026-11-11

### Changed

- Use the translated empty-state message when copying an empty saved list

## [1.7.2] - 2026-11-11

### Changed

- Add a one-click Discover index source and copy the saved list as Markdown

## [1.7.1] - 2026-11-11

### Changed

- Keep the public catalog lede accurate and land ?q= deep links on the results grid

## [1.7.0] - 2026-11-12

### Added

- **Published plugin index (`docs/index.json`, format 1).** Every release now
  emits a machine-readable index of all verified `dsh.bundle` packages with
  bilingual descriptions, category, repository, latest version and engines, so
  other markets and Agent tools can consume this catalog directly.
- `npm run build:index` builds the index from the public catalog and caches npm
  metadata in `data/index-cache.json` (12 h TTL, throttled for registry limits).
- The release pipeline now rebuilds the index after the catalog; `npm run check`
  fails if the index is missing, not format 1, or has fewer than 500 plugins.

### Changed

- README first screen now leads with install, "what makes it different" and a
  direct comparison with dsh-market, followed by the index-source callout.
  Adoption data moved out of the headline and into Quick facts.

## [1.6.8] - 2026-11-11

### Changed

- Refresh README adoption data: 2,819 npm downloads in three days, official catalog listing (rank 21/140 in market), 10,446/2,224 coverage

## [1.6.7] - 2026-11-09

### Changed

- One-command releases now rebuild the three static pages from `docs-src/` before
  the web catalog, and the docs guard fails the release when README, CHANGELOG,
  `docs-src/changelog.md` or a rendered page is out of sync. No more manual
  reminders to update the README on every version.

## [1.6.6] - 2026-11-09

### Added

- Three long-form static pages rendered with the Guizang Page skill: About, Guide and Changelog, linked from the public catalog header and footer.

## [1.6.5] - 2026-11-09

### Fixed

- Opening the "Installed" tab could close the whole panel: some bundles report a
  localized `title` object (`{ en, zh }`) and React rejected it as a child
  (error #31). The Host now normalises bundle titles to a string and the client
  guards against object titles everywhere it renders one.

### Added

- A **Skills** tab: a read-only list of every installed skill
  (`~/.workbuddy/skills`, `~/.dsh/skills`, `~/.claude/skills`) with what it does,
  when it triggers, and a copy-ready prompt. It answers "I installed a skill,
  where do I open it?" — a skill has no button, it is an Agent capability.
- New read-only endpoint `GET /featured-market/skills`.

## [1.6.4] - 2026-11-08

### Changed

- Public web catalog now opens with the same rotating, hue-driven editor-pick poster and color-matched picks as the in-app panel; bilingual labels, mobile layout and docs sync.

## [1.6.3] - 2026-11-08

### Changed

- Keep the market below host-critical dialogs while retaining the mask-resistant store entry point.

## [1.6.2] - 2026-11-08

### Changed

- Open the store through host modal masks, ship all 2,147 Chinese descriptions, and make the public catalog reflect the installed plugin version.

## [1.6.1] - 2026-11-08

### Changed

- Show the curated-market rank on each dashboard card, allow up to twelve tracked projects, and reject unknown repositories with a clear message.

## [1.6.0] - 2026-11-08

### Changed

- Add a local project dashboard for GitHub stars, npm downloads, open issues and new-feedback alerts.

## [1.5.5] - 2026-11-08

### Changed

- Require a per-process write token on mutating routes, block foreign-origin writes, fix the public catalog's featured names, and state that 0.3.x is allowed but untested.

## [1.5.4] - 2026-11-08

### Changed

- Sync the comparison table's own version with the package version on every release.

## [1.5.3] - 2026-11-08

### Changed

- Correct coverage and compatibility claims, disclose project maturity honestly, add verifiable competitor evidence, publish llms.txt on the public catalog, and clarify install/update boundaries.

## [1.5.2] - 2026-11-08

### Changed

- Make the README easy for AI assistants to recommend: quick facts, fit boundaries, named alternatives, troubleshooting, verification, and llms.txt; keep README, CHANGELOG and llms.txt in sync.

## [1.5.1] - 2026-11-08

### Fixed

- Mount routes only after the Host web server is ready, add a health probe, and retry transient snapshot failures so a cold start no longer leaves the market blank.

## [1.5.0] - 2026-11-08

### Changed

- Background update alerts with a sidebar dot, one-click update all, and a five-minute update cache.

## [1.4.1] - 2026-11-08

### Fixed

- The client module id and the market's self-protection now follow the
  published package name (`dsh-featured-market`), while still recognizing
  the old local alias (`@local/featured-market`). This prevents the market
  from being disabled or uninstalled by itself after the rename.

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

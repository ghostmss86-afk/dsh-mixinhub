# Releasing

One command bumps the version, syncs the README, `llms.txt` and changelog,
checks everything, commits, tags and pushes. GitHub Actions then builds the
release and publishes to npm.

## One-time setup

- Add an npm automation token as the `NPM_TOKEN` repository secret. Without
  it the release still succeeds; only the npm step is skipped with a notice.
- The official-market entry points at the stable asset
  `releases/latest/download/dsh-featured-market.tgz`, so a new release does not
  require editing the market entry.

## Release

```bash
npm run release -- patch "fix: ..."
# or: minor / major
```

The script:

1. bumps `package.json` without creating a tag,
2. updates the README badge, `**Version:**` line and Quick facts version,
   plus the `Version:` line in `llms.txt`,
3. prepends a `CHANGELOG.md` entry with the supplied note,
4. runs `npm run check`,
5. commits `chore(release): vX.Y.Z`, tags, and pushes `main` plus the tag.

`.github/workflows/release.yml` then:

- re-runs the checks,
- creates the GitHub Release with the versioned tarball and the stable
  `dsh-featured-market.tgz`,
- publishes to npm when `NPM_TOKEN` is configured.

## README policy

The README is part of the product, not an afterthought. Every release updates:

- the version line, badge, Quick facts and `llms.txt` (done by the release
  script),
- any changed behavior, thresholds or commands,
- the comparison and FAQ when positioning changes.

`npm run check` enforces that the README version, `llms.txt` version,
changelog entry and required sections stay in sync with `package.json`.

# Releasing

This project keeps code, README and changelog in lockstep. CI enforces it.

## Checklist

1. Make the change and update `client.js` / `index.js` / `lib/`.
2. Bump `version` in `package.json` (semver).
3. Update the `**Version:**` line and the affected sections in `README.md`.
4. Add a `## [x.y.z]` entry to `CHANGELOG.md`.
5. Run `npm run check` and `npm pack --dry-run`.
6. Commit: `chore(release): x.y.z`.
7. Tag and push: `git tag vX.Y.Z && git push origin main --tags`.
8. Create a GitHub Release and attach the packed `.tgz`:
   `npm pack && gh release create vX.Y.Z dsh-featured-market-X.Y.Z.tgz`.
9. Update `docs/market-entry.yml` `tarball:` URL for the new tag, and submit /
   update the entry in `awesome-dsh-plugin` if the description changed.
10. npm is not part of the current distribution path: the plugin installs from
    GitHub and the market entry uses the release tarball. The optional
    **publish** workflow (`.github/workflows/publish.yml`) stays manual and is
    only used if an npm release is decided later; it requires the `NPM_TOKEN`
    secret and is never triggered by a release.

## README policy

The README is part of the product, not an afterthought. Every release updates:

- the version line and badge,
- any changed behavior, thresholds or commands,
- the comparison and FAQ when positioning changes.

`scripts/check-docs.mjs` fails the build when the version, changelog entry or
required sections are missing, so this cannot be skipped silently.

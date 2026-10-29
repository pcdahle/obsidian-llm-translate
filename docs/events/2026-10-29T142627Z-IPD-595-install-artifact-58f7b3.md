---
occurred_at: 2026-10-29T14:26:27.555450+00:00
recorded_at: 2026-10-29T14:26:27.555450+00:00
kind: correction
status: verified
issue: IPD-595
branch: feature/ipd-595-safe-translation
---

# Make the built plugin downloadable from branch CI

The implementation at ee3592c3a806ba89a596c1538b6ce12d9590621f produced and verified a local installation ZIP but did not upload it to GitHub. GitHub's branch source archive intentionally excludes the ignored main.js and styles.css build outputs, so it could not serve as an installation download. This corrects the delivery gap described after the original [implementation event](2026-10-29T130127Z-IPD-595-safe-translation-c72f41.md).

The Check workflow now uploads only dist/translate-note/ after npm run verify succeeds. Its translate-note-install artifact contains main.js, manifest.json and styles.css at the archive root; it is retained for 30 days. README distinguishes the installation artifact from Code/Download ZIP. The plugin code and version remain unchanged. The exact upload-artifact v7.0.2 action was verified against the official published release. Workflow path/ordering and allowlisted payload were inspected locally; actual run URL, downloaded artifact membership and build comparison are recorded in the delivery issue after the run completes. This entry does not claim a release or real-vault installation.

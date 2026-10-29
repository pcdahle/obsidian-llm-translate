---
occurred_at: 2026-10-29T13:01:27.836752+00:00
recorded_at: 2026-10-29T13:01:27.836752+00:00
kind: implementation
status: verified
issue: IPD-595
branch: feature/ipd-595-safe-translation
---

# TranslateNote 0.3.0: per-request languages and guarded file translation

The fork keeps the existing OpenAI-compatible SDK client, fetch adapter, provider configuration and editable review panel. Existing command IDs and the translate-note plugin ID remain stable; the legacy language setting seeds the dialog while a new field persists the last confirmed choice. English/Swedish quick choices and configured languages are available on selection, full-note and file-menu flows.

The file menu adds new-file, review/overwrite and direct-overwrite modes. A CommonMark/GFM parser identifies prose; source offsets preserve original syntax. Headings and complete links/aliases deliberately stay unchanged to retain anchors and reference identity. Metadata, code and supported Obsidian constructs are masked before model calls and restored locally. Placeholder integrity, nonempty spans and the protected structural fingerprint are checked before accepting a model reply and again after manual review. Non-stop completion reasons are refused.

Overwrites check file identity, disk content and all open Markdown editors, then create and read back a JSON recovery copy. The original-content comparison is inside vault.process as well as before it. New files use the source folder and unique names. Failed saves retain the result for recovery. A pending result cannot be silently replaced by another command; save operations reject duplicate clicks and observe cancellation/unload before writing.

A separate critical review found and corrected incorrect active-file binding for inactive editor-menu contexts, cancellation during backup, multiline quote prefixes spanning a prose node, and language selection with custom prompts lacking a language placeholder. Dedicated regression cases exercise these boundaries.

Verification: npm run verify passed, including TypeScript, ESLint, 38 acceptance/regression tests, production build, a smoke test loading the exact CommonJS bundle, and ZIP member/readback/checksum validation. Synthetic hosts run the actual plugin modules, existing SDK/adapter and JSDOM UI; they do not verify an installed Obsidian desktop app, a real provider or live Syncthing behavior. Runtime dependency audit reported zero vulnerabilities. Inherited development-tool advisories are separately tracked and were not remediated in this feature.

The distribution is versioned 0.3.0, desktop-only with minimum Obsidian 1.13.0. It contains main.js, manifest.json and styles.css. README documents installation, recovery copies, strict validation, copied Dbox identity fields and external-process race limitations. The upstream Git remote is retained. This event records verified branch implementation; it does not claim merge, public release, real-vault installation or user acceptance.

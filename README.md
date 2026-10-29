# TranslateNote — language picker and safe file translation

An Obsidian desktop plugin based on [Dmagg/TranslateNote](https://github.com/Dmagg/obsidian-llm-translate), itself a fork of [LLM Translate](https://github.com/chenyuxiaojin/obsidian-llm-translate) (MIT).

This fork keeps the existing OpenAI-compatible translation engine, provider configuration, error handling and editable review panel. Version **0.3.0** adds a language dialog and file-explorer translation with guarded writes. Requires **Obsidian 1.13.0+**; desktop only.

## Translate

Use **Translate selection** or **Translate full note (preserve front-matter)** from the command palette, editor context menu or your existing hotkey. Choose the target language in the dialog and press **Translate**. These commands continue to send the result to the review panel; **Insert** accepts it and **Discard** leaves the note alone.

**English** and **Swedish** are always quick choices. Add languages under **Settings → TranslateNote → Additional languages**, one per line or separated by commas/semicolons. Your existing **Target language** remains the initial default; the dialog remembers the last confirmed language across restarts. Cancel closes the dialog without sending a request or changing the remembered choice.

Right-click a Markdown file in the file explorer and choose **Translate…**. The file does not need to be open. Choose a language and a save mode:

| Mode | Result |
| --- | --- |
| **Create new file** (default) | Keeps the original. Creates a file in the same folder with language, timestamp and a unique suffix in its name. |
| **Review and overwrite** | Shows the editable result in the existing sidebar. Nothing is written until **Insert**. |
| **Overwrite original** | Writes only after a complete, validated reply, an unchanged-source check and a verified recovery copy. |

The review panel also offers **Create new file**, including after a refused overwrite. Accept, save or discard the current result before starting another translation. Save editor changes before translating; if the on-disk note and an open editor differ, the request is refused.

## Preservation and conflict handling

The plugin parses CommonMark/GFM and sends prose with safety placeholders to the configured model. It restores the original protected spans locally and validates the result before displaying it for acceptance, and again after manual review edits.

- YAML frontmatter, including BOM, line endings and metadata values, remains byte-for-byte unchanged.
- Markdown structure, whitespace outside prose, lists, tasks, tables, emphasis and quote prefixes are preserved.
- Markdown links, reference links, Obsidian `[[links|aliases]]`, embeds, URLs and `dbox:<UUID>` references remain unchanged, including link captions.
- Headings remain in the original language to preserve heading anchors and incoming links. Code, HTML, math, tags, block identifiers and Obsidian comments are also kept unchanged.
- Missing, duplicated or reordered placeholders, empty/truncated replies and changes to protected structure are refused. No automatic overwrite retry is made.
- Overwrites check file identity/path, on-disk content and every open Markdown editor. The original-content comparison is also inside `vault.process`, so a late change does not pass an earlier stale check.
- A save error keeps the valid translation in the panel. Copy it, save a new file, or discard and translate the updated note again.

**Limits:** validation protects structure and identifiers, not translation accuracy or every third-party Markdown extension. It is deliberately strict: review can edit prose, but removing a link or restructuring paragraphs is refused. A weak model or a conflicting custom prompt may repeatedly fail validation. Prose around protected spans may translate less fluently; review important text. Headings/link captions are deliberately not translated. Placeholder overhead increases token use. The inherited `requestUrl` transport buffers responses, so this is not live network streaming.

`vault.process` coordinates Obsidian writes; it does not take an operating-system lock against Syncthing or another process. Direct disk checks catch external edits even before Obsidian receives a change event, but no guarantee is made against an external write racing the actual filesystem operation or replacing the result afterwards. Prefer **Create new file** or pause synchronization when overwriting important notes. Unique destination names and collision checks avoid reusing existing translation names; filesystem errors leave the result available in the panel.

**Dbox identities:** a new file copies frontmatter exactly, including an `id` field. Do not register both copies as independent managed Dbox documents with the same UUID. Use the Dbox document-creation workflow to assign a new identity if the translation is to become a separate managed document, or use review/overwrite to retain one document identity.

## Install or upgrade this fork

This branch is a manual-install fork. Installing/updating the upstream Community Plugin is a separate source and may replace these changes.

1. Download the built plugin from this branch's successful **Actions → Check** run: under **Artifacts**, choose **translate-note-install**. That ZIP contains **main.js**, **manifest.json** and **styles.css** at its root. GitHub may require you to sign in; artifacts are retained for 30 days. **Code → Download ZIP is the source archive and does not contain main.js.** Alternatively build locally: `dist/translate-note-0.3.0.zip` contains the same three files inside a `translate-note/` folder.
2. If upgrading, disable TranslateNote and make a protected copy of the existing plugin folder and any notes you intend to overwrite.
3. Copy the three files to `<vault>/.obsidian/plugins/translate-note/` (or your vault's custom configuration directory). **Keep existing `data.json` and `backups/`; do not replace the entire directory.** The plugin ID and command IDs are unchanged, so existing settings/hotkeys remain usable. Do not enable two copies with the same ID.
4. Reload Obsidian and enable **TranslateNote** under **Settings → Community plugins**.
5. Configure an API provider under **Settings → TranslateNote → API providers**, supply its key and model, and set it active. Existing providers, endpoints, models, keys and custom prompts are preserved. Presets and the **Switch API provider** command still work.
6. Try **Create new file** on a small test note before using overwrite on valuable notes.

Only the three built files are required at runtime. Do not copy `node_modules` or build/test directories into the vault. API keys remain stored unencrypted in the vault's plugin `data.json`, as in upstream. Note prose is sent to the provider you select. Keep plugin data/recovery copies out of public repositories and handle synced vaults accordingly.

## Recovery

Before every overwrite (including **Insert**), the plugin writes and reads back a JSON recovery copy under:

```text
<vault>/<config-directory>/plugins/translate-note/backups/<timestamp>-<uuid>.json
```

Each file contains `format`, `createdAt`, `filePath` and the exact original `content`. A backup failure stops the overwrite. Backups are never automatically pruned, so review disk use and retain/remove them deliberately. They contain original note text and may be synced along with your configuration directory.

To recover: stop editing/synchronization for the affected note, preserve a copy of its current state, open the relevant JSON, and restore the **decoded `content` string** to the recorded note path using a trusted editor or script. Compare it before resuming sync. Do not paste the JSON representation with its literal `\\n` escape sequences. Recovery copies preserve the original text, not attachments or filesystem metadata. For plugin rollback, disable TranslateNote and restore the previous three plugin files; retain `data.json` and recovery copies.

## Build and verify

Requires Node.js **22.6+**, npm, and Python 3 for the optional ZIP packaging step.

```sh
npm ci
npm run verify
```

`verify` runs TypeScript, ESLint, the acceptance/regression tests, a production build, a smoke test of the actual CommonJS bundle, and packaging. Individual commands:

```sh
npm test               # parser, file safety, settings, dialogs, SDK integration
npm run check
npm run lint
npm run build          # main.js and styles.css in repository root
npm run test:bundle    # exercise the built bundle with a synthetic Obsidian host
npm run package        # build, bundle smoke test and ZIP/checksums
```

Outputs:

```text
dist/translate-note-0.3.0.zip
dist/translate-note/{main.js,manifest.json,styles.css}
dist/SHA256SUMS
dist/BUILD.json
```

Check the archive with `cd dist && sha256sum -c SHA256SUMS`. `BUILD.json` records the source commit and whether the checkout had uncommitted changes. ZIP entries have fixed timestamps and are read back against the built files. No keys, note backups, development dependencies or test fixtures are packaged.

Tests run the actual plugin modules and existing OpenAI SDK/fetch adapter with synthetic replies, a contract implementation of the Obsidian API, and JSDOM for UI behavior. A separate smoke test loads the exact production bundle, verifies it has no runtime dependency except Obsidian, and exercises the file menu through saving a new file. These checks **do not claim verification in an installed Obsidian desktop application, with a real provider, or against a live Syncthing client**. Mobile remains unsupported. No real vault or paid model request is used.

The upstream lockfile has inherited development-tool dependency advisories; `npm audit --omit=dev` checks the shipped dependency set separately. Dependency remediation is outside this feature's scope; do not run `npm audit fix --force` as part of installation.

## Future upstream updates

The Git remotes stay distinct:

```text
origin    https://github.com/pcdahle/obsidian-llm-translate.git
upstream  https://github.com/Dmagg/obsidian-llm-translate.git
```

Fetch with `git fetch upstream`, inspect the changes, integrate on a separate branch and run `npm run verify`. Do not overwrite this fork's files with upstream artifacts without reviewing compatibility.

## License and attribution

[MIT](LICENSE). Original work © 2026 xiaochen (陈与小金); international/review-panel fork © 2026 D.maggiora. This fork builds on that work and keeps its license and credits. The original lineage includes [obsidian-llm-shortcut](https://github.com/chernodub/obsidian-llm-shortcut).

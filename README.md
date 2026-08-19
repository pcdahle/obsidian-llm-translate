# TranslateNote

> An Obsidian plugin that translates a selection or a whole note with any OpenAI-compatible LLM, and shows the result in a side panel so you can read it against the original before it touches your note.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D1.13.0-purple)](https://obsidian.md)
[![Version](https://img.shields.io/badge/version-0.2.0-blue)](manifest.json)

> **Desktop only** — `isDesktopOnly: true`. Mobile has not been tested.

---

## Why

You clip an English article or a YouTube transcript into Obsidian and want to read it in your own language, without leaving the editor.

Most translation plugins overwrite your note with the result. That leaves you with no way to check the translation against the source, and nothing to go back to if it is wrong. TranslateNote sends the translation to a side panel instead: you read it next to the original, edit it if you want, and the note changes only when you press **Insert**.

---

## Features

- **Review before accepting** — the translation opens in a side panel with **Insert** and **Discard**. Your note is not modified until you insert.
- **Editable result** — fix a word or a whole paragraph in the panel before inserting it.
- **Translate a selection or the whole note** — for a full note, the YAML front-matter is left out of the translation and preserved on insert.
- **Any target language** — a free-text field, not a fixed list. Type `Italian`, `Japanese`, `Brazilian Portuguese`; the model does the rest.
- **Editable system prompt** — control tone and terminology, with a `{{targetLanguage}}` placeholder and a one-click restore.
- **8 provider presets, plus custom** — every preset points at a globally reachable endpoint.
- **Quick provider switch** — one command flips the active provider without opening settings.
- **Safe insert** — if the note changed while you were reviewing, the insert is refused rather than overwriting your edits.
- **Long-note guard** — notes over 20,000 characters ask for confirmation before the request goes out.

---

## Install

The plugin is **not yet listed** in the Obsidian Community Plugin directory. To install it manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/Dmagg/obsidian-llm-translate/releases).
2. Create the folder `<your-vault>/.obsidian/plugins/translate-note/`.
3. Copy the three files into it.
4. Reload Obsidian, open **Settings → Community plugins**, find **TranslateNote** and enable it.

---

## Configuration

1. Open **Settings → TranslateNote**.
2. Under **API providers**, press **+** and pick a preset.
3. Open the provider that was added and fill in its **API key**. The **Base URL** and **Model name** come pre-filled; change the model if you want a different one.
4. With more than one provider configured, open the one you want and press **Set as active** — or use the *Switch API provider* command.

Under **Translation** you set the **target language** (any language name) and, if you want, edit the **system prompt**.

### Where to get an API key

| Provider | Sign up | Pre-filled model |
|---|---|---|
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | `deepseek-chat` |
| OpenAI | [platform.openai.com](https://platform.openai.com) | `gpt-5.4-mini` |
| Gemini | [aistudio.google.com](https://aistudio.google.com) | `gemini-3.5-flash-lite` |
| Kimi (Moonshot) | [platform.moonshot.ai](https://platform.moonshot.ai) | `kimi-k2.6` |
| Qwen | [Alibaba Cloud Model Studio](https://www.alibabacloud.com/help/en/model-studio) | `qwen-turbo` |
| Z.AI (GLM) | [z.ai](https://z.ai) | `glm-4.7-flash` |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | *(set manually)* |
| Custom | any OpenAI-compatible endpoint | *(set manually)* |

Model names move fast. If a pre-filled model has been retired, the plugin tells you so — change the **Model name** field to a current one from your provider's model list.

---

## Usage

### Commands (Cmd/Ctrl + P)

| Command | What it does |
|---|---|
| **Translate selection** | Translates the selected text into the panel |
| **Translate full note (preserve front-matter)** | Translates the note body into the panel |
| **Switch API provider** | Picks the active provider from a list |

All three are also in the editor's right-click menu, and can be bound to hotkeys under **Settings → Hotkeys**.

### The review panel

The translation appears in the right sidebar. From there:

- **Insert** writes it back into the note — over the selected range for a selection, over the body for a full note, leaving the front-matter alone.
- **Discard** throws it away. The note was never touched.
- The text is a normal editable field, so you can correct the translation before inserting it.

---

## The system prompt

This is what the model is told by default:

```
You are a professional translation engine. Translate the following content into {{targetLanguage}}.

Rules:
- Preserve the paragraph structure and Markdown formatting of the source
- The first time a proper noun or technical term appears, keep it in the source language and put the translation in parentheses right after it
- Do not add explanations, summaries or comments; output the translation only
- Preserve the tone and register of the source
- Leave numbers, URLs and code snippets untouched
```

`{{targetLanguage}}` is replaced by the **Target language** setting. Edit the prompt to suit your material — a glossary line, a register instruction, a rule about how to handle quotations — and use **Restore default prompt** to go back.

---

## FAQ

**Does it modify my note while translating?**
No. The translation goes to the panel. The note changes only when you press **Insert**.

**What if I edit the note while a translation is open in the panel?**
The insert is refused, with a notice explaining why. Copy the text out of the panel, or run the translation again.

**Is the front-matter translated?**
No. For a full note, only the body after the closing `---` is sent to the model, and the front-matter is preserved on insert.

**Which languages can I translate into?**
Any language the model supports. **Target language** is a free-text field, so it works in every direction — set it to `English` to go the other way.

**Where are my API keys stored?**
Unencrypted, in `data.json` inside the plugin folder of your vault. This is how Obsidian plugins store settings. Keep it in mind if your vault is synced or shared.

**Can I use a local model?**
Yes. Pick **Custom** and point the base URL at your endpoint — for example `http://localhost:11434/v1` for Ollama.

**What happens with very long notes?**
Over 20,000 characters you get a confirmation first. The request is sent in one go, so a long note means a large single request: worth knowing if your plan has tight limits.

**Does it work on mobile?**
Untested. The manifest says `isDesktopOnly: true`.

---

## Requirements

- Obsidian ≥ 1.13.0
- Desktop (macOS / Windows / Linux)
- An API key from at least one provider

---

## License

[MIT](LICENSE)

- Original work © 2026 xiaochen (陈与小金)
- Fork and subsequent modifications © 2026 D.maggiora

---

## Acknowledgements

TranslateNote is a fork of [LLM Translate](https://github.com/chenyuxiaojin/obsidian-llm-translate) by 陈与小金, which is itself derived from [obsidian-llm-shortcut](https://github.com/chernodub/obsidian-llm-shortcut) by chernodub — the OpenAI-compatible request adapter and the loading indicator come from that lineage.

This fork exists because the original is a Chinese-only plugin: its interface, its error messages and its default prompt were all in Chinese, which put a good translator out of reach for anyone who does not read it. What changed here: the whole plugin is in English, the provider presets point at globally reachable endpoints, and translations go through a review panel instead of overwriting the note.

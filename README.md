**English** | [中文文档](README.zh-CN.md)

# LLM Translate

> obsidian-llm-translate is an Obsidian plugin that translates selected text or whole notes with LLMs (DeepSeek, OpenAI, Gemini, and any OpenAI-compatible provider), with streaming output and frontmatter preservation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D0.15.0-purple)](https://obsidian.md)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](manifest.json)

> **Desktop only** — `isDesktopOnly: true`. Mobile (iOS/Android) is not supported.

---

## Why

You clip English articles or YouTube transcripts into Obsidian and want them in your reading language — without leaving the editor. LLM Translate keeps it simple: one command to translate a selection, one command to translate the whole note. YAML frontmatter is never touched.

---

## Features

- **Translate selection** — select text → command palette or right-click → AI translates and replaces inline
- **Translate full note** — preserves YAML frontmatter; only the body is sent to the LLM
- **Streaming output** — translation appears word-by-word as it arrives
- **Cancellation** — a spinner in the status bar turns into an ✕ on hover; click to stop and restore the original text
- **9 built-in providers + custom** — DeepSeek, OpenAI, Gemini, Doubao (豆包), Kimi, Qwen (通义千问), Zhipu (智谱), SiliconFlow, OpenRouter, or any OpenAI-compatible endpoint
- **Quick provider switch** — a single command lets you flip between providers without opening settings
- **Editable system prompt** — supports `{{targetLanguage}}` placeholder; reset button restores the default
- **Long-note guard** — notes over 20,000 characters require a confirmation before translation

---

## Install

### Manual install (current method)

The plugin is **not yet listed** in the Obsidian Community Plugin directory. Install manually:

1. Go to the [Releases page](https://github.com/chenyuxiaojin/obsidian-llm-translate/releases) and download the latest `main.js`, `manifest.json`, and `styles.css`.
2. Create the folder `<your-vault>/.obsidian/plugins/llm-translate/` if it does not exist.
3. Copy the three files into that folder.
4. Restart Obsidian, then go to **Settings → Community plugins**, find **LLM Translate**, and enable it.

> Community Plugin directory listing is planned for a future release.

---

## Configuration

1. Open **Settings → LLM Translate**.
2. From the **Add provider** dropdown, pick a preset (e.g. DeepSeek).
3. Expand the newly added provider and fill in:
   - **API Key** — generated from the provider's dashboard
   - **Model** — a sensible default is pre-filled; change as needed
4. To use multiple providers, add more and use the **Set as current** button to switch.

### Where to get API keys

| Provider | Sign-up URL | Default model |
|---|---|---|
| DeepSeek | platform.deepseek.com | `deepseek-chat` |
| OpenAI | platform.openai.com | `gpt-4o-mini` |
| Gemini | aistudio.google.com | `gemini-2.0-flash` |
| Doubao (豆包) | console.volcengine.com/ark | *(set manually)* |
| Kimi | platform.moonshot.cn | `moonshot-v1-8k` |
| Qwen (通义千问) | dashscope.console.aliyun.com | `qwen-turbo` |
| Zhipu (智谱) | bigmodel.cn | `glm-4-flash` |
| SiliconFlow | siliconflow.cn | *(set manually)* |
| OpenRouter | openrouter.ai | *(set manually)* |

---

## Usage

### Three commands (Cmd/Ctrl + P)

| Command | When to use |
|---|---|
| **Translate selected text** | Text is selected |
| **Translate full note (preserve frontmatter)** | Anytime |
| **Switch API provider** | Quickly change the active provider |

### Right-click menu

Select text in the editor, right-click, and you will see **Translate selected text** and **Translate full note (preserve frontmatter)**.

### Keyboard shortcuts (optional)

Go to **Settings → Hotkeys**, search "LLM Translate", and bind a hotkey to any of the three commands.

---

## Custom system prompt

Default prompt (translated for reference):

```
You are a professional translation engine. Translate the following content into {{targetLanguage}}.

Rules:
- Keep the original paragraph structure and Markdown formatting
- For proper nouns and technical terms, keep the English on first occurrence with a parenthetical translation
- Output only the translation — no explanations, summaries, or comments
- Preserve the tone and style of the original
- Leave numbers, URLs, and code snippets unchanged
```

Edit the prompt in settings. `{{targetLanguage}}` is replaced by the **Target language** value (default: `中文`). Click the reset button to restore the default.

---

## Compared to alternatives

| | **LLM Translate** (this plugin) | **Translate** (lyc8503/obsidian-translate) | **obsidian-llm-shortcut** (chernodub) |
|---|---|---|---|
| Translation focus | Yes — translation only | Yes — translation only | No — general LLM shortcut runner |
| LLM backend | OpenAI-compatible only | Multiple engines (DeepL, Google, LibreTranslate, LLM…) | OpenAI-compatible |
| Streaming output | Yes | No | Yes |
| Frontmatter preservation | Yes | Partial | No |
| Provider switching | In-editor command | Settings only | Settings only |
| Cancellation | Yes (status bar ✕) | No | No |
| Relationship | — | Independent project | This plugin is derived from it |

---

## FAQ

**Q: Can I stop a translation mid-way?**  
A: Yes. The status bar shows a spinner during translation; hover over it to reveal an ✕ and click to cancel. The original text is fully restored.

**Q: Will the plugin run on mobile (iOS/Android)?**  
A: No. The plugin is marked `isDesktopOnly: true` in its manifest. It is only tested and supported on macOS, Windows, and Linux.

**Q: Does the frontmatter get translated?**  
A: No. Full-note translation only processes the body after the `---` delimiter. Frontmatter is passed through unchanged.

**Q: What happens with very long notes?**  
A: Notes over 20,000 characters trigger a confirmation dialog before the request is sent. Most modern LLMs have ≥128 K context, so 20,000 characters is well within limits — the dialog is a safeguard against accidental large-file translation.

**Q: Why did my translation fail halfway?**  
A: Common causes: expired API key, zero balance, or a misspelled model name. The plugin shows an error dialog with a description. Check Settings → LLM Translate and verify the key and model.

**Q: Do Chinese providers (DeepSeek, Doubao) require a VPN?**  
A: Generally no — DeepSeek (`api.deepseek.com`), Doubao (Volcengine ARK), Kimi, Qwen, Zhipu, and SiliconFlow all have mainland-China-accessible API endpoints. OpenAI and Gemini endpoints do require network access that bypasses the GFW if you are in China. DeepSeek is currently the cheapest option for Chinese users: `deepseek-chat` is very affordable and produces high-quality translations.

**Q: Which target languages are supported? Can I translate in the reverse direction (Chinese → English)?**  
A: Any language the underlying LLM supports. Set **Target language** in settings to any language name — `English`, `Japanese`, `French`, etc. — and the prompt will instruct the model to translate into that language. Reverse translation (Chinese → English) works the same way: just set the target language to `English`.

**Q: Can I use a self-hosted or third-party OpenAI-compatible endpoint?**  
A: Yes. Select **Custom** from the provider dropdown, enter your base URL (e.g. `http://localhost:11434/v1` for Ollama), API key (if any), and model name.

---

## Requirements

- Obsidian ≥ 0.15.0
- Desktop only (macOS / Windows / Linux)
- An API key from at least one supported provider

---

## License

[MIT](LICENSE) — © 2026 xiaochen

---

## Acknowledgements

Derived from [obsidian-llm-shortcut](https://github.com/chernodub/obsidian-llm-shortcut) by chernodub — the streaming output layer and OpenAI-compatible request adapter are based on that work.

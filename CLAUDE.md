# CLAUDE.md

## Fork del plugin per Obsidian di 陈与小金 Chenyuxiaojin e Claude: 

linguaggio: Typescript -> JS

(https://github.com/chenyuxiaojin/obsidian-llm-translate.git) versione monolingua cinese

Questo fork è stato creato per sviluppare una versione internazionale (inglese) 
e per implementare nuove funzionalità perchè tra i plugin della comunità di Osidian è tra i migliori
traduttori per testo markdown, ma è completamente inutilizzabile da un utente non cinese.


## Descrizione del progetto

Questo plugin di traduzione per Obsidian, una versione semplificata di obsidian-llm-shortcut, svolge solo due funzioni:

1. Traduce il testo selezionato (Seleziona → Traduzione automatica → Sostituisci)

2. Traduce l'intero testo (mantiene il frontmatter YAML, traduce il testo principale)

Support multiple Provider Switch（DeepSeek/OpenAI/Gemini/豆包/Kimi/Qwen/Z.ai/SiliconFlow/OpenRouter）。

## Reference Repository

- LLM Shortcut Source code: `~/home/pippo/Documenti/GITHUB/obsidian-llm-translate` (Core reference, copy the API calls and streaming output logic)
- cc-switch Source code:`~/project/reference-repository/cc-switch/`（Refer to the Provider's pre-configured and management methods）

## technology stack

- TypeScript + esbuild build
- openai SDK（v6.8.1）call API
- Obsidian Plugin API
- Chinese UI  da eliminare

## Development Plan

See `PLAN.md` for details; it is implemented in 7 phases.

## Common commands

```bash
npm install        # Install dependencies
npm run build      # Build
npm run dev        # Development Pattern (watch)
```

## Deployment of build artifacts

After building, copy `main.js` + `manifest.json` to:
`~/home/pippo/Documenti/Obsidian/tutorial-obsidian/.obsidian/plugins/translate-note`

# Piano di sviluppo — LLM Translate (fork internazionale)

## Contesto

Questo repository è un fork di [chenyuxiaojin/obsidian-llm-translate](https://github.com/chenyuxiaojin/obsidian-llm-translate), un plugin di traduzione per Obsidian nato a sua volta come versione semplificata di `obsidian-llm-shortcut`: conserva solo il nucleo «chiamata API + output in streaming» e aggiunge la gestione multi-provider e la logica di traduzione.

Il plugin fa bene due cose — tradurre la selezione e tradurre l'intera nota preservando il frontmatter YAML — ed è tra i migliori traduttori di Markdown della comunità Obsidian. Ma è **monolingua cinese**: comandi, pagina delle impostazioni, messaggi di errore, prompt predefinito e lingua di destinazione sono tutti in cinese. Per chi non legge il cinese è di fatto inutilizzabile.

Il piano originale (costruzione del plugin da zero in 7 fasi) è stato interamente eseguito: il codice esiste, compila e funziona. Questo documento lo sostituisce e descrive la milestone attuale del fork.

## Obiettivo attuale — unica milestone

**Portare codice e interfaccia al 100% in inglese.**

Nient'altro. Nessuna nuova funzionalità, nessuna riorganizzazione dell'architettura, nessun sistema di traduzione dell'interfaccia. Finché questa milestone non è chiusa e verificata, gli sviluppi successivi restano in attesa.

Riguarda:

- ogni stringa che l'utente vede (comandi, menu contestuale, impostazioni, notifiche, errori, modal);
- ogni commento e JSDoc nel sorgente;
- i valori predefiniti (prompt di sistema, lingua di destinazione, elenco dei provider).

## Fuori ambito, per ora

Elencati qui perché sono passi previsti, ma **dopo** la milestone corrente:

- **Sistema i18n multilingua** (file di traduzione, rilevamento della lingua di Obsidian, UI in italiano/cinese/altro). Oggi le stringhe restano scritte direttamente nel codice, in inglese.
- **Documentazione in italiano** — `PLAN.md` e `CLAUDE.md` sono già in italiano; col tempo anche gli altri `.md` di lavoro. `README.md` e `llms.txt` restano in inglese perché rivolti al pubblico del repository.
- **Identità del plugin per una distribuzione separata** — `manifest.json` (`id`, `author`, `authorUrl`) punta ancora all'upstream. Va cambiato solo se e quando il fork verrà pubblicato come plugin distinto.
- **Nuove funzionalità** — glossario, traduzione a fronte, cache, supporto mobile, ecc.

## Stato attuale del codice

```
src/
├── main.ts                    # Entry point: 3 comandi, menu contestuale, scrittura in streaming, annulla/ripristina
├── settings.ts                # Interfaccia PluginSettings + valori predefiniti + prompt di sistema
├── setting-tab.ts             # Pagina impostazioni: gestione provider + impostazioni di traduzione
├── logger.ts                  # Log
├── globals.d.ts               # Dichiarazioni di tipo
├── styles.css                 # Stili del plugin
├── providers/
│   ├── types.ts               # ProviderConfig, ProviderPreset
│   └── presets.ts             # Elenco dei provider predefiniti
├── llm/
│   ├── llm-client.ts          # Chiamata in streaming con l'SDK OpenAI
│   └── error-handler.ts       # Mappatura degli errori API in messaggi leggibili
├── translation/
│   ├── prompt.ts              # Costruzione del system prompt ({{targetLanguage}})
│   ├── extract-body.ts        # Separazione frontmatter YAML / corpo del testo
│   └── long-text-confirm.ts   # Modal di conferma oltre i 20.000 caratteri
├── ui/
│   ├── loader-strategy.ts     # Indicatore di caricamento desktop/mobile
│   ├── loading-status/        # Stato di caricamento nella status bar (con annulla)
│   ├── spinner/               # Animazione di caricamento
│   └── user-notifications.ts  # Notifiche Notice
└── utils/
    ├── abort-error.ts, constants.ts, next-frame.ts
    └── obsidian-fetch-adapter.ts  # fetch via requestUrl, evita i problemi di CORS
```

### Inventario del cinese residuo

Rilevato con `grep -rnP '\p{Han}' src/`:

| File | Cosa contiene | Righe |
|------|---------------|-------|
| `llm/error-handler.ts` | Titoli, messaggi e suggerimenti di tutti gli errori API | 27 |
| `main.ts` | Nomi dei 3 comandi, voci del menu contestuale, notifiche, messaggi del loader, testo del Suggester | 19 |
| `setting-tab.ts` | Ogni `setName` / `setDesc` / `setButtonText` / `setPlaceholder` | 17 |
| `settings.ts` | `DEFAULT_TRANSLATION_SYSTEM_PROMPT` e `targetLanguage: "中文"` | 8 |
| `providers/presets.ts` | 4 nomi di provider: 豆包, 通义千问, 智谱, 自定义 | 4 |
| `translation/long-text-confirm.ts` | Titolo, corpo e pulsanti della modal di conferma | 4 |
| `ui/loading-status/loading-status.ts` | `CANCEL_HINT = "点击取消"` | 1 |
| `ui/user-notifications.ts` | Etichetta `"💡 建议："` | 1 |
| `utils/constants.ts` | `PLUGIN_NAME = "翻译"` | 1 |
| `translation/extract-body.ts`, `utils/obsidian-fetch-adapter.ts` | Solo commenti JSDoc | 4 |

Punti accertati che semplificano il lavoro:

- Gli `id` dei comandi (`translate-selection`, `translate-document`, `switch-provider`) sono **già in inglese**: cambiare i `name` non rompe né le hotkey configurate né i link `obsidian://`.
- `README.md`, `llms.txt` e `manifest.json` sono **già in inglese**: nessun intervento.
- Nessun carattere cinese nei file CSS.

## Decisioni

| Tema | Decisione | Motivo |
|------|-----------|--------|
| Lingua del codice e dell'UI | Inglese al 100%: stringhe utente, commenti, JSDoc, prompt predefinito | Base comune per qualsiasi utente e per un eventuale i18n futuro |
| Lingua della documentazione | `PLAN.md` e `CLAUDE.md` in italiano; `README.md` e `llms.txt` in inglese | I primi sono documenti di lavoro, i secondi si rivolgono al pubblico del repo |
| `targetLanguage` predefinito | `"English"` (oggi `"中文"`) | Default neutro; resta un campo di testo libero, chi vuole l'italiano scrive «Italian» |
| Preset dei provider | Solo endpoint **globali**, incluse le aziende cinesi che ne offrono uno (DeepSeek, Kimi, Qwen, Z.AI). Esclusi Doubao (solo Cina) e SiliconFlow (dominio `.cn`, piattaforma orientata al mercato cinese) | Un utente fuori dalla Cina non riesce a registrarsi né a pagare sugli endpoint domestici |
| Migrazione delle impostazioni | Nessuna | È un fork nuovo, nessuna installazione esistente da preservare |
| Stile delle stringhe | Convenzioni ufficiali Obsidian: sentence case per comandi e impostazioni, nessun prefisso col nome del plugin, nessun heading «Settings» | Requisito per l'eventuale invio alla directory dei plugin della comunità; `eslint-plugin-obsidianmd` è già configurato |

## Fasi di implementazione

### Fase 1 — Stringhe di base

1. `utils/constants.ts`: `PLUGIN_NAME` → `"LLM Translate"` (compare nei messaggi del loader e nelle notifiche).
2. `ui/loading-status/loading-status.ts`: `CANCEL_HINT` → `"Click to cancel"`.
3. `ui/user-notifications.ts`: etichetta dei suggerimenti → `"💡 Suggestions:"`.

### Fase 2 — Comandi e menu contestuale (`main.ts`)

4. Nomi dei comandi, **`id` invariati**:
   - `translate-selection` → `Translate selection`
   - `translate-document` → `Translate full note (preserve frontmatter)`
   - `switch-provider` → `Switch API provider`
5. Voci del menu contestuale dell'editor allineate ai nomi dei comandi.
6. Notifiche e messaggi del loader in inglese: nessun provider configurato, nessuna selezione, corpo del testo vuoto, traduzione già in corso, provider attivato, errore di traduzione.
7. Suggester di cambio provider: placeholder e riga «modello non impostato» in inglese.

### Fase 3 — Pagina delle impostazioni (`setting-tab.ts`)

8. Sezione provider: nome/descrizione del selettore «Add provider», stato vuoto, pulsanti «Set as active» / «Delete», campi «Display name», «Base URL», «API key», «Model», etichetta «(no base URL)».
9. Sezione traduzione: heading, «Target language» (con descrizione del segnaposto `{{targetLanguage}}`), «Translation prompt», tooltip «Restore default prompt».
10. Tutto in sentence case, secondo le convenzioni Obsidian.

### Fase 4 — Messaggi di errore (`llm/error-handler.ts`)

11. Riscrivere in inglese i 6 casi gestiti (autenticazione, rate limit, modello inesistente, credito esaurito, parametri della richiesta, permessi) più il fallback «errore sconosciuto», mantenendo la struttura titolo / messaggio / suggerimenti e le emoji esistenti.
12. Nei suggerimenti, sostituire i riferimenti all'UI cinese («设置 → 翻译») con i nuovi nomi inglesi delle impostazioni.

### Fase 5 — Default di traduzione (`settings.ts`)

13. `targetLanguage: "English"`.
14. `DEFAULT_TRANSLATION_SYSTEM_PROMPT` riscritto in inglese, mantenendo il segnaposto `{{targetLanguage}}` e le stesse regole:
    - conservare struttura dei paragrafi e formattazione Markdown;
    - alla prima occorrenza di nomi propri e termini tecnici, conservare il termine originale e affiancare la traduzione tra parentesi — regola resa **generica** (oggi è specifica «inglese → cinese»);
    - nessuna spiegazione, riassunto o commento: solo la traduzione;
    - conservare tono e stile dell'originale;
    - lasciare invariati numeri, URL e frammenti di codice.

### Fase 6 — Preset dei provider (`providers/presets.ts`)

15. Sostituire l'elenco con i soli provider ad accesso globale:

| Nome | Base URL | Modello predefinito | Affidabilità del default |
|------|----------|---------------------|--------------------------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | alta (alias stabile) |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.4-mini` | media (nome commerciale «GPT-5.4 Mini», id da confermare) |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.5-flash-lite` | media |
| Kimi (Moonshot) | `https://api.moonshot.ai/v1` | `kimi-k2.6` | media (la serie `moonshot-v1` chiude il 31/08/2026) |
| Qwen | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` | alta (alias stabile) |
| Z.AI (GLM) | `https://api.z.ai/api/paas/v4` | `glm-4.7-flash` | alta (modello gratuito) |
| OpenRouter | `https://openrouter.ai/api/v1` | (vuoto) | — |
| Custom | (vuoto) | (vuoto) | — |

16. Rimossi: 豆包 (Doubao, endpoint `ark.cn-beijing.volces.com`, solo Cina) e SiliconFlow (`api.siliconflow.cn`). Chi li usa può sempre configurarli con «Custom».
17. `自定义` → `Custom`.

> Endpoint e nomi dei modelli vanno riverificati sulla documentazione ufficiale al momento dell'implementazione: Kimi e Z.AI hanno endpoint distinti per Cina e resto del mondo, e i modelli disponibili su quello internazionale possono avere nomi diversi. Possibili aggiunte future — Anthropic e Mistral hanno endpoint compatibili con OpenAI — restano idee, non lavoro pianificato.

### Fase 7 — Commenti, verifica e allineamento della documentazione

18. Tradurre in inglese i JSDoc cinesi rimasti (`translation/extract-body.ts`, `utils/obsidian-fetch-adapter.ts`) e ogni commento intercettato durante le fasi precedenti.
19. `npm run check` (TypeScript), `npm run lint` (ESLint + `eslint-plugin-obsidianmd`), `npm run build`.
20. Controllo finale: `grep -rnP '[\x{3000}-\x{303F}\x{4E00}-\x{9FFF}\x{FF00}-\x{FFEF}]' src/` non deve restituire nulla. Da preferire a `\p{Han}`, che in questo PCRE dà un falso positivo su `·` (U+00B7, middle dot latino usato come separatore nel Suggester).
21. Allineare `CLAUDE.md`: la riga «Chinese UI — da eliminare» e l'elenco dei provider non sono più validi dopo questa milestone.

## Verifica della milestone

Criteri di accettazione, da soddisfare tutti:

1. **Build pulita** — `npm run check`, `npm run lint` e `npm run build` senza errori; prodotti `main.js`, `manifest.json`, `styles.css`.
2. **Zero cinese nel sorgente** — `grep -rnP '[\x{3000}-\x{303F}\x{4E00}-\x{9FFF}\x{FF00}-\x{FFEF}]' src/` non restituisce risultati (ideogrammi, punteggiatura CJK e forme a larghezza intera).
3. **Installazione** — artefatti copiati in `~/Documenti/Obsidian/tutorial-obsidian/.obsidian/plugins/llm-translate`, plugin attivato senza errori in console.
4. **Impostazioni** — la pagina si apre interamente in inglese; si aggiunge un provider da preset, si inseriscono API key e modello, il valore si salva e resta dopo il riavvio.
5. **Traduzione della selezione** — selezione di un paragrafo → comando dalla palette e dal menu contestuale → output in streaming che sostituisce il testo, con la lingua di destinazione predefinita «English».
6. **Traduzione dell'intera nota** — su una nota con frontmatter: il frontmatter resta intatto, il corpo viene tradotto; oltre i 20.000 caratteri compare la modal di conferma in inglese.
7. **Annullamento** — clic sull'indicatore di caricamento durante lo streaming → testo originale ripristinato integralmente.
8. **Cambio provider** — con due provider configurati, il comando di switch mostra l'elenco in inglese e la traduzione successiva usa il provider selezionato.
9. **Errori leggibili** — con una API key volutamente errata, la notifica d'errore appare in inglese, con titolo e suggerimenti coerenti con i nomi delle impostazioni.
10. **Nessuna regressione sulle hotkey** — una hotkey assegnata prima delle modifiche continua a funzionare (gli `id` dei comandi non cambiano).

# Piano di sviluppo — LLM Translate (fork internazionale)

## Contesto

Questo repository è un fork di [chenyuxiaojin/obsidian-llm-translate](https://github.com/chenyuxiaojin/obsidian-llm-translate), un plugin di traduzione per Obsidian nato a sua volta come versione semplificata di `obsidian-llm-shortcut`: conserva solo il nucleo «chiamata API + output in streaming» e aggiunge la gestione multi-provider e la logica di traduzione.

Il plugin fa bene due cose — tradurre la selezione e tradurre l'intera nota preservando il front-matter YAML — ed è tra i migliori traduttori di Markdown della comunità Obsidian. Ma nasce **monolingua cinese**, e per chi non legge il cinese era di fatto inutilizzabile: da qui il fork.

## Milestone 1 — «tutto in inglese» ✅ completata il 19/08/2026

Codice e interfaccia sono al 100% in inglese: stringhe utente, commenti, JSDoc e valori predefiniti. Commit `cb230e5` (migrazione), `b75aa2f` (correzioni dai test manuali).

Cosa comprende, in sintesi:

- comandi, menu contestuale dell'editor, notifiche, messaggi dell'indicatore di caricamento, selettore dei provider;
- pagina delle impostazioni, in sentence case secondo le convenzioni Obsidian;
- messaggi di errore delle API e relativi suggerimenti;
- prompt di sistema predefinito, con la regola «termine originale + traduzione tra parentesi» resa indipendente dalla lingua;
- `targetLanguage` predefinito su `English`;
- preset dei provider ridotti ai soli endpoint globali.

Gli `id` dei comandi non sono cambiati, quindi le hotkey già assegnate continuano a funzionare. Nessuna migrazione delle impostazioni salvate: le configurazioni esistenti in `data.json` restano come sono, e per vedere i nuovi valori predefiniti si usa il pulsante «Restore default prompt».

### Decisioni consolidate

Restano valide per tutto il lavoro successivo:

| Tema | Decisione | Motivo |
|------|-----------|--------|
| Lingua del codice e dell'UI | Inglese al 100% | Base comune per qualsiasi utente e per un eventuale i18n futuro |
| Lingua della documentazione | `PLAN.md` e `CLAUDE.md` in italiano; `README.md` e `llms.txt` in inglese | I primi sono documenti di lavoro, i secondi si rivolgono al pubblico del repo |
| `targetLanguage` predefinito | `English` | Default neutro; è un campo di testo libero |
| Preset dei provider | Solo endpoint globali, incluse le aziende cinesi che ne offrono uno | Un utente fuori dalla Cina non riesce a registrarsi sugli endpoint domestici |
| Stile delle stringhe | Convenzioni ufficiali Obsidian: sentence case, nessun prefisso col nome del plugin | Requisito per l'eventuale invio alla directory dei plugin della comunità |
| Verifica «zero cinese» | `grep -rnP '[\x{3000}-\x{303F}\x{4E00}-\x{9FFF}\x{FF00}-\x{FFEF}]' src/` | Da preferire a `\p{Han}`, che in questo PCRE dà un falso positivo su `·` (U+00B7) |

### Preset dei provider

| Nome | Base URL | Modello predefinito | Affidabilità del default |
|------|----------|---------------------|--------------------------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | alta (alias stabile) |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.4-mini` | media (id da confermare) |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.5-flash-lite` | media |
| Kimi (Moonshot) | `https://api.moonshot.ai/v1` | `kimi-k2.6` | media (la serie `moonshot-v1` chiude il 31/08/2026) |
| Qwen | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` | alta (alias stabile) |
| Z.AI (GLM) | `https://api.z.ai/api/paas/v4` | `glm-4.7-flash` | alta (modello gratuito) |
| OpenRouter | `https://openrouter.ai/api/v1` | (vuoto) | — |
| Custom | (vuoto) | (vuoto) | — |

Verificati sul campo: OpenRouter con `google/gemma-4-31b-it` e Z.AI con `glm-4.7-flash` funzionano.
Doubao e SiliconFlow sono stati rimossi perché legati al mercato cinese; si aggiungono con «Custom».
Possibili aggiunte future: Anthropic e Mistral, entrambi con endpoint compatibili OpenAI.

## Stato attuale del codice

```
src/
├── main.ts                    # Entry point: 3 comandi, menu contestuale, invio della traduzione al pannello
├── settings.ts                # Interfaccia PluginSettings + valori predefiniti + prompt di sistema
├── setting-tab.ts             # Pagina impostazioni: gestione provider + impostazioni di traduzione
├── logger.ts                  # Log
├── globals.d.ts               # Dichiarazioni di tipo
├── styles.css                 # Stili del plugin
├── providers/
│   ├── types.ts               # ProviderConfig, ProviderPreset
│   └── presets.ts             # Elenco dei provider predefiniti
├── llm/
│   ├── llm-client.ts          # Chiamata con l'SDK OpenAI
│   └── error-handler.ts       # Mappatura degli errori API in messaggi leggibili
├── translation/
│   ├── prompt.ts              # Costruzione del system prompt ({{targetLanguage}})
│   ├── extract-body.ts        # Separazione front-matter YAML / corpo del testo
│   └── long-text-confirm.ts   # Modal di conferma oltre i 20.000 caratteri
├── ui/
│   ├── loader-strategy.ts     # Indicatore di caricamento desktop (status bar) / mobile (Notice)
│   ├── loading-status/        # Stato di caricamento con annullamento al clic
│   ├── spinner/               # Animazione di caricamento
│   └── user-notifications.ts  # Notifiche Notice
└── utils/
    ├── abort-error.ts, constants.ts, next-frame.ts
    └── obsidian-fetch-adapter.ts  # fetch via requestUrl, evita i problemi di CORS
```

## Problemi aperti

### 1. Lo streaming non è vero streaming (causa architetturale)

`obsidian-fetch-adapter.ts` implementa `fetch` con `requestUrl` di Obsidian, che **bufferizza l'intera risposta** e la restituisce come `response.text`. L'SDK OpenAI riceve quindi il corpo già completo e ne estrae gli eventi SSE tutti insieme: il testo non compare progressivamente, ma in un blocco solo alla fine.

Conseguenze pratiche:

- l'attesa è muta: durante la richiesta si vede solo lo spinner, poi il testo appare tutto insieme;
- **non esiste una finestra utile per annullare** durante la scrittura: quando il testo inizia a comparire, la richiesta è già conclusa;
- `next-frame.ts` e la scrittura a chunk restano nel codice ma non producono l'effetto per cui erano pensati.

Risolverlo richiede una `fetch` che streami davvero. `requestUrl` non lo permette; le alternative sono la `fetch` nativa (soggetta a CORS nel renderer di Obsidian) o l'API `net` di Electron. Da valutare, non banale.

### 2. Annullamento: ridimensionato

> Aggiornamento 19/08/2026: il comando «Cancel running translation» è stato **rimosso**.
> Con la traduzione della nota intera che finisce nel pannello di revisione, non c'è più
> niente da recuperare: la nota non viene toccata. E nella pratica il comando era
> inutilizzabile — la traduzione finisce prima che si riesca a cercarlo nella palette.
> Resta il clic sullo spinner nella barra di stato, che serve a fermare una richiesta
> appesa. Dal 19/08/2026 nemmeno la selezione tocca più la nota, quindi non esiste
> più alcun percorso in cui serva ripristinare il testo originale.



L'annullamento può emergere come `AbortError` interno, come `APIUserAbortError` dell'SDK, oppure avvolto in un `APIConnectionError` quando è l'adapter a rifiutare a metà volo. `main.ts` riconosceva solo il primo caso, quindi negli altri mostrava una notifica di errore **senza ripristinare il testo originale**. Ora la condizione guarda `abortController.signal.aborted`, che è l'unico testimone affidabile.

Aggiunto anche il comando **«Cancel running translation»**, visibile nella palette solo mentre una traduzione è in corso: l'unico modo di annullare era cliccare lo spinner nella barra di stato, poco visibile e — per via del problema 1 — quasi mai cliccabile in tempo.

Resta vero che, finché lo streaming non è reale, l'annullamento serve solo durante l'attesa della risposta, quando nulla è ancora stato scritto.

### 3. Rivedere la traduzione prima di accettarla ✅ risolto il 19/08/2026

Scelto l'approccio «traduzione a fronte»: `TranslationView` ([src/ui/translation-view.ts](src/ui/translation-view.ts)) è una `ItemView` registrata nel pannello destro. «Translate full note» non tocca più la nota — scrive nel pannello, dove il testo si legge accanto all'originale, si può **modificare a mano** e poi si conferma con «Insert» o si scarta con «Discard».

Dettagli che contano:

- l'inserimento conserva il front-matter e riscrive il file con `vault.process`;
- se la nota è cambiata mentre la si rivedeva, l'inserimento **si rifiuta** invece di sovrascrivere le modifiche più recenti;
- vale per **entrambi** i comandi: la nota intera sostituisce il corpo del testo lasciando fuori il front-matter, la selezione sostituisce solo l'intervallo selezionato. All'inizio la selezione era rimasta inline, ma la prova sul campo ha detto il contrario — la revisione serve anche lì.

Il pannello è anche il posto giusto per un eventuale streaming vero (problema 1): il testo può scorrere lì senza toccare il documento.

## Fuori ambito, per ora

- **Sistema i18n multilingua** (file di traduzione, rilevamento della lingua di Obsidian, UI in italiano). Oggi le stringhe stanno nel codice, in inglese.
- **Documentazione in italiano** per gli altri `.md` di lavoro.
- **Identità del plugin per una distribuzione separata** — `manifest.json` (`id`, `author`, `authorUrl`) punta ancora all'upstream. Da cambiare se e quando il fork verrà pubblicato come plugin distinto.
- **Nuove funzionalità** — glossario, cache, supporto mobile.

## Verifica

Comandi:

```bash
npm run check   # tsc
npm run lint    # eslint + eslint-plugin-obsidianmd
npm run build   # esbuild → main.js + styles.css
```

Stato: `tsc` pulito; `eslint` 0 errori e 2 warning preesistenti (`prefer-setting-definitions`, architetturale; e un falso positivo di `sentence-case` sul placeholder `https://api.example.com/v1`).

Distribuzione per i test manuali:

```bash
cp main.js manifest.json styles.css ~/Documenti/Obsidian/tutorial-obsidian/.obsidian/plugins/llm-translate/
```

Prove manuali superate il 19/08/2026: menu contestuale, pagina impostazioni con più provider, traduzione con due provider funzionanti, errore leggibile senza API key, modal di conferma oltre i 20.000 caratteri.
Da riprovare dopo la correzione del problema 2: annullamento durante l'attesa → ripristino del testo originale.

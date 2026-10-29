import {
  App,
  Editor,
  FuzzySuggestModal,
  Plugin,
  PluginManifest,
  TFile,
} from "obsidian";
import type { Menu } from "obsidian";
import "./styles.css";
import { LLMClient } from "./llm/llm-client";
import { mapLlmErrorToReadable } from "./llm/error-handler";
import { logger } from "./logger";
import {
  DEFAULT_SETTINGS,
  PluginSettings,
  getActiveProvider,
  loadPluginSettings,
} from "./settings";
import { SettingTab } from "./setting-tab";
import type { ProviderConfig } from "./providers/types";
import { buildSystemPrompt } from "./translation/prompt";
import { extractBody } from "./translation/extract-body";
import { confirmLongText } from "./translation/long-text-confirm";
import {
  LoaderStrategy,
  LoaderStrategyFactory,
} from "./ui/loader-strategy";
import {
  showErrorNotification,
  showInfoNotification,
} from "./ui/user-notifications";
import {
  TRANSLATION_VIEW_TYPE,
  TranslationView,
} from "./ui/translation-view";
import type { TranslationSource } from "./ui/translation-view";
import { AbortError } from "./utils/abort-error";
import { LONG_TEXT_THRESHOLD, PLUGIN_NAME } from "./utils/constants";
import { nextFrame } from "./utils/next-frame";
import { chooseTranslationOptions } from "./ui/translation-options";
import { SafeFileWriter } from "./files/safe-file-writer";
import { protectMarkdown, PROTECTION_INSTRUCTION, TranslationSafetyError } from "./translation/protected-markdown";

export default class TranslatePlugin extends Plugin {
  public override settings: PluginSettings = DEFAULT_SETTINGS;
  private llmClient: LLMClient | undefined;
  private readonly loaderStrategy: LoaderStrategy;
  private abortController: AbortController | undefined;
  private translating = false;
  private unloaded = false;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.loaderStrategy = LoaderStrategyFactory.createStrategy(this);
  }

  override async onload(): Promise<void> {
    logger.debug("Loading translate plugin");
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.registerView(
      TRANSLATION_VIEW_TYPE,
      (leaf) => new TranslationView(leaf),
    );
    this.registerCommands();
    this.registerEditorMenu();
    this.registerFileMenu();
    this.rebuildLlmClient();
  }

  private registerEditorMenu(): void {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, info) => {
        const hasSelection = editor.getSelection().trim().length > 0;
        if (hasSelection) {
          menu.addItem((item) =>
            item
              .setTitle("Translate selection")
              .setIcon("languages")
              .setSection("selection")
              .onClick(() => {
                void this.translateSelection(editor, info?.file);
              }),
          );
        }
        menu.addItem((item) =>
          item
            .setTitle("Translate full note (preserve front-matter)")
            .setIcon("book-open-text")
            .setSection("selection")
            .onClick(() => {
              void this.translateDocument(editor, info?.file);
            }),
        );
        menu.addItem((item) =>
          item
            .setTitle("Switch API provider")
            .setIcon("arrow-left-right")
            .setSection("selection")
            .onClick(() => {
              this.openProviderSwitcher();
            }),
        );
      }),
    );
  }

  private registerFileMenu(): void {
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFile) || file.extension.toLowerCase() !== "md") return;
      menu.addItem((item) => item.setTitle("Translate…").setIcon("languages").onClick(() => {
        void this.executeTranslation(async () => {
          const filePath = file.path;
          const originalContent = await this.app.vault.read(file);
          const { bodyStartOffset } = extractBody(originalContent);
          return {
            file, filePath, originalContent,
            replaceStart: bodyStartOffset, replaceEnd: originalContent.length, kind: "note",
          };
        }, true);
      }));
    }));
  }

  override onunload(): void {
    this.unloaded = true;
    this.abortController?.abort();
    this.loaderStrategy.stop();
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<PluginSettings> | null;
    this.settings = loadPluginSettings(data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.rebuildLlmClient();
  }

  rebuildLlmClient(): void {
    const provider = getActiveProvider(this.settings);
    if (!provider || !provider.baseUrl || !provider.apiKey || !provider.model) {
      this.llmClient = undefined;
      return;
    }
    this.llmClient = new LLMClient({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model,
    });
  }

  private registerCommands(): void {
    this.addCommand({
      id: "translate-selection",
      name: "Translate selection",
      editorCallback: (editor, info) => {
        void this.translateSelection(editor, info?.file);
      },
    });
    this.addCommand({
      id: "translate-document",
      name: "Translate full note (preserve front-matter)",
      editorCallback: (editor, info) => {
        void this.translateDocument(editor, info?.file);
      },
    });
    this.addCommand({
      id: "switch-provider",
      name: "Switch API provider",
      callback: () => {
        this.openProviderSwitcher();
      },
    });
  }

  /** Opens the review panel, reusing the existing one when there is one. */
  private async activateTranslationView(): Promise<TranslationView | undefined> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(TRANSLATION_VIEW_TYPE)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return undefined;
      await rightLeaf.setViewState({
        type: TRANSLATION_VIEW_TYPE,
        active: true,
      });
      leaf = rightLeaf;
    }
    await workspace.revealLeaf(leaf);
    return leaf.view instanceof TranslationView ? leaf.view : undefined;
  }

  private openProviderSwitcher(): void {
    if (this.settings.providers.length === 0) {
      showErrorNotification({
        title: "No API provider configured yet",
        suggestions: ["Add one in Settings → TranslateNote"],
      });
      return;
    }
    new ProviderSwitcherModal(this.app, this.settings.providers, async (picked) => {
      this.settings.activeProviderId = picked.id;
      await this.saveSettings();
      showInfoNotification(`switched to ${picked.name}`);
    }).open();
  }

  private async translateSelection(
    editor: Editor, file: TFile | null = this.app.workspace.getActiveFile(),
  ): Promise<void> {
    if (!file) return;
    if (!editor.getSelection().trim()) {
      showErrorNotification({ title: "Select the text you want to translate first" });
      return;
    }
    const source: TranslationSource = {
      file, filePath: file.path, originalContent: editor.getValue(),
      replaceStart: editor.posToOffset(editor.getCursor("from")),
      replaceEnd: editor.posToOffset(editor.getCursor("to")), kind: "selection",
    };
    await this.executeTranslation(() => Promise.resolve(source), false);
  }

  private async translateDocument(
    editor: Editor, file: TFile | null = this.app.workspace.getActiveFile(),
  ): Promise<void> {
    if (!file) return;
    const originalContent = editor.getValue();
    const { bodyStartOffset } = extractBody(originalContent);
    const source: TranslationSource = {
      file, filePath: file.path, originalContent, replaceStart: bodyStartOffset,
      replaceEnd: originalContent.length, kind: "note",
    };
    await this.executeTranslation(() => Promise.resolve(source), false);
  }

  private async executeTranslation(
    getSource: () => Promise<TranslationSource>, forFile: boolean,
  ): Promise<void> {
    // Acquire before the first await: dialogs and panel setup are part of the job.
    if (this.translating || this.unloaded) {
      showErrorNotification({ title: "A translation is already running" });
      return;
    }
    if (!this.ensureClient()) return;
    this.translating = true;
    const client = this.llmClient!;
    const writer = new SafeFileWriter(
      this.app, this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`,
      () => !this.unloaded && !this.abortController?.signal.aborted,
    );
    let view: TranslationView | undefined;
    try {
      const source = await getSource();
      await writer.assertUnchanged(source);
      const prepared = protectMarkdown(source.originalContent, source.replaceStart, source.replaceEnd);
      // Never replace an unaccepted translation with a new request.
      view = await this.activateTranslationView();
      if (!view) throw new TranslationSafetyError("Could not open the translation panel.");
      if (view.hasPendingTranslation) {
        throw new TranslationSafetyError("Insert, save or discard the current translation before starting another one.");
      }
      const options = await chooseTranslationOptions(this.app, this.settings, forFile);
      if (!options || this.unloaded) return;
      const length = source.replaceEnd - source.replaceStart;
      if (length > LONG_TEXT_THRESHOLD && !(await confirmLongText(this.app, length))) return;
      await writer.assertUnchanged(source);
      this.settings.lastTargetLanguage = options.language;
      await this.saveSettings();
      if (this.unloaded) return;
      view.beginTranslation(source, (mode, translation) => mode === "new-file"
        ? writer.createNew(source, translation, options.language)
        : writer.overwrite(source, translation));
      const review = view;
      await this.runStream({
        client, targetLanguage: options.language, userContent: prepared.input,
        loaderMessage: `${PLUGIN_NAME}: translating to ${options.language}...`,
        // Protected spans are restored and verified before displaying editable text.
        writeChunk: () => {},
        finalize: async (text) => {
          review.setText(prepared.restore(text));
          review.completeTranslation();
          if (options.mode !== "review") {
            await review.save(options.mode === "new-file" ? "new-file" : "overwrite");
          }
        },
        onAbort: () => review.cancelTranslation(),
        onError: () => review.failTranslation(),
      });
    } catch (error) {
      showErrorNotification({
        title: "Could not start translation",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      this.translating = false;
    }
  }

  private async runStream({
    client,
    targetLanguage,
    userContent,
    loaderMessage,
    writeChunk,
    finalize,
    onAbort,
    onError,
  }: {
    client: LLMClient;
    targetLanguage: string;
    userContent: string;
    loaderMessage: string;
    writeChunk: (text: string) => void;
    finalize: (text: string) => void | Promise<void>;
    onAbort: () => void;
    onError?: () => void;
  }): Promise<void> {
    if (this.abortController) {
      showErrorNotification({
        title: "A translation is already running",
        suggestions: ["Wait for it to finish, or click the loading indicator to cancel it"],
      });
      return;
    }

    const abortController = new AbortController();
    this.abortController = abortController;
    this.loaderStrategy.start(loaderMessage, () => abortController.abort());

    const systemPrompt = buildSystemPrompt(
      this.settings.translationSystemPrompt,
      targetLanguage,
    ) + `\n\nTarget language for this translation: ${targetLanguage}.` + PROTECTION_INSTRUCTION;

    try {
      const stream = client.getResponse({
        systemPrompt,
        userContent,
        signal: abortController.signal,
      });

      let text = "";
      for await (const chunk of stream) {
        text += chunk;
        writeChunk(text);
        await nextFrame();
      }
      if (abortController.signal.aborted) throw new AbortError();
      await finalize(text);
    } catch (error) {
      // The abort can surface as our own AbortError, as the SDK's
      // APIUserAbortError, or wrapped in an APIConnectionError when the fetch
      // adapter rejects mid-flight. The signal is the only reliable witness.
      if (abortController.signal.aborted || error instanceof AbortError) {
        onAbort();
      } else {
        onError?.();
        showErrorNotification(error instanceof TranslationSafetyError
          ? { title: "Translation was not saved", message: error.message }
          : mapLlmErrorToReadable(error));
        logger.error("Translation failed", error);
      }
    } finally {
      this.abortController = undefined;
      this.loaderStrategy.stop();
    }
  }

  private ensureClient(): boolean {
    if (!this.llmClient) {
      showErrorNotification({
        title: "No usable API provider configured yet",
        suggestions: [
          "In Settings → TranslateNote, add a provider and fill in its API key and model name",
        ],
      });
      return false;
    }
    return true;
  }

}

class ProviderSwitcherModal extends FuzzySuggestModal<ProviderConfig> {
  constructor(
    app: App,
    private readonly providers: ProviderConfig[],
    private readonly onPick: (provider: ProviderConfig) => void | Promise<void>,
  ) {
    super(app);
    this.setPlaceholder("Pick the provider to activate");
  }

  override getItems(): ProviderConfig[] {
    return this.providers;
  }

  override getItemText(item: ProviderConfig): string {
    return `${item.name}  ·  ${item.model || "no model set"}`;
  }

  override onChooseItem(item: ProviderConfig): void {
    void this.onPick(item);
  }
}

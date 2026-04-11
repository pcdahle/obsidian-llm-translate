import {
  App,
  Editor,
  EditorPosition,
  FuzzySuggestModal,
  Plugin,
  PluginManifest,
} from "obsidian";
import type { Menu } from "obsidian";
import { LLMClient } from "./llm/llm-client";
import { mapLlmErrorToReadable } from "./llm/error-handler";
import { logger } from "./logger";
import {
  DEFAULT_SETTINGS,
  PluginSettings,
  getActiveProvider,
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
import { AbortError } from "./utils/abort-error";
import { LONG_TEXT_THRESHOLD, PLUGIN_NAME } from "./utils/constants";
import { nextFrame } from "./utils/next-frame";

export default class TranslatePlugin extends Plugin {
  public settings: PluginSettings = DEFAULT_SETTINGS;
  private llmClient: LLMClient | undefined;
  private readonly loaderStrategy: LoaderStrategy;
  private abortController: AbortController | undefined;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.loaderStrategy = LoaderStrategyFactory.createStrategy(this);
  }

  override async onload(): Promise<void> {
    logger.debug("Loading translate plugin");
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.registerCommands();
    this.registerEditorMenu();
    this.rebuildLlmClient();
  }

  private registerEditorMenu(): void {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
        const hasSelection = editor.getSelection().trim().length > 0;
        if (hasSelection) {
          menu.addItem((item) =>
            item
              .setTitle("翻译选中文本")
              .setIcon("languages")
              .setSection("selection")
              .onClick(() => {
                void this.translateSelection(editor);
              }),
          );
        }
        menu.addItem((item) =>
          item
            .setTitle("翻译全文（保留 Frontmatter）")
            .setIcon("book-open-text")
            .setSection("selection")
            .onClick(() => {
              void this.translateDocument(editor);
            }),
        );
      }),
    );
  }

  override onunload(): void {
    this.abortController?.abort();
    this.loaderStrategy.stop();
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...data };
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
      name: "翻译选中文本",
      editorCallback: (editor) => {
        void this.translateSelection(editor);
      },
    });
    this.addCommand({
      id: "translate-document",
      name: "翻译全文（保留 Frontmatter）",
      editorCallback: (editor) => {
        void this.translateDocument(editor);
      },
    });
    this.addCommand({
      id: "switch-provider",
      name: "切换 API 服务商",
      callback: () => {
        this.openProviderSwitcher();
      },
    });
  }

  private openProviderSwitcher(): void {
    if (this.settings.providers.length === 0) {
      showErrorNotification({
        title: "还没有配置任何服务商",
        suggestions: ["去「设置 → 翻译」里添加一个服务商"],
      });
      return;
    }
    new ProviderSwitcherModal(this.app, this.settings.providers, async (picked) => {
      this.settings.activeProviderId = picked.id;
      await this.saveSettings();
      showInfoNotification(`已切换到 ${picked.name}`);
    }).open();
  }

  private async translateSelection(editor: Editor): Promise<void> {
    if (!this.ensureClient()) return;
    const selection = editor.getSelection();
    if (!selection.trim()) {
      showErrorNotification({ title: "请先选中要翻译的文本" });
      return;
    }

    const fromCursor = editor.getCursor("from");
    const originalFullText = editor.getValue();

    await this.runStream({
      userContent: selection,
      originalFullText,
      loaderMessage: `${PLUGIN_NAME}：翻译选中...`,
      writeChunk: (text) => {
        this.writeAt(editor, fromCursor, text);
      },
      finalize: (text) => {
        this.writeAt(editor, fromCursor, text);
        editor.setSelection(
          fromCursor,
          incChar(fromCursor, text.length),
        );
      },
    });
  }

  private async translateDocument(editor: Editor): Promise<void> {
    if (!this.ensureClient()) return;
    const fullText = editor.getValue();
    const { frontmatter, body, bodyStartOffset } = extractBody(fullText);

    if (!body.trim()) {
      showErrorNotification({ title: "正文为空，没有可翻译的内容" });
      return;
    }

    if (body.length > LONG_TEXT_THRESHOLD) {
      const ok = await confirmLongText(this.app, body.length);
      if (!ok) return;
    }

    const bodyStartPos = offsetToPos(fullText, bodyStartOffset);

    await this.runStream({
      userContent: body,
      originalFullText: fullText,
      loaderMessage: `${PLUGIN_NAME}：翻译全文...`,
      writeChunk: (text) => {
        editor.setValue(frontmatter + text);
      },
      finalize: (text) => {
        editor.setValue(frontmatter + text);
        editor.setSelection(
          bodyStartPos,
          offsetToPos(frontmatter + text, (frontmatter + text).length),
        );
      },
    });
  }

  private async runStream({
    userContent,
    originalFullText,
    loaderMessage,
    writeChunk,
    finalize,
  }: {
    userContent: string;
    originalFullText: string;
    loaderMessage: string;
    writeChunk: (text: string) => void;
    finalize: (text: string) => void;
  }): Promise<void> {
    if (this.abortController) {
      showErrorNotification({
        title: "已有翻译正在进行",
        suggestions: ["等它跑完或点击加载指示器取消"],
      });
      return;
    }

    const abortController = new AbortController();
    this.abortController = abortController;
    this.loaderStrategy.start(loaderMessage, () => abortController.abort());

    const systemPrompt = buildSystemPrompt(
      this.settings.translationSystemPrompt,
      this.settings.targetLanguage,
    );

    try {
      const stream = this.llmClient!.getResponse({
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
      finalize(text);
    } catch (error) {
      if (error instanceof AbortError) {
        // 用户取消：整段恢复原文
        this.app.workspace.activeEditor?.editor?.setValue(originalFullText);
      } else {
        showErrorNotification(mapLlmErrorToReadable(error));
        logger.error("翻译失败", error);
      }
    } finally {
      this.abortController = undefined;
      this.loaderStrategy.stop();
    }
  }

  private ensureClient(): boolean {
    if (!this.llmClient) {
      showErrorNotification({
        title: "还没有配置可用的服务商",
        suggestions: [
          "去「设置 → 翻译」里添加服务商并填写 API Key 和模型名",
        ],
      });
      return false;
    }
    return true;
  }

  private writeAt(
    editor: Editor,
    from: EditorPosition,
    text: string,
  ): void {
    editor.replaceRange(
      text,
      from,
      editor.getCursor("to"),
    );
    editor.setSelection(from, incChar(from, text.length));
  }
}

class ProviderSwitcherModal extends FuzzySuggestModal<ProviderConfig> {
  constructor(
    app: App,
    private readonly providers: ProviderConfig[],
    private readonly onPick: (provider: ProviderConfig) => void,
  ) {
    super(app);
    this.setPlaceholder("选择要激活的服务商");
  }

  override getItems(): ProviderConfig[] {
    return this.providers;
  }

  override getItemText(item: ProviderConfig): string {
    return `${item.name}  ·  ${item.model || "未填模型"}`;
  }

  override onChooseItem(item: ProviderConfig): void {
    this.onPick(item);
  }
}

function incChar(cursor: EditorPosition, char: number): EditorPosition {
  return { ...cursor, ch: cursor.ch + char };
}

function offsetToPos(text: string, offset: number): EditorPosition {
  let line = 0;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }
  return { line, ch: offset - lastNewline - 1 };
}

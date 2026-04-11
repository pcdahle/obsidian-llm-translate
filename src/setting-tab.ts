import { App, PluginSettingTab, Setting } from "obsidian";
import type TranslatePlugin from "./main";
import { PROVIDER_PRESETS } from "./providers/presets";
import type { ProviderConfig } from "./providers/types";
import { DEFAULT_TRANSLATION_SYSTEM_PROMPT } from "./settings";

export class SettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: TranslatePlugin,
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "API 服务商" });

    new Setting(containerEl)
      .setName("添加服务商")
      .setDesc("选择一个预置服务商，或选择「自定义」手动填写。")
      .addDropdown((dropdown) => {
        dropdown.addOption("", "— 选择一个 —");
        for (const preset of PROVIDER_PRESETS) {
          dropdown.addOption(preset.name, preset.name);
        }
        dropdown.onChange(async (value) => {
          if (!value) return;
          const preset = PROVIDER_PRESETS.find((p) => p.name === value);
          if (!preset) return;
          const newProvider: ProviderConfig = {
            id: generateId(),
            name: preset.name,
            baseUrl: preset.baseUrl,
            apiKey: "",
            model: preset.defaultModel,
          };
          this.plugin.settings.providers.push(newProvider);
          if (!this.plugin.settings.activeProviderId) {
            this.plugin.settings.activeProviderId = newProvider.id;
          }
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (this.plugin.settings.providers.length === 0) {
      containerEl.createEl("p", {
        text: "还没有添加任何服务商。从上方下拉菜单选一个开始。",
        cls: "setting-item-description",
      });
    }

    for (const provider of this.plugin.settings.providers) {
      this.renderProvider(containerEl, provider);
    }

    containerEl.createEl("h2", { text: "翻译设置" });

    new Setting(containerEl)
      .setName("目标语言")
      .setDesc("翻译成哪种语言。这个值会替换提示词里的 {{targetLanguage}}。")
      .addText((text) =>
        text
          .setPlaceholder("中文")
          .setValue(this.plugin.settings.targetLanguage)
          .onChange(async (value) => {
            this.plugin.settings.targetLanguage = value || "中文";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("翻译提示词")
      .setDesc("发送给 AI 的 system 提示词。支持 {{targetLanguage}} 占位符。")
      .addTextArea((ta) => {
        ta.setValue(this.plugin.settings.translationSystemPrompt)
          .setPlaceholder(DEFAULT_TRANSLATION_SYSTEM_PROMPT)
          .onChange(async (value) => {
            this.plugin.settings.translationSystemPrompt = value;
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 10;
        ta.inputEl.style.width = "100%";
        ta.inputEl.style.fontFamily = "var(--font-monospace)";
      })
      .addExtraButton((btn) =>
        btn
          .setIcon("rotate-ccw")
          .setTooltip("恢复默认提示词")
          .onClick(async () => {
            this.plugin.settings.translationSystemPrompt =
              DEFAULT_TRANSLATION_SYSTEM_PROMPT;
            await this.plugin.saveSettings();
            this.display();
          }),
      );
  }

  private renderProvider(
    containerEl: HTMLElement,
    provider: ProviderConfig,
  ): void {
    const isActive = provider.id === this.plugin.settings.activeProviderId;

    const header = new Setting(containerEl)
      .setName(`${isActive ? "✅ " : ""}${provider.name}`)
      .setDesc(provider.baseUrl || "（未填 Base URL）");

    if (!isActive) {
      header.addButton((btn) =>
        btn
          .setButtonText("设为当前")
          .onClick(async () => {
            this.plugin.settings.activeProviderId = provider.id;
            await this.plugin.saveSettings();
            this.display();
          }),
      );
    }

    header.addButton((btn) =>
      btn
        .setButtonText("删除")
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.providers =
            this.plugin.settings.providers.filter((p) => p.id !== provider.id);
          if (this.plugin.settings.activeProviderId === provider.id) {
            this.plugin.settings.activeProviderId =
              this.plugin.settings.providers[0]?.id ?? "";
          }
          await this.plugin.saveSettings();
          this.display();
        }),
    );

    new Setting(containerEl)
      .setName("显示名")
      .addText((text) =>
        text.setValue(provider.name).onChange(async (value) => {
          provider.name = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Base URL")
      .addText((text) =>
        text
          .setPlaceholder("https://api.example.com/v1")
          .setValue(provider.baseUrl)
          .onChange(async (value) => {
            provider.baseUrl = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("API Key")
      .addText((text) => {
        text
          .setPlaceholder("sk-...")
          .setValue(provider.apiKey)
          .onChange(async (value) => {
            provider.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("模型名")
      .addText((text) =>
        text
          .setPlaceholder("deepseek-chat")
          .setValue(provider.model)
          .onChange(async (value) => {
            provider.model = value;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("hr");
  }
}

function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

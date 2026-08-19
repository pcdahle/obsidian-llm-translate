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

    new Setting(containerEl)
      .setName("Add provider")
      .setDesc("Pick a preset provider, or pick the custom entry to fill it in yourself.")
      .addDropdown((dropdown) => {
        dropdown.addOption("", "Select a provider…");
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
        text: "No providers yet. Pick one from the dropdown above to get started.",
        cls: "setting-item-description",
      });
    }

    for (const provider of this.plugin.settings.providers) {
      this.renderProvider(containerEl, provider);
    }

    new Setting(containerEl).setName("Translation").setHeading();

    new Setting(containerEl)
      .setName("Target language")
      .setDesc("The language to translate into. This value replaces {{targetLanguage}} in the prompt.")
      .addText((text) =>
        text
          .setPlaceholder("English")
          .setValue(this.plugin.settings.targetLanguage)
          .onChange(async (value) => {
            this.plugin.settings.targetLanguage = value || "English";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Translation prompt")
      .setDesc("System prompt sent to the model. Supports the {{targetLanguage}} placeholder.")
      .addTextArea((ta) => {
        ta.setValue(this.plugin.settings.translationSystemPrompt)
          .setPlaceholder(DEFAULT_TRANSLATION_SYSTEM_PROMPT)
          .onChange(async (value) => {
            this.plugin.settings.translationSystemPrompt = value;
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 10;
        ta.inputEl.classList.add("llm-translate-prompt-textarea");
      })
      .addExtraButton((btn) =>
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Restore default prompt")
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
      .setDesc(provider.baseUrl || "(no base URL set)");

    if (!isActive) {
      header.addButton((btn) =>
        btn
          .setButtonText("Set as active")
          .onClick(async () => {
            this.plugin.settings.activeProviderId = provider.id;
            await this.plugin.saveSettings();
            this.display();
          }),
      );
    }

    header.addButton((btn) =>
      btn
        .setButtonText("Delete")
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
      .setName("Display name")
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
      .setName("API key")
      .addText((text) => {
        text
          .setValue(provider.apiKey)
          .onChange(async (value) => {
            provider.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("Model name")
      .addText((text) =>
        text
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

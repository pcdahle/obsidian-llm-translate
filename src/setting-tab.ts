import { App, Menu, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem, SettingDefinitionPage } from "obsidian";
import type TranslatePlugin from "./main";
import { PROVIDER_PRESETS } from "./providers/presets";
import type { ProviderConfig, ProviderPreset } from "./providers/types";
import { DEFAULT_TRANSLATION_SYSTEM_PROMPT } from "./settings";

export class SettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: TranslatePlugin,
  ) {
    super(app, plugin);
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "list",
        heading: "API providers",
        emptyState: "No providers yet. Add one to get started.",
        addItem: {
          name: "Add provider",
          action: (el) => {
            this.showPresetMenu(el);
          },
        },
        onDelete: (index) => {
          void this.deleteProvider(index);
        },
        items: this.plugin.settings.providers.map((provider, index) =>
          this.providerPage(provider, index),
        ),
      },
      {
        type: "group",
        heading: "Translation",
        items: [
          {
            name: "Target language",
            desc: "The language to translate into. This value replaces {{targetLanguage}} in the prompt.",
            control: {
              type: "text",
              key: "targetLanguage",
              placeholder: "English",
              defaultValue: "English",
            },
          },
          {
            name: "Translation prompt",
            desc: "System prompt sent to the model. Supports the {{targetLanguage}} placeholder.",
            control: {
              type: "textarea",
              key: "translationSystemPrompt",
              rows: 10,
              defaultValue: DEFAULT_TRANSLATION_SYSTEM_PROMPT,
            },
          },
          {
            name: "Restore default prompt",
            desc: "Replaces the prompt above with the one the plugin ships with.",
            action: () => {
              void this.restoreDefaultPrompt();
            },
          },
        ],
      },
    ];
  }

  /**
   * Resolves both plain setting keys ("targetLanguage") and the per-provider
   * keys used by the list ("providers.2.model").
   */
  private resolveKey(
    key: string,
  ): { target: Record<string, unknown>; field: string } | undefined {
    const [head, index, field] = key.split(".");
    if (head && index === undefined) {
      return {
        target: this.plugin.settings as unknown as Record<string, unknown>,
        field: head,
      };
    }
    if (head === "providers" && index !== undefined && field !== undefined) {
      const provider = this.plugin.settings.providers[Number(index)];
      if (provider) {
        return {
          target: provider as unknown as Record<string, unknown>,
          field,
        };
      }
    }
    return undefined;
  }

  override getControlValue(key: string): unknown {
    const resolved = this.resolveKey(key);
    return resolved ? resolved.target[resolved.field] : undefined;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    const resolved = this.resolveKey(key);
    if (!resolved) return;
    resolved.target[resolved.field] = value;
    await this.plugin.saveSettings();
  }

  private providerPage(
    provider: ProviderConfig,
    index: number,
  ): SettingDefinitionPage {
    const isActive = () =>
      provider.id === this.plugin.settings.activeProviderId;

    return {
      type: "page",
      name: provider.name || "Unnamed provider",
      desc: provider.baseUrl || "No endpoint set",
      displayValue: () => (isActive() ? "Active" : ""),
      items: [
        {
          name: "Use for translations",
          desc: "Makes this the provider the translate commands call.",
          visible: () => !isActive(),
          render: (setting: Setting) => {
            setting.addButton((btn) =>
              btn
                .setButtonText("Set as active")
                .setCta()
                .onClick(() => {
                  void this.setActiveProvider(provider.id);
                }),
            );
          },
        },
        {
          name: "Display name",
          control: { type: "text", key: `providers.${index}.name` },
        },
        {
          name: "Base URL",
          control: {
            type: "text",
            key: `providers.${index}.baseUrl`,
            placeholder: "Provider endpoint URL",
          },
        },
        {
          name: "API key",
          desc: "Stored unencrypted in this vault's plugin data.",
          render: (setting: Setting) => {
            setting.addText((text) => {
              text.inputEl.type = "password";
              text.setValue(provider.apiKey).onChange(async (value) => {
                provider.apiKey = value;
                await this.plugin.saveSettings();
              });
            });
          },
        },
        {
          name: "Model name",
          control: { type: "text", key: `providers.${index}.model` },
        },
      ],
    };
  }

  private showPresetMenu(el: HTMLElement): void {
    const menu = new Menu();
    for (const preset of PROVIDER_PRESETS) {
      menu.addItem((item) =>
        item.setTitle(preset.name).onClick(() => {
          void this.addProvider(preset);
        }),
      );
    }
    const rect = el.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
  }

  private async addProvider(preset: ProviderPreset): Promise<void> {
    const provider: ProviderConfig = {
      id: generateId(),
      name: preset.name,
      baseUrl: preset.baseUrl,
      apiKey: "",
      model: preset.defaultModel,
    };
    this.plugin.settings.providers.push(provider);
    if (!this.plugin.settings.activeProviderId) {
      this.plugin.settings.activeProviderId = provider.id;
    }
    await this.plugin.saveSettings();
    this.update();
  }

  private async deleteProvider(index: number): Promise<void> {
    const [removed] = this.plugin.settings.providers.splice(index, 1);
    if (removed && this.plugin.settings.activeProviderId === removed.id) {
      this.plugin.settings.activeProviderId =
        this.plugin.settings.providers[0]?.id ?? "";
    }
    await this.plugin.saveSettings();
    this.update();
  }

  private async setActiveProvider(id: string): Promise<void> {
    this.plugin.settings.activeProviderId = id;
    await this.plugin.saveSettings();
    this.update();
  }

  private async restoreDefaultPrompt(): Promise<void> {
    this.plugin.settings.translationSystemPrompt =
      DEFAULT_TRANSLATION_SYSTEM_PROMPT;
    await this.plugin.saveSettings();
    this.update();
  }
}

function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

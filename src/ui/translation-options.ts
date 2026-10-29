import { App, Modal, Setting } from "obsidian";
import { getTargetLanguages, PluginSettings } from "../settings";

export type SaveMode = "overwrite" | "review" | "new-file";
export interface TranslationOptions { language: string; mode: SaveMode }

export function chooseTranslationOptions(
  app: App, settings: PluginSettings, forFile: boolean,
): Promise<TranslationOptions | null> {
  return new Promise((resolve) => {
    new TranslationOptionsModal(app, settings, forFile, resolve).open();
  });
}

export class TranslationOptionsModal extends Modal {
  private language: string;
  private mode: SaveMode;
  private resolved = false;

  constructor(
    app: App,
    private readonly settings: PluginSettings,
    private readonly forFile: boolean,
    private readonly resolve: (options: TranslationOptions | null) => void,
  ) {
    super(app);
    this.language = settings.lastTargetLanguage || settings.targetLanguage || "English";
    this.mode = forFile ? "new-file" : "review";
  }

  override onOpen(): void {
    this.setTitle("Translate");
    const languageSetting = new Setting(this.contentEl).setName("Target language");
    languageSetting.addDropdown((dropdown) => {
      for (const language of getTargetLanguages(this.settings)) {
        dropdown.addOption(language, language);
      }
      dropdown.setValue(this.language).onChange((value) => { this.language = value; });
      new Setting(this.contentEl)
        .setName("Quick choices")
        .addButton((button) => button.setButtonText("English").onClick(() => {
          this.language = "English";
          dropdown.setValue(this.language);
        }))
        .addButton((button) => button.setButtonText("Swedish").onClick(() => {
          this.language = "Swedish";
          dropdown.setValue(this.language);
        }));
    });
    if (this.forFile) {
      new Setting(this.contentEl).setName("Save translation").addDropdown((dropdown) => {
        dropdown.addOptions({
          "new-file": "Create new file",
          "review": "Review and overwrite",
          "overwrite": "Overwrite original",
        }).setValue(this.mode).onChange((value) => { this.mode = value as SaveMode; });
      });
      this.contentEl.createEl("p", {
        text: "Overwrite replaces the original after translation and saves a recovery copy first. A new file keeps the original and copies frontmatter unchanged, including any document identifiers.",
      });
    }
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => button.setButtonText("Translate").setCta().onClick(() => {
        this.resolved = true;
        this.resolve({ language: this.language, mode: this.mode });
        this.close();
      }));
  }

  override onClose(): void {
    if (!this.resolved) this.resolve(null);
    this.contentEl.empty();
  }
}

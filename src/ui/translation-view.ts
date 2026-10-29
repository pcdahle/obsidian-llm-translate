import { ItemView, Setting, WorkspaceLeaf } from "obsidian";
import type { TranslationSource } from "../translation/source";
export type { TranslationSource } from "../translation/source";
import {
  showErrorNotification,
  showInfoNotification,
} from "./user-notifications";

export const TRANSLATION_VIEW_TYPE = "translate-note-review";

/**
 * Side panel holding a translation that has not been accepted yet.
 * The note itself is left untouched until the reader presses "Insert",
 * so the original text is always there to compare against.
 */
export class TranslationView extends ItemView {
  private source: TranslationSource | undefined;
  private saveResult: ((mode: "overwrite" | "new-file", text: string) => Promise<string>) | undefined;
  private saving = false;
  private completed = false;

  get hasPendingTranslation(): boolean { return this.source !== undefined; }
  private textArea: HTMLTextAreaElement | undefined;
  private statusEl: HTMLElement | undefined;
  private actionsEl: HTMLElement | undefined;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  override getViewType(): string {
    return TRANSLATION_VIEW_TYPE;
  }

  override getDisplayText(): string {
    return "Translation";
  }

  override getIcon(): string {
    return "languages";
  }

  override async onOpen(): Promise<void> {
    this.render();
  }

  /** Clears the panel and binds it to a new translation. */
  beginTranslation(
    source: TranslationSource,
    saveResult: (mode: "overwrite" | "new-file", text: string) => Promise<string>,
  ): void {
    this.source = source;
    this.saveResult = saveResult;
    this.completed = false;
    this.render();
    this.setStatus(`Translating ${describe(source)}…`);
    this.setText("");
    if (this.textArea) this.textArea.readOnly = true;
    this.setActionsVisible(false);
  }

  setText(text: string): void {
    if (this.textArea) {
      this.textArea.value = text;
    }
  }

  getText(): string {
    return this.textArea?.value ?? "";
  }

  /** Called once the stream is done: shows the Insert / Discard buttons. */
  completeTranslation(): void {
    this.completed = true;
    if (this.textArea) this.textArea.readOnly = false;
    const what = this.source ? describe(this.source) : "the note";
    this.setStatus(`Translated ${what}. Review it, then insert or discard it.`);
    this.setActionsVisible(true);
  }

  cancelTranslation(): void {
    this.completed = false;
    this.source = undefined;
    this.setStatus("Translation cancelled. The note was not modified.");
    this.setActionsVisible(false);
  }

  failTranslation(): void {
    this.completed = false;
    this.setStatus("The translation failed. Nothing was saved. Copy any useful text, then discard and try again.");
    this.setActionsVisible(true);
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("translate-note-review");

    this.statusEl = container.createEl("p", {
      cls: "translate-note-review-status",
      text: "No translation yet. Translate a full note to see it here.",
    });

    this.textArea = container.createEl("textarea", {
      cls: "translate-note-review-text",
    });
    this.textArea.spellcheck = false;

    this.actionsEl = container.createDiv();
    new Setting(this.actionsEl)
      .addButton((btn) =>
        btn.setButtonText("Discard").onClick(() => {
          this.discard();
        }),
      )
      .addButton((btn) =>
        btn
          .setButtonText("Insert")
          .setCta()
          .onClick(() => {
            void this.save("overwrite");
          }),
      )
      .addButton((btn) => btn.setButtonText("Create new file").onClick(() => {
        void this.save("new-file");
      }));
    this.setActionsVisible(false);
  }

  private setStatus(text: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = text;
    }
  }

  private setActionsVisible(visible: boolean): void {
    this.actionsEl?.toggleClass("translate-note-hidden", !visible);
    for (const button of this.actionsEl?.querySelectorAll("button") ?? []) {
      button.disabled = button.textContent !== "Discard" && !this.completed;
    }
  }

  private discard(): void {
    if (this.saving) return;
    this.source = undefined;
    this.completed = false;
    this.setText("");
    this.setStatus("Translation discarded. The note was never modified.");
    this.setActionsVisible(false);
  }

  /** A failed save keeps the editable result and both recovery choices. */
  async save(mode: "overwrite" | "new-file"): Promise<void> {
    if (!this.source || !this.saveResult || this.saving || !this.completed) return;
    this.saving = true;
    if (this.textArea) this.textArea.readOnly = true;
    this.setActionsVisible(false);
    try {
      const path = await this.saveResult(mode, this.getText());
      this.source = undefined;
      this.completed = false;
      this.setText("");
      this.setStatus(`Saved to ${path}.`);
      showInfoNotification(`translation saved to ${path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the translation.";
      this.setStatus(`${message} Your translation is still here.`);
      showErrorNotification({ title: "Translation was not saved", message });
      this.setActionsVisible(true);
    } finally {
      this.saving = false;
      if (this.textArea) this.textArea.readOnly = false;
    }
  }

}

function describe(source: TranslationSource): string {
  const name = basename(source.filePath);
  return source.kind === "selection" ? `a selection of ${name}` : name;
}

function basename(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

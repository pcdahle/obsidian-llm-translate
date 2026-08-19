import { ItemView, Setting, TFile, WorkspaceLeaf } from "obsidian";
import {
  showErrorNotification,
  showInfoNotification,
} from "./user-notifications";

export const TRANSLATION_VIEW_TYPE = "llm-translate-review";

export interface TranslationSource {
  /** Path of the note the translation belongs to. */
  readonly filePath: string;
  /** Whole note as it was when the translation started. */
  readonly originalContent: string;
  /**
   * Half-open range of `originalContent` the translation replaces on insert:
   * the body for a full note (so the front-matter survives), the selected
   * range for a selection.
   */
  readonly replaceStart: number;
  readonly replaceEnd: number;
  /** What was translated, for the status line. */
  readonly kind: "note" | "selection";
}

/**
 * Side panel holding a translation that has not been accepted yet.
 * The note itself is left untouched until the reader presses "Insert",
 * so the original text is always there to compare against.
 */
export class TranslationView extends ItemView {
  private source: TranslationSource | undefined;
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
  beginTranslation(source: TranslationSource): void {
    this.source = source;
    this.render();
    this.setStatus(`Translating ${describe(source)}…`);
    this.setText("");
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
    const what = this.source ? describe(this.source) : "the note";
    this.setStatus(`Translated ${what}. Review it, then insert or discard it.`);
    this.setActionsVisible(true);
  }

  cancelTranslation(): void {
    this.source = undefined;
    this.setStatus("Translation cancelled. The note was not modified.");
    this.setActionsVisible(false);
  }

  failTranslation(): void {
    this.setStatus("The translation failed. Close this panel and try again.");
    this.setActionsVisible(false);
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("llm-translate-review");

    this.statusEl = container.createEl("p", {
      cls: "llm-translate-review-status",
      text: "No translation yet. Translate a full note to see it here.",
    });

    this.textArea = container.createEl("textarea", {
      cls: "llm-translate-review-text",
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
            void this.insert();
          }),
      );
    this.setActionsVisible(false);
  }

  private setStatus(text: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = text;
    }
  }

  private setActionsVisible(visible: boolean): void {
    this.actionsEl?.toggleClass("llm-translate-hidden", !visible);
  }

  private discard(): void {
    this.source = undefined;
    this.setText("");
    this.setStatus("Translation discarded. The note was never modified.");
    this.setActionsVisible(false);
  }

  /**
   * Writes the reviewed translation back over the range it came from, so the
   * front-matter and everything outside that range are left alone. Refuses to
   * write if the note changed in the meantime, rather than silently
   * overwriting the newer text.
   */
  private async insert(): Promise<void> {
    const source = this.source;
    if (!source) return;

    const file = this.app.vault.getAbstractFileByPath(source.filePath);
    if (!(file instanceof TFile)) {
      showErrorNotification({
        title: "The note is gone",
        message: `Could not find ${source.filePath}.`,
      });
      return;
    }

    const current = await this.app.vault.read(file);
    if (current !== source.originalContent) {
      showErrorNotification({
        title: "The note changed while you were reviewing",
        message: "Inserting now would overwrite those edits.",
        suggestions: [
          "Copy the translation out of this panel, or run the translation again",
        ],
      });
      return;
    }

    const translated =
      current.slice(0, source.replaceStart) +
      this.getText() +
      current.slice(source.replaceEnd);
    await this.app.vault.process(file, () => translated);

    this.source = undefined;
    this.setStatus(`Inserted into ${basename(file.path)}.`);
    this.setActionsVisible(false);
    showInfoNotification("translation inserted");
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

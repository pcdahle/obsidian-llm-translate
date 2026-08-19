import { App, Modal, Setting } from "obsidian";

export function confirmLongText(
  app: App,
  charCount: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new LongTextConfirmModal(app, charCount, resolve);
    modal.open();
  });
}

class LongTextConfirmModal extends Modal {
  private resolved = false;

  constructor(
    app: App,
    private readonly charCount: number,
    private readonly resolve: (value: boolean) => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "This note is long. Translate it anyway?" });
    contentEl.createEl("p", {
      text: `The body is ${this.charCount.toLocaleString()} characters long, which may take a while and use a lot of tokens.`,
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Cancel")
          .onClick(() => {
            this.finish(false);
          }),
      )
      .addButton((btn) =>
        btn
          .setButtonText("Translate")
          .setCta()
          .onClick(() => {
            this.finish(true);
          }),
      );
  }

  override onClose(): void {
    if (!this.resolved) {
      this.resolve(false);
    }
    this.contentEl.empty();
  }

  private finish(value: boolean): void {
    this.resolved = true;
    this.resolve(value);
    this.close();
  }
}

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
    contentEl.createEl("h3", { text: "正文较长，确认翻译？" });
    contentEl.createEl("p", {
      text: `当前正文 ${this.charCount.toLocaleString()} 字符，可能消耗较多 tokens 和时间。`,
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("取消")
          .onClick(() => {
            this.finish(false);
          }),
      )
      .addButton((btn) =>
        btn
          .setButtonText("继续翻译")
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

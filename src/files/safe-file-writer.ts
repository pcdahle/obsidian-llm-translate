import { App, MarkdownView, normalizePath } from "obsidian";
import type { TranslationSource } from "../translation/source";
import { validateTranslation, TranslationSafetyError } from "../translation/protected-markdown";

export class SafeFileWriter {
  constructor(
    private readonly app: App,
    private readonly pluginDirectory: string,
    private readonly canWrite: () => boolean = () => true,
  ) {}

  private assertWritable(): void {
    if (!this.canWrite()) throw new TranslationSafetyError("Saving was cancelled or the plugin was unloaded. Nothing was saved.");
  }

  private assertSource(source: TranslationSource): void {
    this.assertWritable();
    if (source.file.path !== source.filePath ||
      this.app.vault.getAbstractFileByPath(source.filePath) !== source.file) {
      throw new TranslationSafetyError("The source note was moved, deleted or replaced. Save the translation as a new file instead.");
    }
    let edited = false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView && leaf.view.file === source.file &&
        leaf.view.editor.getValue() !== source.originalContent) edited = true;
    });
    if (edited) throw new TranslationSafetyError("The note has unsaved editor changes. Save it and translate again, or create a new file.");
  }

  async assertUnchanged(source: TranslationSource): Promise<void> {
    this.assertSource(source);
    // Adapter read also sees an external write before its filesystem event arrives.
    const disk = await this.app.vault.adapter.read(source.filePath);
    if (disk !== source.originalContent) throw new TranslationSafetyError("The source note changed. Nothing was overwritten. Create a new file or translate again.");
    this.assertSource(source);
  }

  private async backup(source: TranslationSource): Promise<string> {
    const adapter = this.app.vault.adapter;
    const directory = normalizePath(`${this.pluginDirectory}/backups`);
    if (!(await adapter.exists(directory))) await adapter.mkdir(directory);
    const path = `${directory}/${Date.now()}-${crypto.randomUUID()}.json`;
    const payload = JSON.stringify({
      format: "translate-note-backup-v1", createdAt: new Date().toISOString(),
      filePath: source.filePath, content: source.originalContent,
    });
    await adapter.write(path, payload);
    if (await adapter.read(path) !== payload) {
      throw new TranslationSafetyError("The recovery copy could not be verified. Nothing was overwritten.");
    }
    return path;
  }

  async overwrite(source: TranslationSource, translation: string): Promise<string> {
    const proposed = validateTranslation(source.originalContent, source.replaceStart, source.replaceEnd, translation);
    await this.assertUnchanged(source);
    await this.backup(source); // Failure aborts the overwrite; never delete these copies automatically.
    await this.assertUnchanged(source);
    await this.app.vault.process(source.file, (current) => {
      // This comparison belongs INSIDE process, not only in a preceding read.
      this.assertSource(source);
      if (current !== source.originalContent) {
        throw new TranslationSafetyError("The source note changed before saving. Nothing was overwritten. Create a new file or translate again.");
      }
      return proposed;
    });
    return source.filePath;
  }

  async createNew(source: TranslationSource, translation: string, language: string): Promise<string> {
    const proposed = validateTranslation(source.originalContent, source.replaceStart, source.replaceEnd, translation);
    const label = language.replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 40) || "translation";
    const stem = source.filePath.replace(/\.md$/i, "");
    // Unique suffix prevents competing translators/sync clients choosing the same name.
    const path = `${stem}.${label}-${Date.now()}-${crypto.randomUUID()}.md`;
    if (this.app.vault.getAbstractFileByPath(path) || await this.app.vault.adapter.exists(path)) {
      throw new TranslationSafetyError("The destination already exists. Nothing was saved. Try again.");
    }
    this.assertWritable();
    await this.app.vault.create(path, proposed);
    return path;
  }
}

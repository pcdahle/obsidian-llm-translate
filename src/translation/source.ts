import type { TFile } from "obsidian";

export interface TranslationSource {
  readonly file: TFile;
  readonly filePath: string;
  readonly originalContent: string;
  readonly replaceStart: number;
  readonly replaceEnd: number;
  readonly kind: "note" | "selection";
}

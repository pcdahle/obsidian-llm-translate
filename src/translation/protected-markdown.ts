import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { Nodes } from "mdast";
import { extractBody } from "./extract-body";

interface Range { start: number; end: number }
interface Segment { text: string; protected: boolean }

export class TranslationSafetyError extends Error {}

/** Only prose leaves are translated. All source syntax is copied by offset. */
function proseRanges(document: string): Range[] {
  const { frontmatter, bodyStartOffset } = extractBody(document);
  if (!frontmatter && /^\uFEFF?---[ \t]*\r?\n/.test(document)) {
    throw new TranslationSafetyError("Unclosed frontmatter. Fix it before translating.");
  }
  const body = document.slice(bodyStartOffset);
  const ranges: Range[] = [];
  const protectedRanges: Range[] = [];
  // Obsidian syntax that CommonMark/GFM intentionally does not understand.
  const patterns = [
    /!?\[\[[\s\S]*?\]\]/g,
    /%%[\s\S]*?%%/g,
    /\$\$[\s\S]*?\$\$|\$[^\r\n$]+\$/g,
    /\[![\w-]+\][+-]?/g,
    /\bdbox:(?:\/\/)?[0-9a-f-]+/gi,
    /\b(?:https?:\/\/|obsidian:\/\/)[^\s<>]+/gi,
    /(?:^|\s)#[\p{L}\p{N}_/-]+/gu,
    /\^[\w-]+(?=[ \t]*(?:\r?\n|$))/g,
    /\\[^\r\n]|&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi,
    /==/g,
    /^[ \t]*(?:>[ \t]*)+/gm,
    /^[ \t]+/gm,
    /\r\n|\r|\n/g,
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      protectedRanges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  protectedRanges.sort((a, b) => a.start - b.start);
  let blockedIndex = 0;
  const visit = (node: Nodes): void => {
    // Keeping headings also keeps existing heading-link targets stable, including backlinks.
    if (["heading", "link", "linkReference", "image", "imageReference", "code",
      "inlineCode", "html", "definition", "footnoteReference"].includes(node.type)) return;
    if (node.type === "text") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) return;
      const pieces: Range[] = [];
      let cursor = start;
      while (blockedIndex < protectedRanges.length && protectedRanges[blockedIndex]!.end <= start) blockedIndex++;
      for (let index = blockedIndex; index < protectedRanges.length; index++) {
        const blocked = protectedRanges[index]!;
        if (blocked.start >= end) break;
        if (blocked.start > cursor) pieces.push({ start: cursor, end: blocked.start });
        cursor = Math.max(cursor, Math.min(blocked.end, end));
      }
      if (cursor < end) pieces.push({ start: cursor, end });
      for (const piece of pieces) {
        const raw = body.slice(piece.start, piece.end);
        const trimmed = raw.trim();
        if (trimmed) {
          const leading = raw.length - raw.trimStart().length;
          ranges.push({
            start: bodyStartOffset + piece.start + leading,
            end: bodyStartOffset + piece.start + leading + trimmed.length,
          });
        }
      }
    } else if ("children" in node) {
      for (const child of node.children) visit(child);
    }
  };
  visit(fromMarkdown(body, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }));
  return ranges;
}

function segments(document: string, start: number, end: number): Segment[] {
  const result: Segment[] = [];
  let cursor = start;
  for (const range of proseRanges(document)) {
    const left = Math.max(start, range.start);
    const right = Math.min(end, range.end);
    if (left >= right) continue;
    result.push({ text: document.slice(cursor, left), protected: true });
    result.push({ text: document.slice(left, right), protected: false });
    cursor = right;
  }
  result.push({ text: document.slice(cursor, end), protected: true });
  return result;
}

/** Used again after manual review, so editing cannot silently remove protected data. */
export function validateTranslation(
  document: string, start: number, end: number, translation: string,
): string {
  if (!translation.trim()) throw new TranslationSafetyError("The translation is empty. Nothing was saved.");
  const proposed = document.slice(0, start) + translation + document.slice(end);
  const fingerprint = (text: string) => JSON.stringify(
    segments(text, 0, text.length).filter((part) => part.protected).map((part) => part.text),
  );
  if (fingerprint(document) !== fingerprint(proposed)) {
    throw new TranslationSafetyError(
      "The translation changed protected Markdown, metadata or links. Nothing was saved. Keep the original structure and try again.",
    );
  }
  return proposed;
}

export interface ProtectedTranslation {
  readonly input: string;
  restore(response: string): string;
}

export function protectMarkdown(document: string, start: number, end: number): ProtectedTranslation {
  if (start < 0 || end < start || end > document.length) {
    throw new TranslationSafetyError("Invalid translation range.");
  }
  const parts = segments(document, start, end);
  if (!parts.some((part) => !part.protected && /[\p{L}\p{N}]/u.test(part.text))) {
    throw new TranslationSafetyError("This range contains no translatable prose. Metadata, headings, links and code are kept unchanged.");
  }
  let prefix: string;
  do { prefix = `TN_${crypto.randomUUID().replace(/-/g, "")}_`; } while (document.includes(prefix));
  const tokens: string[] = [];
  const protectedText: string[] = [];
  const input = parts.map((part) => {
    if (!part.protected) return part.text;
    const token = `⟪${prefix}${tokens.length}⟫`;
    tokens.push(token);
    protectedText.push(part.text);
    return token;
  }).join("");
  const pattern = new RegExp(`⟪${prefix}\\d+⟫`, "g");
  return {
    input,
    restore(response) {
      const found = response.match(pattern) ?? [];
      if (found.length !== tokens.length || found.some((token, index) => token !== tokens[index]) ||
        !response.startsWith(tokens[0]!) || !response.endsWith(tokens[tokens.length - 1]!)) {
        throw new TranslationSafetyError("The model changed safety placeholders or added extra text. Nothing was saved. Try again or choose another model.");
      }
      const chunks = response.split(pattern);
      // A model must not silently delete a prose span, even if it keeps the tokens.
      for (let index = 1; index < chunks.length - 1; index++) {
        if (!chunks[index]?.trim()) throw new TranslationSafetyError("The model returned an incomplete translation. Nothing was saved.");
      }
      let index = 0;
      const restored = response.replace(pattern, () => protectedText[index++]!);
      validateTranslation(document, start, end, restored);
      return restored;
    },
  };
}

export const PROTECTION_INSTRUCTION = `\n\nTranslate only the prose between safety placeholders (⟪TN_…⟫).
Copy every placeholder exactly once, in the same order. Do not translate or remove placeholders.
Keep each prose span nonempty. Do not add a preamble, code fence, Markdown syntax or commentary.
Start with the first placeholder and end with the last placeholder.`;

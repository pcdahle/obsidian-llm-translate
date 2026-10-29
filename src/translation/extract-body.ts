export interface DocumentParts {
  frontmatter: string;
  body: string;
  bodyStartOffset: number;
}

/**
 * Splits a document into its YAML frontmatter and its body.
 * The frontmatter keeps both the opening `---` and the closing `---\n`,
 * and the body starts right after it. When there is no valid frontmatter,
 * frontmatter is empty and body is the whole document.
 */
export function extractBody(content: string): DocumentParts {
  const match = content.match(/^\uFEFF?---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: "", body: content, bodyStartOffset: 0 };
  }
  const bodyStartOffset = match[0].length;
  return {
    frontmatter: match[0],
    body: content.slice(bodyStartOffset),
    bodyStartOffset,
  };
}

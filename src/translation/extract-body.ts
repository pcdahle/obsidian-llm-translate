export interface DocumentParts {
  frontmatter: string;
  body: string;
  bodyStartOffset: number;
}

/**
 * 将文档切分为 YAML frontmatter 和正文两部分。
 * frontmatter 保留开头 `---` 和结尾 `---\n`，body 从正文起点开始。
 * 如果没有合法的 frontmatter，frontmatter 为空，body 即整篇文档。
 */
export function extractBody(content: string): DocumentParts {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
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

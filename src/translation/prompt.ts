export function buildSystemPrompt(
  template: string,
  targetLanguage: string,
): string {
  return template.replace(/\{\{\s*targetLanguage\s*\}\}/g, targetLanguage);
}

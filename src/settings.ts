import type { ProviderConfig } from "./providers/types";

export interface PluginSettings {
  providers: ProviderConfig[];
  activeProviderId: string;
  targetLanguage: string;
  translationSystemPrompt: string;
}

export const DEFAULT_TRANSLATION_SYSTEM_PROMPT = `You are a professional translation engine. Translate the following content into {{targetLanguage}}.

Rules:
- Preserve the paragraph structure and Markdown formatting of the source
- The first time a proper noun or technical term appears, keep it in the source language and put the translation in parentheses right after it
- Do not add explanations, summaries or comments; output the translation only
- Preserve the tone and register of the source
- Leave numbers, URLs and code snippets untouched`;

export const DEFAULT_SETTINGS: PluginSettings = {
  providers: [],
  activeProviderId: "",
  targetLanguage: "English",
  translationSystemPrompt: DEFAULT_TRANSLATION_SYSTEM_PROMPT,
};

export function getActiveProvider(
  settings: PluginSettings,
): ProviderConfig | undefined {
  return settings.providers.find((p) => p.id === settings.activeProviderId);
}

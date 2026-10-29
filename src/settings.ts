import type { ProviderConfig } from "./providers/types";

export interface PluginSettings {
  providers: ProviderConfig[];
  activeProviderId: string;
  targetLanguage: string;
  translationSystemPrompt: string;
  additionalLanguages: string;
  lastTargetLanguage: string;
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
  additionalLanguages: "",
  lastTargetLanguage: "",
};

export function getActiveProvider(
  settings: PluginSettings,
): ProviderConfig | undefined {
  return settings.providers.find((p) => p.id === settings.activeProviderId);
}

/** Preserve legacy settings and unknown keys; never rewrite provider credentials. */
export function loadPluginSettings(data: Partial<PluginSettings> | null): PluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    providers: data?.providers?.map((provider) => ({ ...provider })) ?? [],
    additionalLanguages: data?.additionalLanguages ?? "",
    lastTargetLanguage: data?.lastTargetLanguage ?? "",
  };
}

export function getTargetLanguages(settings: PluginSettings): string[] {
  const candidates = [
    "English", "Swedish", settings.lastTargetLanguage, settings.targetLanguage,
    ...settings.additionalLanguages.split(/[,;\n]/),
  ];
  const seen = new Set<string>();
  return candidates.map((language) => language.trim()).filter((language) => {
    const key = language.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

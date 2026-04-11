import type { ProviderConfig } from "./providers/types";

export interface PluginSettings {
  providers: ProviderConfig[];
  activeProviderId: string;
  targetLanguage: string;
  translationSystemPrompt: string;
}

export const DEFAULT_TRANSLATION_SYSTEM_PROMPT = `你是一个专业翻译引擎。请将以下内容翻译为{{targetLanguage}}。

规则：
- 保持原文的段落结构和 Markdown 格式
- 专有名词、技术术语首次出现时保留英文原文并括号注明中文
- 不要添加解释、总结或评论，只输出翻译结果
- 保持原文的语气和风格
- 数字、URL、代码片段保持不变`;

export const DEFAULT_SETTINGS: PluginSettings = {
  providers: [],
  activeProviderId: "",
  targetLanguage: "中文",
  translationSystemPrompt: DEFAULT_TRANSLATION_SYSTEM_PROMPT,
};

export function getActiveProvider(
  settings: PluginSettings,
): ProviderConfig | undefined {
  return settings.providers.find((p) => p.id === settings.activeProviderId);
}

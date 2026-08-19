import type { ProviderPreset } from "./types";

/**
 * Providers reachable worldwide, with their international endpoints.
 * China-only endpoints are left out on purpose: users outside China
 * cannot sign up for them. They can still be added through "Custom".
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.4-mini",
  },
  {
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.5-flash-lite",
  },
  {
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k2.6",
  },
  {
    name: "Qwen",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-turbo",
  },
  {
    name: "Z.AI (GLM)",
    baseUrl: "https://api.z.ai/api/paas/v4",
    defaultModel: "glm-4.7-flash",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "",
  },
  {
    name: "Custom",
    baseUrl: "",
    defaultModel: "",
  },
];

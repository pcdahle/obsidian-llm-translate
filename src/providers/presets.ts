import type { ProviderPreset } from "./types";

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
  },
  {
    name: "豆包",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "",
  },
  {
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
  },
  {
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-turbo",
  },
  {
    name: "智谱",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
  },
  {
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "",
  },
  {
    name: "自定义",
    baseUrl: "",
    defaultModel: "",
  },
];

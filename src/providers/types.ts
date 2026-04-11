export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ProviderPreset {
  name: string;
  baseUrl: string;
  defaultModel: string;
}

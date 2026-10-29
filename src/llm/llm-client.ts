import { APIUserAbortError, OpenAI } from "openai";
import { AbortError } from "../utils/abort-error";
import { obsidianFetchAdapter } from "../utils/obsidian-fetch-adapter";

export interface LLMClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface GetResponseParams {
  readonly systemPrompt: string;
  readonly userContent: string;
  readonly signal?: AbortSignal;
}

export class LLMClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: LLMClientConfig) {
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      fetch: obsidianFetchAdapter,
      dangerouslyAllowBrowser: true,
    });
  }

  async *getResponse({
    systemPrompt,
    userContent,
    signal,
  }: GetResponseParams): AsyncGenerator<string, void, unknown> {
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          stream: true,
        },
        { signal },
      );

      for await (const chunk of response) {
        if (signal?.aborted) {
          throw new AbortError();
        }
        const choice = chunk.choices[0];
        if (choice?.finish_reason && choice.finish_reason !== "stop") {
          throw new Error(`The model did not finish the translation (${choice.finish_reason}). Nothing was saved.`);
        }
        const delta = choice?.delta.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (error: unknown) {
      if (error instanceof APIUserAbortError) {
        throw new AbortError();
      }
      throw error;
    }
  }
}

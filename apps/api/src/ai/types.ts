export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompleteArgs {
  system: string;
  messages: AiMessage[];
  /** JSON schema (as a plain object). When set, the model is asked for JSON only. */
  schema?: Record<string, unknown>;
  stream?: boolean;
  maxTokens?: number;
}

export type AiResult =
  | { provider: string; text: string; stream?: undefined }
  | { provider: string; stream: AsyncIterable<string>; text?: undefined };

export type ProviderName = "gemini" | "workers" | "openai" | "anthropic" | "ollama";

export class AiUnavailableError extends Error {
  constructor() {
    super("no_ai_provider");
  }
}

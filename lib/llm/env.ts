import { DEFAULT_LLM_MODEL } from "./config";

export type GeminiEnv = {
  apiKey: string;
  model: string;
};

export function getGeminiEnv(): GeminiEnv {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  return { apiKey, model };
}

/** Provider config — safe to import from client and server components */

export type Provider = "openai" | "claude" | "gemini";

export interface ProviderModel {
  id: string;
  name: string;
  costPerBattle: string;
}

export const PROVIDER_CONFIG: Record<
  Provider,
  { name: string; keyPlaceholder: string; keyGuideUrl: string; models: ProviderModel[] }
> = {
  openai: {
    name: "OpenAI",
    keyPlaceholder: "sk-...",
    keyGuideUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", costPerBattle: "~$0.01" },
      { id: "gpt-4o", name: "GPT-4o", costPerBattle: "~$0.05" },
    ],
  },
  claude: {
    name: "Claude (Anthropic)",
    keyPlaceholder: "sk-ant-...",
    keyGuideUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-sonnet-4-6", name: "Sonnet 4.6", costPerBattle: "~$0.03" },
      { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", costPerBattle: "~$0.01" },
      { id: "claude-opus-4-6", name: "Opus 4.6", costPerBattle: "~$0.15" },
    ],
  },
  gemini: {
    name: "Google Gemini",
    keyPlaceholder: "AIza...",
    keyGuideUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", costPerBattle: "~$0.01" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", costPerBattle: "~$0.01" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", costPerBattle: "~$0.10" },
    ],
  },
};

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  claude: "claude-sonnet-4-6",
  gemini: "gemini-2.0-flash",
};

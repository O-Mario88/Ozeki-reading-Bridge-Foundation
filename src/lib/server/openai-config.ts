export type OpenAiConfigStatus =
  | "ok"
  | "missing_api_key"
  | "placeholder_api_key"
  | "invalid_api_key_format";

export type OpenAiServerConfig = {
  apiKey: string | null;
  model: string;
  configured: boolean;
  status: OpenAiConfigStatus;
};

function normalizeEnvValue(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function looksLikePlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with") ||
    normalized.includes("your-") ||
    normalized.includes("example") ||
    normalized.includes("changeme") ||
    normalized.includes("change-me")
  );
}

function looksLikeOpenAiKey(value: string) {
  return /^sk-[A-Za-z0-9._-]{20,}$/.test(value);
}

export function getOpenAiServerConfig(defaultModel = "gpt-5.2-mini"): OpenAiServerConfig {
  const apiKey = normalizeEnvValue(process.env.OPENAI_API_KEY);
  const model = normalizeEnvValue(process.env.OPENAI_REPORT_MODEL) || defaultModel;

  if (!apiKey) {
    return {
      apiKey: null,
      model,
      configured: false,
      status: "missing_api_key",
    };
  }

  if (looksLikePlaceholder(apiKey)) {
    return {
      apiKey: null,
      model,
      configured: false,
      status: "placeholder_api_key",
    };
  }

  if (!looksLikeOpenAiKey(apiKey)) {
    return {
      apiKey: null,
      model,
      configured: false,
      status: "invalid_api_key_format",
    };
  }

  return {
    apiKey,
    model,
    configured: true,
    status: "ok",
  };
}

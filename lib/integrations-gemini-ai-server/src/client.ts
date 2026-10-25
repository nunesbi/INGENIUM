const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiMessage = { role: "user" | "model"; content: string };

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY must be set");
  return key;
}

export async function generateText(options: {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
}): Promise<string> {
  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const contents = [{ role: "user", parts: [{ text: options.prompt }] }];
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens ?? 2000,
      ...(options.responseMimeType
        ? { responseMimeType: options.responseMimeType }
        : {}),
    },
  };
  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }
  const response = await fetch(
  `${GEMINI_API_URL}/${model}:generateContent`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
  },
);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API ${response.status}: ${detail.slice(0, 500)}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

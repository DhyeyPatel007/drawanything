// Shared VLM caller for the Vercel parse functions.
// Token Factory (Nebius) is OpenAI-compatible; the key stays server-side in
// the NEBIUS_API_KEY env var (Vercel project settings). Model: Gemma 3 27B —
// the panel's pick for fast multimodal OCR + strict JSON.

const ENDPOINT = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const MODEL = "google/gemma-3-27b-it";

export function vlmKey(): string | null {
  return (
    process.env.NEBIUS_API_KEY ||
    process.env.TOKEN_FACTORY_API_KEY ||
    process.env.TF_API_KEY ||
    null
  );
}

export async function vlmJSON(
  key: string,
  imageDataURL: string,
  prompt: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataURL } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export function readBody(req: { body?: unknown }): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return req.body as Record<string, unknown>;
}

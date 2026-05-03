/**
 * Read a JSON body for an optional-payload POST.
 *
 * Behaviour:
 *  - empty body / no Content-Type → returns `{}`
 *  - well-formed JSON object       → returns the parsed object
 *  - malformed JSON                → throws `JsonBodyError` (400)
 *
 * The previous pattern `await request.json().catch(() => ({}))` collapsed
 * malformed JSON into `{}`, then the downstream Zod check failed with a
 * confusing "expected X" message instead of telling the client their JSON
 * was invalid.
 */
export class JsonBodyError extends Error {
  status = 400;
  constructor(message = "Invalid JSON body") {
    super(message);
    this.name = "JsonBodyError";
  }
}

export async function readOptionalJsonBody(request: Request): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {};
  }
  if (!raw || raw.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new JsonBodyError("Expected a JSON object body");
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof JsonBodyError) throw err;
    throw new JsonBodyError("Invalid JSON body");
  }
}

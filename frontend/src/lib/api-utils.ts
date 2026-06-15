type ApiErrorShape = { response?: { data?: { message?: string | string[]; statusCode?: number } } };

export function parseApiError(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorShape;
  const message = apiError.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || fallback;
}

/**
 * Extracts per-field validation errors from a class-validator 400 response.
 *
 * Backend sends messages like "price must match /regex/", "items.0.variantId must be a UUID".
 * This parses them into a flat Record keyed by the field path before the first space.
 * Use to set RHF errors: `Object.entries(parseFieldErrors(e)).forEach(([k, v]) => setError(k, { message: v }))`.
 */
export function parseFieldErrors(error: unknown): Record<string, string> {
  const apiError = error as ApiErrorShape;
  const messages = apiError.response?.data?.message;
  if (!Array.isArray(messages)) return {};

  const result: Record<string, string> = {};
  for (const msg of messages) {
    const spaceIdx = msg.indexOf(' ');
    if (spaceIdx === -1) continue;
    const field = msg.slice(0, spaceIdx);
    if (!result[field]) result[field] = msg.slice(spaceIdx + 1);
  }
  return result;
}

/** Returns true if the API error response is a 409 Conflict. */
export function isConflictError(error: unknown): boolean {
  const apiError = error as ApiErrorShape;
  return apiError.response?.data?.statusCode === 409;
}

/** Returns true if the API error response is a 404 Not Found. */
export function isNotFoundError(error: unknown): boolean {
  const apiError = error as ApiErrorShape;
  return apiError.response?.data?.statusCode === 404;
}

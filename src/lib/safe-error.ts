/**
 * Server-side error handling that never leaks secrets or infrastructure
 * details to clients or unstructured logs.
 */

const SENSITIVE_PATTERN =
  /(password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|authorization|cookie|session|mongodb(\+srv)?:\/\/|postgres(ql)?:\/\/|redis:\/\/|s3[_-]?secret)/i;

const SAFE_CLIENT_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden",
  "Invalid media key",
  "Not found",
]);

function redact(text: string): string {
  return text
    .replace(SENSITIVE_PATTERN, "[redacted]")
    .replace(
      /(mongodb(\+srv)?:\/\/)([^@\s]+)@/gi,
      "$1[redacted]@",
    )
    .replace(
      /((?:password|secret|token|key)\s*[:=]\s*)([^\s,;]+)/gi,
      "$1[redacted]",
    );
}

/** Safe, generic message for API / action clients. */
export function publicErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (SAFE_CLIENT_MESSAGES.has(message)) return message;
  if (message.includes("E11000")) {
    return "A duplicate value already exists";
  }
  return fallback;
}

/** Log a sanitized one-line summary — never dump full error objects. */
export function logServerError(scope: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "Error";
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";
  const message = redact(raw).slice(0, 300);
  // Intentional structured server log (never dumps objects / secrets).
  console.error(`[${scope}] ${name}: ${message}`);
}

export function failAction(
  error: unknown,
  fallback: string,
): { ok: false; error: string } {
  logServerError("action", error);
  return { ok: false, error: publicErrorMessage(error, fallback) };
}

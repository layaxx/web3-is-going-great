const NonRetryableErrors = new Set([
  "error:bad-request",
  "error:blocked",
  "error:blocked-client-ip",
  "error:blocked-url",
  "error:invalid-url-syntax",
]);

export class WBMJobCompletionError extends Error {
  isRetryable: boolean;

  constructor(message: string) {
    super(message);
    this.name = "WBMJobCompletionError";
    this.isRetryable = !NonRetryableErrors.has(message);
  }
}

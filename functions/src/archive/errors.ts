export class WBMJobCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WBMJobCompletionError";
    // Object.setPrototypeOf(this, WBMJobCompletionError.prototype);
  }
}

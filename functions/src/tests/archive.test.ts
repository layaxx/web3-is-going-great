import { expect } from "chai";
import { WBMJobCompletionError } from "../archive/errors";

describe("WBMJobCompletionError", () => {
  it("should set error fields as expected", () => {
    const error = new WBMJobCompletionError("error:bad-gateway");
    expect(error.name).to.equal("WBMJobCompletionError");
    expect(error.message).to.equal("error:bad-gateway");
  });

  it("should properly identify non-retryable errors", () => {
    const retryableError = new WBMJobCompletionError("error:read-timeout");
    expect(retryableError.isRetryable).to.be.true;

    const nonRetryableError = new WBMJobCompletionError("error:blocked-url");
    expect(nonRetryableError.isRetryable).to.be.false;
  });
});

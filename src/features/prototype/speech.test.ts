import { describe, expect, it } from "vitest";
import { canFinishTake, isBlockingSpeechError, speechErrors } from "./speech";

describe("voice take rules", () => {
  it("treats permission and language errors as blocking", () => {
    for (const error of ["not-allowed", "service-not-allowed", "language-not-supported"]) {
      expect(isBlockingSpeechError(error)).toBe(true);
      expect(speechErrors[error]).toBeTruthy();
    }
    expect(isBlockingSpeechError("no-speech")).toBe(false);
    expect(isBlockingSpeechError(undefined)).toBe(false);
  });

  it("still finishes a take whose recorder runs after recognition stopped", () => {
    expect(canFinishTake(false, "recording")).toBe(true);
    expect(canFinishTake(true, "recording")).toBe(true);
    expect(canFinishTake(false, "inactive")).toBe(false);
    expect(canFinishTake(false, undefined)).toBe(false);
  });
});

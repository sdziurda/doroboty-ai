import { describe, expect, it } from "vitest";
import type { CaptureResult } from "posthog-js";
import { initAnalytics, scrubEvent, scrubMessage, track } from "./analytics";

describe("analytics privacy", () => {
  it("removes quoted text and caps the length of error messages", () => {
    expect(scrubMessage('Cannot read "Zrobiłam cały pipeline sama" of undefined')).toBe(
      'Cannot read "…" of undefined',
    );
    expect(scrubMessage("Błąd przy „moja odpowiedź” w polu")).toBe("Błąd przy „…” w polu");
    expect(scrubMessage("x".repeat(400))).toHaveLength(161);
  });

  it("scrubs exception events and leaves other events untouched", () => {
    const exception = {
      uuid: "1",
      event: "$exception",
      properties: {
        $exception_list: [{ type: "TypeError", value: "Bad 'transkrypcja kandydata' value" }],
      },
    } as unknown as CaptureResult;
    const scrubbed = scrubEvent(exception);
    expect(scrubbed?.properties.$exception_list).toEqual([
      { type: "TypeError", value: "Bad '…' value" },
    ]);
    const click = { uuid: "2", event: "$autocapture", properties: { a: 1 } } as CaptureResult;
    expect(scrubEvent(click)).toBe(click);
  });

  it("does nothing without a project key", () => {
    initAnalytics();
    expect(() =>
      track({ name: "application_submitted", props: { contribution_answers: 2 } }),
    ).not.toThrow();
  });
});

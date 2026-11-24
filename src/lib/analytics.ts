import posthog, { type CaptureResult } from "posthog-js";

/**
 * Optional product analytics (PostHog, EU region). Without VITE_POSTHOG_KEY nothing is
 * loaded or sent and every helper is a no-op.
 *
 * Privacy rules (see the in-app privacy page and docs/tasks/posthog-analytics.md):
 * - no cookies or localStorage: the anonymous id lives in memory until the page reloads,
 * - no session recording, heatmaps, dead clicks, surveys or input values,
 * - areas with transcripts, answers, role requirements and notes carry `ph-no-capture`,
 * - named events carry only counts and booleans, never free text,
 * - exception messages are trimmed of quoted text before they leave the browser.
 */

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com";

let enabled = false;

/** Class that excludes an element and its children from autocapture. */
export const NO_CAPTURE = "ph-no-capture";

/** Named events on the critical path. Properties must be numbers or booleans only. */
export type AnalyticsEvent =
  | { name: "role_requirements_saved"; props: { requirement_count: number } }
  | { name: "voice_answer_recorded"; props: { duration_seconds: number; transcript_ok: boolean } }
  | { name: "application_submitted"; props: { contribution_answers: number } }
  | { name: "contribution_summary_opened"; props: { contribution_answers: number } };

const MAX_MESSAGE_LENGTH = 160;

/** Remove quoted fragments (where user text usually ends up) and cap the length. */
export function scrubMessage(message: string): string {
  const withoutQuotes = message
    .replace(/"[^"]*"/g, '"…"')
    .replace(/'[^']*'/g, "'…'")
    .replace(/„[^”"]*[”"]/g, "„…”")
    .replace(/“[^”]*”/g, "“…”");
  return withoutQuotes.length > MAX_MESSAGE_LENGTH
    ? `${withoutQuotes.slice(0, MAX_MESSAGE_LENGTH)}…`
    : withoutQuotes;
}

type ExceptionEntry = { value?: unknown };

/** before_send hook: scrub exception messages. Exported for tests. */
export function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || event.event !== "$exception") return event;
  const properties = { ...event.properties };
  const list = properties.$exception_list as ExceptionEntry[] | undefined;
  if (Array.isArray(list)) {
    properties.$exception_list = list.map((entry) =>
      typeof entry.value === "string" ? { ...entry, value: scrubMessage(entry.value) } : entry,
    );
  }
  if (typeof properties.$exception_message === "string")
    properties.$exception_message = scrubMessage(properties.$exception_message);
  if (Array.isArray(properties.$exception_values))
    properties.$exception_values = (properties.$exception_values as unknown[]).map((value) =>
      typeof value === "string" ? scrubMessage(value) : value,
    );
  return { ...event, properties };
}

export function initAnalytics() {
  if (!key || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: host,
    // Hash routes (#/oferty, #/app/...) count as separate pageviews.
    capture_pageview: { path: true, hash: true },
    capture_pageleave: false,
    autocapture: {
      capture_copied_text: false,
      capture_value_css_selector_allowlist: [],
    },
    persistence: "memory",
    disable_session_recording: true,
    enable_heatmaps: false,
    capture_dead_clicks: false,
    capture_performance: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    mask_personal_data_properties: true,
    person_profiles: "identified_only",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    before_send: scrubEvent,
  });
  enabled = true;
}

export function track(event: AnalyticsEvent) {
  if (!enabled) return;
  posthog.capture(event.name, event.props);
}

/** Report an error caught by a React error boundary (message scrubbed in before_send). */
export function reportError(error: unknown) {
  if (!enabled) return;
  posthog.captureException(error);
}

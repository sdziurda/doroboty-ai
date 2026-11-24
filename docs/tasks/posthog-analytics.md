# PostHog analytics on the published prototype (AIPH3 Q4.3 Event Scout)

## Intent

See a pageview and a button click from the production URL in PostHog (Activity → Live), with autocapture on, while keeping candidate answers, transcripts, role requirements and notes out of analytics. Closes the "error observability" item of the production-readiness report.

## Decisions

- PostHog Cloud **EU** (`https://eu.i.posthog.com`), project key only from `VITE_POSTHOG_KEY` (Vercel environment variable / local `.env.local`, both outside Git). No key → no SDK init, no requests.
- `persistence: "memory"`: no cookies or localStorage, so no consent banner; trade-off: every reload is a new anonymous visitor.
- Pageviews on hash-route changes: `capture_pageview: { path: true, hash: true }`.
- Autocapture on (quest requirement) for clicks/submits/changes; input values never captured (`capture_value_css_selector_allowlist: []`), no copied text.
- `ph-no-capture` on: role requirements editor, application form (incl. Moja część and voice answers), application record (answer, CV, Moja część, timeline, recruiting note), employer candidate list.
- Off: session recording, heatmaps, dead clicks, web vitals, surveys, product tours, conversations, pageleave.
- Named events (numbers/booleans only): `role_requirements_saved`, `voice_answer_recorded`, `application_submitted`, `contribution_summary_opened`.
- Error tracking: unhandled errors/rejections and React error boundary; `before_send` replaces quoted fragments in exception messages and caps them at 160 characters. Console errors not captured.
- No PostHog setup wizard or GitHub integration (public repository; manual, reviewed config instead).

## Acceptance criteria

- Without a key the app behaves as before (unit test + local run).
- With a key: `$pageview` on load and on hash navigation, `$autocapture` on a public button (e.g. "Zobacz oferty"), no `$autocapture` from the no-capture areas, named events fire with numeric properties only.
- Privacy page (PUB-09) and FEATURES.md (SYS-03) updated.
- Production check by the participant in Activity → Live; only verified facts go into docs/production-readiness.html.

## Verification log

See the bottom of this file (filled in as checks actually run).

### 2026-11-24 local (dev server, real EU project key from `.env.local`, `?__posthog_debug=true`)

- Load `#/` → `$pageview`; click "Zobacz oferty" → `$autocapture` + `$pageview` for `#/oferty` (hash route).
- Employer persona → `#/app/kandydaci`: click on candidate name in the list → only `$pageview`, no `$autocapture` (no-capture list).
- Click tab "Moja część" in the application record → no `$autocapture`; named event `contribution_summary_opened` sent.
- With a dummy key: SDK loads only from `eu.i.posthog.com` / `eu-assets.i.posthog.com`; memory persistence logged.
- Not checked locally: requirements editor and apply form clicks (same `ph-no-capture` mechanism), `role_requirements_saved`, `voice_answer_recorded`, `application_submitted`, error tracking in PostHog UI.
- `format:check`, `design-system:check`, `lint`, `typecheck`, `test` (41 passed), `verify:packet`, `build`: passed. `test:e2e` not run: Playwright Chromium is not installed on this machine. Bundle grew to ~1.04 MB (348 kB gzip) with posthog-js.

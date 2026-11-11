# Role requirements and candidate contribution ("Moja część")

## Intent

Test the participant's discovery decision (Supersprint cycle "2026-w2-ponowny-zakup", opportunity S1, idea "Rozmowa pod wymagania roli"): a recruiter without AI expertise wants to see what a candidate did personally in a similar project, not what their team did, before inviting them.

Three connected steps, all local and simulated:

1. **Employer — role requirements.** While writing a job, the employer names 2–5 concrete requirements ("what should this person be able to do in the first months?"). A simulated helper suggests example requirements for the selected function; the employer edits and approves them. A simulated helper turns each requirement into one question about the candidate's own part of a past project.
2. **Candidate — "Moja część".** When a job has requirements, the application form offers an optional "Moja część" section: one question per requirement. The candidate answers by typing or by browser dictation where the browser supports it. After each answer, a rule-based follow-up question asks about the missing part (own role, verification or rejected options), and the candidate answers it.
3. **Employer — summary by requirement.** The employer's application record gets a "Moja część" tab: per requirement, what the candidate showed (own-part sentences quoted from their answers), what they did not explain, and what to ask in the interview, next to the full answers. No score or ranking; the employer decides.

## Acceptance criteria

- An employer can add, edit and remove 2–5 requirements, generate questions, edit them and publish the job; requirements and questions survive reload and editing. Jobs without requirements behave exactly as before.
- On a job with requirements, a candidate can open "Moja część", answer every question and its follow-up, and submit. The section is optional; partial answers block submission with a clear message. Dictation is offered only when supported and is never required.
- Submitted contribution answers are part of the immutable application snapshot. The employer sees the "Moja część" tab with per-requirement summary and full answers; the candidate sees their own answers.
- All assistance is labelled as a simulation (templates and rules, no AI model, no network call). No score, ranking or automated decision is added.
- Existing version-1 saves and imports stay compatible (new fields optional). Draft answers for the section survive explicit draft save.
- The example scenario contains one BrightLabs job with requirements and Marek's submitted example application with contribution answers, so the employer path can be shown immediately.
- Poster People composition: existing Field, Button, Textarea, record-sheet and application-form recipes; desktop and mobile layouts; keyboard access and visible errors.
- FEATURES.md updated; unit tests for rules and model; browser journey for the full path. Run `npm run check` and record actual results.

## What the prototype should teach (observation that would change direction)

If recruiters cannot tell from the summary which candidate did the project personally (compared with the plain application text), or if candidates do not complete the section, the idea needs revision.

## Implementation and verification

- Domain: optional `roleRequirements` on jobs (2–5, requirement + question), optional `contribution` snapshot on applications and optional `contribution` on drafts. Version-1 storage key and existing saves/imports remain valid because all new fields are optional. Submit validates that every requirement has an answer (≥20 characters), a follow-up question and a follow-up answer (≥10 characters), and snapshots the requirement and question text.
- Simulation rules live in `src/features/prototype/contribution.ts`: template suggestions per job function, template questions, keyword rules for the follow-up (own part → verification → rejected options → reflection) and the employer summary (own-part quotes, gaps, two probes). No model, network call, score or ranking.
- UI: `RoleRequirementsEditor` in the job editor (EMP-11), `ContributionSection` with optional browser dictation on the application page (CAN-19), `ContributionRecord` as a "Moja część" record tab (EMP-12; candidate sees answers only). Existing Field/Textarea/Button, `prototype-panel`, `application-form-section` and `record-sheet` recipes; small additions in application.css and records.css.
- Example scenario: the BrightLabs AI Product Manager job has three requirements; Marek's example application has prepared answers that mix team-level descriptions with own steps.
- Browser check (built-in browser, dev server, 800px pane): employer saw Marek's summary tab; the job editor showed the three requirements with questions; as Anna, answered all three questions and follow-ups, submitted, and as Karolina saw the per-requirement summary of Anna's answers. The pane's screenshot capture was unreliable after scrolling, so content was verified through page text.
- `npm run check` on Windows/Node 24.18.0: formatting, design-system kit check (67 files), lint, types, 36 unit tests, baseline packet verification and production build passed. Browser journeys (`tests/e2e`, including the new `contribution.spec.ts`) did not run: Playwright Chromium is not installed on this machine (`browserType.launch: Executable doesn't exist`). Not installed automatically.
- Environment note: the clone was made with `core.autocrlf=true`, which broke the byte-exact kit and packet checks. Set `core.autocrlf=input` locally and re-checked out the affected files; no content changes.
- Known limitation found while testing: keyword rules accept a metric word as "verification" and any first-person sentence as an own part, so a weak own step can pass without gaps. This is what the planned test should expose (rules vs. a real model).

## Separate review

Reviewed the diff for schema compatibility, focus and error handling on incomplete sections, simulation labelling, absence of scores and private-text logging, and FEATURES.md consistency. Fixed one rule bug found in review/tests ("zespołem" was read as a first-person verb). No merge, publishing or human approval is claimed.

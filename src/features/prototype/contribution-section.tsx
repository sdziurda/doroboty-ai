import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MIN_CONTRIBUTION_ANSWER_LENGTH,
  MIN_FOLLOW_UP_ANSWER_LENGTH,
  followUpFor,
} from "./contribution";
import { DictationButton } from "./dictation-button";
import type { ContributionDraft } from "./model";

type Requirement = { id: string; requirement: string; question: string };

export function contributionComplete(entries: ContributionDraft[]) {
  return entries.every(
    (entry) =>
      entry.answer.trim().length >= MIN_CONTRIBUTION_ANSWER_LENGTH &&
      entry.followUpQuestion.trim().length > 0 &&
      entry.followUpAnswer.trim().length >= MIN_FOLLOW_UP_ANSWER_LENGTH,
  );
}

const appendText = (current: string, text: string) =>
  current.trim() ? `${current} ${text}` : text;

/** Candidate's optional "Moja część" answers for a job with role requirements. */
export function ContributionSection({
  requirements,
  value,
  onChange,
  disabled,
  showErrors,
}: {
  requirements: Requirement[];
  value: ContributionDraft[] | null;
  onChange: (next: ContributionDraft[] | null) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const update = (index: number, patch: Partial<ContributionDraft>) =>
    value && onChange(value.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  return (
    <section
      className="application-form-section contribution-section"
      aria-labelledby="contribution-title"
    >
      <h3 id="contribution-title">Moja część</h3>
      <p className="application-help">
        Rekruter przygotował {requirements.length} pytania o wymagania tej roli. Opowiedz, co w
        podobnym projekcie zrobiłaś lub zrobiłeś osobiście, a co zespół. Sekcja jest opcjonalna.
      </p>
      {!value ? (
        <div className="record-actions">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              onChange(
                requirements.map((requirement) => ({
                  requirementId: requirement.id,
                  answer: "",
                  followUpQuestion: "",
                  followUpAnswer: "",
                })),
              )
            }
          >
            Odpowiedz na pytania rekrutera
          </Button>
        </div>
      ) : (
        <>
          <ol className="contribution-list">
            {requirements.map((requirement, index) => {
              const entry = value[index];
              if (!entry) return null;
              const answerReady = entry.answer.trim().length >= MIN_CONTRIBUTION_ANSWER_LENGTH;
              const incomplete =
                showErrors &&
                !(
                  answerReady &&
                  entry.followUpQuestion &&
                  entry.followUpAnswer.trim().length >= MIN_FOLLOW_UP_ANSWER_LENGTH
                );
              const answerId = `contribution-answer-${index}`;
              const followId = `contribution-follow-${index}`;
              return (
                <li key={requirement.id} className="contribution-item">
                  <p className="contribution-question" id={`${answerId}-question`}>
                    <span className="contribution-index">Pytanie {index + 1}.</span>{" "}
                    {requirement.question}
                  </p>
                  <label className="field" htmlFor={answerId}>
                    <span>Twoja odpowiedź</span>
                  </label>
                  <Textarea
                    id={answerId}
                    rows={4}
                    maxLength={4000}
                    disabled={disabled}
                    aria-describedby={`${answerId}-question`}
                    aria-invalid={(incomplete && !answerReady) || undefined}
                    value={entry.answer}
                    onChange={(e) => update(index, { answer: e.target.value })}
                  />
                  <div className="contribution-tools">
                    <DictationButton
                      disabled={disabled}
                      label={`odpowiedź na pytanie ${index + 1}`}
                      onText={(text) =>
                        update(index, { answer: appendText(value[index].answer, text) })
                      }
                    />
                    {!entry.followUpQuestion && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={disabled || !answerReady}
                        onClick={() =>
                          update(index, { followUpQuestion: followUpFor(entry.answer) })
                        }
                      >
                        Dalej: dopytanie
                      </Button>
                    )}
                  </div>
                  {!entry.followUpQuestion && !answerReady && (
                    <p className="application-help">
                      Minimum {MIN_CONTRIBUTION_ANSWER_LENGTH} znaków, potem pojawi się dopytanie.
                    </p>
                  )}
                  {entry.followUpQuestion && (
                    <div className="contribution-followup">
                      <p className="contribution-question" id={`${followId}-question`}>
                        <span className="contribution-index">Dopytanie (symulacja AI).</span>{" "}
                        {entry.followUpQuestion}
                      </p>
                      <label className="field" htmlFor={followId}>
                        <span>Odpowiedź na dopytanie</span>
                      </label>
                      <Textarea
                        id={followId}
                        rows={3}
                        maxLength={4000}
                        disabled={disabled}
                        aria-describedby={`${followId}-question`}
                        aria-invalid={incomplete || undefined}
                        value={entry.followUpAnswer}
                        onChange={(e) => update(index, { followUpAnswer: e.target.value })}
                      />
                      <div className="contribution-tools">
                        <DictationButton
                          disabled={disabled}
                          label={`odpowiedź na dopytanie ${index + 1}`}
                          onText={(text) =>
                            update(index, {
                              followUpAnswer: appendText(value[index].followUpAnswer, text),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                  {incomplete && (
                    <p role="alert" className="error-message">
                      Odpowiedz na pytanie {index + 1} i dopytanie albo usuń odpowiedzi z sekcji.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="application-help">
            Dopytania wybierają proste reguły na podstawie Twojej odpowiedzi (symulacja AI, bez
            modelu). Dyktowanie korzysta z rozpoznawania mowy przeglądarki, które w Chrome może
            przesyłać dźwięk do usługi Google. Używaj tylko przykładowych danych.
          </p>
          <div className="record-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Usuń odpowiedzi z sekcji „Moja część”
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

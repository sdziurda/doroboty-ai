import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MAX_RECORDING_SECONDS,
  MIN_CONTRIBUTION_ANSWER_LENGTH,
  MIN_FOLLOW_UP_ANSWER_LENGTH,
  followUpFor,
} from "./contribution";
import { deleteClip } from "./audio-store";
import type { ContributionDraft } from "./model";
import { VoiceAnswer, recordingSupported } from "./voice-answer";

type Requirement = { id: string; requirement: string; question: string };

const answerReady = (entry: ContributionDraft) =>
  !!entry.answerAudioId && entry.answer.trim().length >= MIN_CONTRIBUTION_ANSWER_LENGTH;
const followUpReady = (entry: ContributionDraft) =>
  !!entry.followUpAudioId && entry.followUpAnswer.trim().length >= MIN_FOLLOW_UP_ANSWER_LENGTH;

export function contributionComplete(entries: ContributionDraft[]) {
  return entries.every(
    (entry) => answerReady(entry) && !!entry.followUpQuestion && followUpReady(entry),
  );
}

/** Id of the first recording control that still needs an answer, for focus on submit. */
export function firstIncompleteControl(entries: ContributionDraft[]) {
  const index = entries.findIndex((entry) => !contributionComplete([entry]));
  if (index < 0) return null;
  const entry = entries[index];
  return answerReady(entry) && entry.followUpQuestion
    ? `contribution-follow-${index}`
    : `contribution-answer-${index}`;
}

const minutes = MAX_RECORDING_SECONDS / 60;

/** Candidate's optional, voice-only "Moja część" answers for a job with role requirements. */
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
  const supported = recordingSupported();
  // Answers are one-take: after removing the section it cannot be recorded again here.
  const [removed, setRemoved] = useState(false);
  const update = (index: number, patch: Partial<ContributionDraft>) =>
    value && onChange(value.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  return (
    <section
      className="application-form-section contribution-section"
      aria-labelledby="contribution-title"
    >
      <h3 id="contribution-title">Moja część</h3>
      <p className="application-help">
        Rekruter przygotował {requirements.length} pytania o wymagania tej roli. Odpowiadasz
        wyłącznie głosowo, w jednym podejściu: na każde pytanie i dopytanie masz do {minutes} minut
        nagrania, bez poprawiania. Opowiedz, co w podobnym projekcie zrobiłaś lub zrobiłeś
        osobiście, a co zespół. Rekruter zobaczy nagranie, jego zapis i podsumowanie. Sekcja jest
        opcjonalna.
      </p>
      {!supported && (
        <p className="prototype-notice">
          Ta przeglądarka nie obsługuje nagrywania z automatycznym zapisem. Otwórz prototyp w
          Chrome, aby odpowiedzieć w tej sekcji.
        </p>
      )}
      {removed && !value ? (
        <p className="application-help">
          Odpowiedzi z sekcji „Moja część” zostały usunięte. W tej aplikacji nie można nagrać ich
          ponownie.
        </p>
      ) : !value ? (
        <div className="record-actions">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !supported}
            onClick={() =>
              onChange(
                requirements.map((requirement) => ({
                  requirementId: requirement.id,
                  answer: "",
                  followUpQuestion: "",
                  followUpAnswer: "",
                  answerAudioId: "",
                  followUpAudioId: "",
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
              const ready = answerReady(entry);
              const incomplete = showErrors && !contributionComplete([entry]);
              const answerId = `contribution-answer-${index}`;
              const followId = `contribution-follow-${index}`;
              return (
                <li key={requirement.id} className="contribution-item">
                  <p className="contribution-question" id={`${answerId}-question`}>
                    <span className="contribution-index">Pytanie {index + 1}.</span>{" "}
                    {requirement.question}
                  </p>
                  <VoiceAnswer
                    id={answerId}
                    label={`odpowiedź na pytanie ${index + 1}`}
                    minLength={MIN_CONTRIBUTION_ANSWER_LENGTH}
                    describedBy={`${answerId}-question`}
                    disabled={disabled}
                    invalid={incomplete && !ready}
                    value={{ audioId: entry.answerAudioId, transcript: entry.answer }}
                    onChange={({ audioId, transcript }) => {
                      const followUpQuestion =
                        transcript.trim().length >= MIN_CONTRIBUTION_ANSWER_LENGTH
                          ? followUpFor(transcript)
                          : "";
                      // A different follow-up question invalidates the earlier follow-up answer.
                      const changed = followUpQuestion !== entry.followUpQuestion;
                      if (changed && entry.followUpAudioId)
                        void deleteClip(entry.followUpAudioId).catch(() => {});
                      update(index, {
                        answerAudioId: audioId,
                        answer: transcript,
                        followUpQuestion,
                        ...(changed ? { followUpAudioId: "", followUpAnswer: "" } : {}),
                      });
                    }}
                  />
                  {entry.answerAudioId && !ready && (
                    <p className="application-help">
                      Zapis jest za krótki (minimum {MIN_CONTRIBUTION_ANSWER_LENGTH} znaków). Nagraj
                      dłuższą odpowiedź, wtedy pojawi się dopytanie.
                    </p>
                  )}
                  {ready && entry.followUpQuestion && (
                    <div className="contribution-followup">
                      <p className="contribution-question" id={`${followId}-question`}>
                        <span className="contribution-index">Dopytanie (symulacja AI).</span>{" "}
                        {entry.followUpQuestion}
                      </p>
                      <VoiceAnswer
                        id={followId}
                        label={`odpowiedź na dopytanie ${index + 1}`}
                        minLength={MIN_FOLLOW_UP_ANSWER_LENGTH}
                        describedBy={`${followId}-question`}
                        disabled={disabled}
                        invalid={incomplete}
                        value={{ audioId: entry.followUpAudioId, transcript: entry.followUpAnswer }}
                        onChange={({ audioId, transcript }) =>
                          update(index, { followUpAudioId: audioId, followUpAnswer: transcript })
                        }
                      />
                    </div>
                  )}
                  {incomplete && (
                    <p role="alert" className="error-message">
                      Nagraj odpowiedź na pytanie {index + 1} i dopytanie albo usuń odpowiedzi z
                      sekcji.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="application-help">
            Zapis tworzy rozpoznawanie mowy przeglądarki, które w Chrome może przesyłać dźwięk do
            usługi Google. Dopytania wybierają proste reguły na podstawie zapisu (symulacja AI, bez
            modelu). Nagrania zostają w tej przeglądarce. Używaj tylko przykładowych danych.
          </p>
          <div className="record-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                for (const entry of value)
                  for (const clip of [entry.answerAudioId, entry.followUpAudioId])
                    if (clip) void deleteClip(clip).catch(() => {});
                setRemoved(true);
                onChange(null);
              }}
            >
              Usuń odpowiedzi z sekcji „Moja część”
            </Button>
            <span className="application-help">Usunięcia nie można cofnąć.</span>
          </div>
        </>
      )}
    </section>
  );
}

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { summarizeContribution, type ContributionEntry } from "./contribution";
import { ClipPlayer } from "./clip-player";

/** Submitted "Moja część" answers; employers also get the rule-based summary per requirement. */
export function ContributionRecord({
  entries,
  audience,
}: {
  entries: ContributionEntry[];
  audience: "candidate" | "employer";
}) {
  const employer = audience === "employer";
  const reported = useRef(false);
  useEffect(() => {
    if (!employer || reported.current) return;
    reported.current = true;
    track({
      name: "contribution_summary_opened",
      props: { contribution_answers: entries.length },
    });
  }, [employer, entries.length]);
  return (
    <>
      <h3>{employer ? "Moja część — zestawienie według wymagań" : "Twoje odpowiedzi"}</h3>
      {employer && (
        <p className="record-caption contribution-disclaimer">
          Kandydat odpowiadał głosowo. Masz nagranie, jego zapis (rozpoznawanie mowy przeglądarki) i
          podsumowanie AI. Podsumowanie to symulacja: powstało według prostych reguł z zapisu, bez
          modelu AI. To nie jest ocena ani ranking. Cytaty to słowa kandydata, decyzję podejmujesz
          Ty.
        </p>
      )}
      <ol className="contribution-record">
        {entries.map((entry, index) => {
          const summary = summarizeContribution(entry);
          return (
            <li key={entry.requirementId} className="contribution-record-item">
              <h4>
                Wymaganie {index + 1}: {entry.requirement}
              </h4>
              {employer && <p className="contribution-subhead">Podsumowanie AI (symulacja)</p>}
              {employer && (
                <dl className="contribution-summary">
                  <div>
                    <dt>Co pokazał(a)</dt>
                    <dd>
                      {summary.shown.length ? (
                        <ul>
                          {summary.shown.map((quote) => (
                            <li key={quote}>„{quote}”</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Brak zdań o własnej pracy.</p>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Czego nie wyjaśnił(a)</dt>
                    <dd>
                      {summary.gaps.length ? (
                        <ul>
                          {summary.gaps.map((gap) => (
                            <li key={gap}>{gap}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Reguły nie wykryły braków.</p>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>O co dopytać na rozmowie</dt>
                    <dd>
                      <ul>
                        {summary.probes.map((probe) => (
                          <li key={probe}>{probe}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
              )}
              <details className="contribution-answers" open={!employer}>
                <summary>{employer ? "Nagrania i zapis odpowiedzi" : "Nagrania i zapis"}</summary>
                {(
                  [
                    [entry.question, entry.answerAudioId, entry.answer, "odpowiedź"],
                    [
                      `Dopytanie: ${entry.followUpQuestion}`,
                      entry.followUpAudioId,
                      entry.followUpAnswer,
                      "odpowiedź na dopytanie",
                    ],
                  ] as const
                ).map(([question, audioId, transcript, kind]) => (
                  <div key={kind} className="contribution-recording">
                    <p className="contribution-question">{question}</p>
                    {audioId ? (
                      <ClipPlayer
                        audioId={audioId}
                        label={`Nagranie: ${kind}, wymaganie ${index + 1}`}
                      />
                    ) : (
                      <p className="record-caption">
                        Przykładowe dane: odpowiedź przygotowana tekstem, bez nagrania.
                      </p>
                    )}
                    <p>
                      <span className="contribution-index">Zapis:</span> {transcript}
                    </p>
                  </div>
                ))}
              </details>
            </li>
          );
        })}
      </ol>
    </>
  );
}

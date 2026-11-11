import { summarizeContribution, type ContributionEntry } from "./contribution";

/** Submitted "Moja część" answers; employers also get the rule-based summary per requirement. */
export function ContributionRecord({
  entries,
  audience,
}: {
  entries: ContributionEntry[];
  audience: "candidate" | "employer";
}) {
  const employer = audience === "employer";
  return (
    <>
      <h3>{employer ? "Moja część — zestawienie według wymagań" : "Twoje odpowiedzi"}</h3>
      {employer && (
        <p className="record-caption contribution-disclaimer">
          Symulacja AI: zestawienie powstało według prostych reguł z odpowiedzi kandydata, bez
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
                <summary>
                  {employer ? "Pełne odpowiedzi kandydata" : "Pytanie i odpowiedzi"}
                </summary>
                <p className="contribution-question">{entry.question}</p>
                <p>{entry.answer}</p>
                <p className="contribution-question">Dopytanie: {entry.followUpQuestion}</p>
                <p>{entry.followUpAnswer}</p>
              </details>
            </li>
          );
        })}
      </ol>
    </>
  );
}

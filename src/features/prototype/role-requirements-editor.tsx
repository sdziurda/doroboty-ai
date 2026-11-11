import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_REQUIREMENTS,
  MIN_REQUIREMENTS,
  isGeneralRequirement,
  questionForRequirement,
} from "./contribution";

export type RequirementDraft = { id: string; requirement: string; question: string };

/**
 * Employer step: name concrete requirements and turn them into questions for the
 * candidate's "Moja część" section. Suggestions and questions are templates.
 */
export function RoleRequirementsEditor({
  value,
  onChange,
  suggest,
}: {
  value: RequirementDraft[];
  onChange: (next: RequirementDraft[]) => void;
  suggest: () => string[];
}) {
  const update = (index: number, patch: Partial<RequirementDraft>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const add = (requirement = "") => ({ id: crypto.randomUUID(), requirement, question: "" });
  const canGenerate = value.some((item) => item.requirement.trim().length >= 10);
  return (
    <section className="prototype-panel requirements-editor" aria-labelledby="requirements-title">
      <h2 id="requirements-title">Wymagania roli</h2>
      <p className="requirements-intro">
        Co dokładnie ta osoba ma umieć zrobić w pierwszych miesiącach? Nazwij od {MIN_REQUIREMENTS}{" "}
        do {MAX_REQUIREMENTS} konkretnych wymagań. Kandydaci odpowiedzą na pytania o nie w sekcji
        „Moja część”, a Ty zobaczysz zestawienie według tych wymagań.
      </p>
      <p className="record-caption">
        Wymagania są opcjonalne. Podpowiedzi i pytania to symulacja AI: przygotowane szablony, bez
        modelu i bez wysyłania danych.
      </p>
      {value.length > 0 && (
        <ol className="requirements-list">
          {value.map((item, index) => {
            const general =
              item.requirement.trim().length > 0 && isGeneralRequirement(item.requirement);
            return (
              <li key={item.id} className="requirements-item">
                <label className="field">
                  <span>Wymaganie {index + 1}</span>
                  <Textarea
                    rows={2}
                    maxLength={300}
                    value={item.requirement}
                    aria-describedby={general ? `requirement-hint-${item.id}` : undefined}
                    onChange={(e) => update(index, { requirement: e.target.value, question: "" })}
                  />
                </label>
                {general && (
                  <p id={`requirement-hint-${item.id}`} className="requirements-hint">
                    To wymaganie jest ogólne. Dopisz, co dokładnie osoba ma zrobić i w jakiej
                    sytuacji.
                  </p>
                )}
                {item.question && (
                  <label className="field requirements-question">
                    <span>Pytanie do kandydata</span>
                    <Textarea
                      rows={3}
                      maxLength={600}
                      value={item.question}
                      onChange={(e) => update(index, { question: e.target.value })}
                    />
                  </label>
                )}
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    Usuń wymaganie {index + 1}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="record-actions">
        <Button
          type="button"
          variant="outline"
          disabled={value.length >= MAX_REQUIREMENTS}
          onClick={() => onChange([...value, add()])}
        >
          Dodaj wymaganie
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={value.length >= MAX_REQUIREMENTS}
          onClick={() => {
            const existing = new Set(value.map((item) => item.requirement.trim()));
            const fresh = suggest()
              .filter((requirement) => !existing.has(requirement))
              .slice(0, MAX_REQUIREMENTS - value.length);
            onChange([...value, ...fresh.map((requirement) => add(requirement))]);
          }}
        >
          Podpowiedz wymagania (symulacja AI)
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canGenerate}
          onClick={() =>
            onChange(
              value.map((item) =>
                item.requirement.trim().length >= 10
                  ? { ...item, question: questionForRequirement(item.requirement) }
                  : item,
              ),
            )
          }
        >
          Ułóż pytania do kandydatów (symulacja AI)
        </Button>
      </div>
    </section>
  );
}

/** Returns undefined when no requirements are set, otherwise a validation message or the list. */
export function finalizeRequirements(
  value: RequirementDraft[],
): { error: string } | { requirements: RequirementDraft[] | undefined } {
  const filled = value
    .map((item) => ({
      ...item,
      requirement: item.requirement.trim(),
      question: item.question.trim(),
    }))
    .filter((item) => item.requirement || item.question);
  if (!filled.length) return { requirements: undefined };
  if (filled.length < MIN_REQUIREMENTS || filled.length > MAX_REQUIREMENTS)
    return {
      error: `Podaj od ${MIN_REQUIREMENTS} do ${MAX_REQUIREMENTS} wymagań albo usuń wszystkie.`,
    };
  if (filled.some((item) => item.requirement.length < 10))
    return { error: "Każde wymaganie musi mieć co najmniej 10 znaków." };
  if (filled.some((item) => item.question.length < 10))
    return { error: "Ułóż pytania do kandydatów dla wszystkich wymagań." };
  return { requirements: filled };
}

/**
 * Simulated assistance for role requirements and the candidate's own contribution
 * ("Moja część"). Everything here is deterministic templates and keyword rules,
 * not an AI model. UI copy must label it as a simulation.
 */

export const MIN_REQUIREMENTS = 2;
export const MAX_REQUIREMENTS = 5;
export const MIN_CONTRIBUTION_ANSWER_LENGTH = 20;
export const MIN_FOLLOW_UP_ANSWER_LENGTH = 10;
/** Each recorded answer (question or follow-up) is one take of at most 2 minutes. */
export const MAX_RECORDING_SECONDS = 120;

export type JobFunction =
  "product" | "engineering" | "data" | "design" | "marketing" | "operations";

export const requirementSuggestions: Record<JobFunction, string[]> = {
  product: [
    "Samodzielnie zaplanować i przeprowadzić pilotaż funkcji AI z użytkownikami",
    "Na podstawie danych i wywiadów zdecydować, co wchodzi do zakresu, a co nie",
    "Ustalić, jak zmierzymy, że funkcja AI działa, i sprawdzić to po wdrożeniu",
  ],
  engineering: [
    "Zbudować i utrzymać działającą integrację z modelem AI w produkcie",
    "Przygotować zestaw testów, który pokaże, kiedy model się myli",
    "Ograniczyć koszt i czas odpowiedzi modelu bez utraty jakości",
  ],
  data: [
    "Przygotować dane i sprawdzić ich jakość przed użyciem w modelu",
    "Zaprojektować miarę, która pokaże, czy model pomaga użytkownikom",
    "Wyjaśnić wynik analizy osobie bez wiedzy technicznej",
  ],
  design: [
    "Zaprojektować ekran, na którym użytkownik rozumie odpowiedź AI i może ją poprawić",
    "Przetestować prototyp z użytkownikami i zmienić go po wynikach",
    "Opisać zasady, kiedy AI działa samo, a kiedy pyta człowieka",
  ],
  marketing: [
    "Przeprowadzić kampanię z treściami tworzonymi z AI i sprawdzić w nich fakty",
    "Zmierzyć, które działania przyniosły klientów",
    "Ustalić zasady jakości i tonu dla treści tworzonych z AI",
  ],
  operations: [
    "Zautomatyzować powtarzalny proces z pomocą AI i utrzymać go w działaniu",
    "Sprawdzić, gdzie automatyzacja się myli, i ustawić kontrolę człowieka",
    "Policzyć, ile czasu lub pieniędzy zaoszczędziła automatyzacja",
  ],
};

/** A requirement is treated as too general when it is very short. */
export function isGeneralRequirement(requirement: string) {
  return words(requirement).length < 5;
}

export function questionForRequirement(requirement: string) {
  const clean = requirement.trim().replace(/[.!?]+$/, "");
  return `Wymaganie: „${clean}”. Opowiedz o projekcie, w którym było to potrzebne. Co zrobiłaś lub zrobiłeś w nim osobiście, a co zespół?`;
}

function words(value: string) {
  return value
    .toLocaleLowerCase("pl")
    .split(/[^\p{L}\p{N}%]+/u)
    .filter(Boolean);
}

const ownWords = new Set([
  "ja",
  "sam",
  "sama",
  "samodzielnie",
  "osobiście",
  "mój",
  "moja",
  "moje",
  "mojej",
  "moim",
  "mojego",
  "mnie",
]);
const beingForms = new Set(["byłem", "byłam"]);
const teamWords = new Set([
  "zespół",
  "zespole",
  "zespołem",
  "zespołu",
  "my",
  "nasz",
  "nasza",
  "nasze",
  "naszym",
  "naszej",
  "wspólnie",
]);
const verificationPrefixes = [
  "sprawdz",
  "sprawdzi",
  "test",
  "mierz",
  "zmierz",
  "porówn",
  "wynik",
  "metryk",
  "weryfik",
  "walid",
  "ewalu",
];
const rejectionPrefixes = ["odrzuc", "odrzuci", "zrezygnow", "porzuc", "zamiast", "zmieni"];

function hasOwnPart(value: string) {
  return words(value).some(
    // First-person past verbs end in -łem/-łam; exclude "byłem" and nouns such as "zespołem".
    (word) =>
      ownWords.has(word) ||
      (/(łem|łam)$/.test(word) && !beingForms.has(word) && !teamWords.has(word)),
  );
}
function hasTeamPart(value: string) {
  return words(value).some((word) => teamWords.has(word) || /(liśmy|łyśmy)$/.test(word));
}
function hasVerification(value: string) {
  return (
    /\d/.test(value) ||
    words(value).some((word) => verificationPrefixes.some((prefix) => word.startsWith(prefix)))
  );
}
function hasRejection(value: string) {
  return words(value).some((word) => rejectionPrefixes.some((prefix) => word.startsWith(prefix)));
}

export const followUpQuestions = {
  own: "Która część tego projektu była Twoja? Nazwij jeden krok, który wykonałaś lub wykonałeś osobiście.",
  verification: "Skąd wiesz, że wynik był dobry? Jak to sprawdziłaś lub sprawdziłeś?",
  rejection: "Co odrzuciłaś lub odrzuciłeś po drodze i dlaczego?",
  reflection: "Co zrobiłabyś lub zrobiłbyś inaczej, gdybyś zaczynała lub zaczynał jeszcze raz?",
} as const;

/** Picks one follow-up about the most important missing element of the answer. */
export function followUpFor(answer: string) {
  if (!hasOwnPart(answer)) return followUpQuestions.own;
  if (!hasVerification(answer)) return followUpQuestions.verification;
  if (!hasRejection(answer)) return followUpQuestions.rejection;
  return followUpQuestions.reflection;
}

export type ContributionEntry = {
  requirementId: string;
  requirement: string;
  question: string;
  answer: string;
  followUpQuestion: string;
  followUpAnswer: string;
  answerAudioId?: string;
  followUpAudioId?: string;
};

export type ContributionSummary = {
  requirementId: string;
  requirement: string;
  shown: string[];
  gaps: string[];
  probes: string[];
};

function sentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

const probeOwn = "Który fragment tego projektu wykonała Pani lub wykonał Pan osobiście?";
const probeVerification = "Jak sprawdziła Pani lub sprawdził Pan, że rozwiązanie działa?";
const probeDecision =
  "Jaką decyzję w tym projekcie podjęła Pani lub podjął Pan samodzielnie i co było alternatywą?";
const probeLimits = "Czego nie udało się zrobić i co było ograniczeniem?";

/** Rule-based summary for the employer. Quotes only the candidate's own words. */
export function summarizeContribution(entry: ContributionEntry): ContributionSummary {
  const text = `${entry.answer}\n${entry.followUpAnswer}`;
  const shown = sentences(text)
    .filter((sentence) => hasOwnPart(sentence))
    .slice(0, 2)
    .map((sentence) => (sentence.length > 240 ? `${sentence.slice(0, 237)}…` : sentence));
  const gaps: string[] = [];
  const probes: string[] = [];
  if (!shown.length) {
    gaps.push(
      hasTeamPart(text)
        ? "Opisuje pracę zespołu, ale nie mówi, co zrobił(a) osobiście."
        : "Nie mówi, co zrobił(a) osobiście.",
    );
    probes.push(probeOwn);
  } else if (!hasOwnPart(entry.answer)) {
    gaps.push("Własną część opisał(a) dopiero po dopytaniu; pierwsza odpowiedź dotyczy zespołu.");
    probes.push(probeOwn);
  }
  if (!hasVerification(text)) {
    gaps.push("Nie wyjaśnia, jak sprawdził(a), że wynik był dobry.");
    probes.push(probeVerification);
  }
  if (entry.followUpAnswer.trim().length < 40)
    gaps.push("Odpowiedź na dopytanie jest bardzo krótka.");
  for (const probe of [probeDecision, probeLimits]) if (probes.length < 2) probes.push(probe);
  return {
    requirementId: entry.requirementId,
    requirement: entry.requirement,
    shown,
    gaps,
    probes,
  };
}

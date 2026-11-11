import { describe, expect, it } from "vitest";
import {
  followUpFor,
  followUpQuestions,
  isGeneralRequirement,
  questionForRequirement,
  summarizeContribution,
} from "./contribution";
import { initialState, transition, type State } from "./model";

const time = "2026-11-11T10:00:00.000Z";
const entry = {
  requirementId: "requirement-pilot",
  requirement: "Samodzielnie zaplanować i przeprowadzić pilotaż funkcji AI z użytkownikami",
  question: "Pytanie o pilotaż",
};

describe("simulated contribution rules", () => {
  it("asks for the own part when the answer only describes the team", () => {
    expect(followUpFor("Nasz zespół wdrożył asystenta i wspólnie ustaliliśmy zakres.")).toBe(
      followUpQuestions.own,
    );
  });
  it("does not treat 'byłem w zespole' as an own contribution", () => {
    expect(followUpFor("Byłem w zespole odpowiedzialnym za wdrożenie asystenta.")).toBe(
      followUpQuestions.own,
    );
  });
  it("then asks about verification and rejected options", () => {
    expect(followUpFor("Sama przygotowałam scenariusze rozmów z konsultantami.")).toBe(
      followUpQuestions.verification,
    );
    expect(followUpFor("Sama porównałam 200 zgłoszeń przed i po zmianie.")).toBe(
      followUpQuestions.rejection,
    );
    expect(
      followUpFor("Sama porównałam 200 zgłoszeń i odrzuciłam mierzenie czasu odpowiedzi."),
    ).toBe(followUpQuestions.reflection);
  });
  it("flags general requirements and builds a question from the requirement", () => {
    expect(isGeneralRequirement("Znajomość AI")).toBe(true);
    expect(isGeneralRequirement(entry.requirement)).toBe(false);
    expect(questionForRequirement(`${entry.requirement}.`)).toContain(`„${entry.requirement}”`);
  });
  it("quotes own sentences and lists gaps without scoring", () => {
    const team = summarizeContribution({
      ...entry,
      answer: "Zakres ustalaliśmy wspólnie z zespołem na warsztatach.",
      followUpQuestion: followUpQuestions.own,
      followUpAnswer: "Prowadziłem warsztaty.",
    });
    expect(team.shown).toEqual(["Prowadziłem warsztaty."]);
    expect(team.gaps[0]).toContain("dopiero po dopytaniu");
    expect(team.gaps).toContain("Nie wyjaśnia, jak sprawdził(a), że wynik był dobry.");
    expect(team.gaps).toContain("Odpowiedź na dopytanie jest bardzo krótka.");
    expect(team.probes).toHaveLength(2);

    const vague = summarizeContribution({
      ...entry,
      answer: "Nasz zespół uruchomił pilotaż w dziale obsługi klienta.",
      followUpQuestion: followUpQuestions.own,
      followUpAnswer: "Projekt był ciekawy i dużo się nauczyliśmy.",
    });
    expect(vague.shown).toEqual([]);
    expect(vague.gaps[0]).toContain("Opisuje pracę zespołu");
  });
});

function as(state: State, id: string) {
  return transition(state, { type: "select_person", id });
}

describe("role requirements and contribution in the scenario", () => {
  it("ships an example job with requirements and Marek's contribution", () => {
    const s = initialState();
    expect(s.jobs[0].roleRequirements).toHaveLength(3);
    const example = s.applications.find((x) => x.id === "application-example")!;
    expect(example.contribution).toHaveLength(3);
    expect(example.contribution?.[0].requirement).toBe(s.jobs[0].roleRequirements?.[0].requirement);
  });
  it("snapshots complete contribution answers on submit", () => {
    const s = as(initialState(), "candidate-anna");
    const job = s.jobs[0];
    const contribution = job.roleRequirements!.map((requirement) => ({
      requirementId: requirement.id,
      answer: "Sama przygotowałam plan pilotażu i porównałam wyniki.",
      followUpQuestion: followUpQuestions.rejection,
      followUpAnswer: "Odrzuciłam mierzenie samego czasu odpowiedzi.",
      answerAudioId: `clip-${requirement.id}-answer`,
      followUpAudioId: `clip-${requirement.id}-follow`,
    }));
    const next = transition(
      s,
      {
        type: "submit",
        jobId: job.id,
        notes: "",
        generated: "",
        answer: "Approved application with sufficient context.",
        consent: true,
        contribution,
      },
      time,
      "application-anna",
    );
    const app = next.applications.find((x) => x.id === "application-anna")!;
    expect(app.contribution?.[0].answerAudioId).toBe(`clip-${job.roleRequirements![0].id}-answer`);
    const withoutAudio = contribution.map((entry) => ({ ...entry, followUpAudioId: "" }));
    expect(() =>
      transition(
        s,
        {
          type: "submit",
          jobId: job.id,
          notes: "",
          generated: "",
          answer: "Approved application with sufficient context.",
          consent: true,
          contribution: withoutAudio,
        },
        time,
      ),
    ).toThrow("Nagraj");
    expect(app.contribution?.map((x) => x.question)).toEqual(
      job.roleRequirements!.map((x) => x.question),
    );
  });
  it("rejects incomplete contribution and keeps applications without it valid", () => {
    const s = as(initialState(), "candidate-anna");
    const job = s.jobs[0];
    const base = {
      type: "submit" as const,
      jobId: job.id,
      notes: "",
      generated: "",
      answer: "Approved application with sufficient context.",
      consent: true,
    };
    const partial = [
      {
        requirementId: job.roleRequirements![0].id,
        answer: "Sama przygotowałam plan pilotażu.",
        followUpQuestion: followUpQuestions.verification,
        followUpAnswer: "",
        answerAudioId: "clip-partial",
        followUpAudioId: "",
      },
    ];
    expect(() => transition(s, { ...base, contribution: partial }, time)).toThrow("Moja część");
    const plain = transition(s, base, time, "application-plain");
    expect(plain.applications.find((x) => x.id === "application-plain")?.contribution).toBe(
      undefined,
    );
  });
  it("keeps draft contribution answers", () => {
    const s = as(initialState(), "candidate-anna");
    const job = s.jobs[0];
    const contribution = [
      {
        requirementId: job.roleRequirements![0].id,
        answer: "Szkic",
        followUpQuestion: "",
        followUpAnswer: "",
        answerAudioId: "clip-draft",
        followUpAudioId: "",
      },
    ];
    const next = transition(s, {
      type: "draft",
      jobId: job.id,
      notes: "",
      generated: "",
      answer: "",
      contribution,
    });
    expect(next.drafts[0].contribution).toEqual(contribution);
  });
});

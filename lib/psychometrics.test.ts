import { describe, expect, it } from "vitest";
import { DEMO_QUESTIONS } from "./questions";
import {
  advancePacingProfile,
  brierScore,
  calibratedSeconds,
  classifyOptionSwitch,
  fitVanDerLindenSpeed,
  pacedSeconds,
  pressureAdjustedTheta,
  responseTimeLogDensity,
  SATO_HASTE_LAMBDA,
  satoPenalty,
  threePL,
  timerPressureAbility
} from "./psychometrics";
import type { Attempt, Question } from "./types";

function attempt(question: Question, overrides: Partial<Attempt> = {}): Attempt {
  return {
    questionId: question.id,
    confidence: 0.7,
    confidenceReported: true,
    responseSeconds: 120,
    extensionsSeconds: 0,
    timeDeficits: [],
    status: "answered",
    ...overrides
  };
}

describe("3PL and calibrated CBT timing", () => {
  it("keeps the 3PL probability bounded by its pseudo-guessing floor", () => {
    const question = DEMO_QUESTIONS[0];
    expect(threePL(-3, question.psychometric.a, question.psychometric.b, question.psychometric.c))
      .toBeGreaterThanOrEqual(question.psychometric.c);
    expect(threePL(3, question.psychometric.a, question.psychometric.b, question.psychometric.c)).toBeLessThan(1);
  });

  it("derives every active timer budget directly from exp(beta_i)", () => {
    for (const question of DEMO_QUESTIONS) {
      expect(calibratedSeconds(question)).toBe(Math.round(Math.exp(question.psychometric.beta)));
      expect(calibratedSeconds(question)).toBeGreaterThanOrEqual(30);
    }
  });
});

describe("adaptive pacing and answer-change signals", () => {
  it("widens a first-exposure timer without changing the calibrated item time", () => {
    const question = DEMO_QUESTIONS[0];
    expect(pacedSeconds(question, "first-exposure")).toBe(
      Math.round(calibratedSeconds(question) * 1.6)
    );
    expect(pacedSeconds(question, "exam")).toBe(calibratedSeconds(question));
  });

  it("steps a steady learner down from first exposure to guided practice after two qualifying drills", () => {
    const questions = DEMO_QUESTIONS.slice(0, 2);
    const attempts = questions.map((question) => attempt(question, {
      selectedOptionId: question.correctOptionId,
      responseSeconds: pacedSeconds(question, "first-exposure") - 5
    }));
    const next = advancePacingProfile(
      { tier: "first-exposure", steadyDrills: 1 },
      questions,
      attempts
    );
    expect(next).toEqual({ tier: "guided", steadyDrills: 0 });
  });

  it("treats an answer change as an observable signal rather than claiming to know intent", () => {
    const question = DEMO_QUESTIONS[0];
    const analysis = classifyOptionSwitch(attempt(question, {
      selectionEvents: [
        { toOptionId: "A", elapsedSeconds: 12, remainingSeconds: 180, allocatedBudgetSeconds: 200, recordedAt: "2026-01-01T00:00:00.000Z" },
        { fromOptionId: "A", toOptionId: "B", elapsedSeconds: 48, remainingSeconds: 144, allocatedBudgetSeconds: 200, recordedAt: "2026-01-01T00:00:36.000Z" }
      ]
    }));
    expect(analysis?.kind).toBe("evidence-led");
    expect(analysis?.detail).toContain("can confirm");
  });

  it("flags only the final response-window switch as late/reactive", () => {
    const question = DEMO_QUESTIONS[0];
    const analysis = classifyOptionSwitch(attempt(question, {
      selectionEvents: [
        { toOptionId: "A", elapsedSeconds: 12, remainingSeconds: 180, allocatedBudgetSeconds: 200, recordedAt: "2026-01-01T00:00:00.000Z" },
        { fromOptionId: "A", toOptionId: "B", elapsedSeconds: 191, remainingSeconds: 9, allocatedBudgetSeconds: 200, recordedAt: "2026-01-01T00:03:11.000Z" }
      ]
    }));
    expect(analysis?.kind).toBe("late-reactive");
  });
});

describe("Van der Linden hierarchical log-time model", () => {
  it("recovers the precision-weighted tau MLE when observations lie at their model means", () => {
    const trueTau = 0.42;
    const questions = DEMO_QUESTIONS.slice(0, 2);
    const attempts = questions.map((question) => attempt(question, {
      responseSeconds: Math.exp(question.psychometric.beta - trueTau)
    }));

    const fit = fitVanDerLindenSpeed(questions, attempts);
    expect(fit.tau).toBeCloseTo(trueTau, 10);
    expect(fit.standardError).toBeCloseTo(
      Math.sqrt(1 / questions.reduce((sum, question) => sum + question.psychometric.alpha ** 2, 0)),
      10
    );
    expect(fit.observations).toBe(2);
  });

  it("uses alpha_i as the normal-model precision in the log-density", () => {
    const question = DEMO_QUESTIONS[0];
    const tau = 0.2;
    const atMean = Math.exp(question.psychometric.beta - tau);
    const densityAtMean = responseTimeLogDensity(question, atMean, tau);
    const offMean = responseTimeLogDensity(question, atMean * 3, tau);
    expect(densityAtMean).toBeGreaterThan(offMean);
  });

  it("implements the requested timer-pressure degradation exactly", () => {
    const question = DEMO_QUESTIONS[0];
    const theta = 1.1;
    const t = calibratedSeconds(question) / 2;
    const beta_i = Math.exp(question.psychometric.beta);
    const expected = theta - SATO_HASTE_LAMBDA * Math.max(0, beta_i / t - 1);
    expect(timerPressureAbility(theta, question, t)).toBeCloseTo(expected, 12);
  });

  it("includes a separate grace-buffer deficit in pressure-adjusted ability", () => {
    const question = DEMO_QUESTIONS[0];
    const baseline = pressureAdjustedTheta(1, question, calibratedSeconds(question));
    const withDeficit = pressureAdjustedTheta(1, question, calibratedSeconds(question), 120);
    expect(withDeficit).toBeLessThan(baseline);
    expect(satoPenalty(question, calibratedSeconds(question), 120).timeDeficit).toBeGreaterThan(0);
  });
});

describe("metacognitive confidence", () => {
  it("does not score a default slider position until confidence is explicitly reported", () => {
    const question = DEMO_QUESTIONS[0];
    const unreported = attempt(question, {
      selectedOptionId: question.correctOptionId,
      confidence: 0.9,
      confidenceReported: false
    });
    const reported = { ...unreported, confidenceReported: true };

    expect(brierScore([unreported], [question])).toBe(0);
    expect(brierScore([reported], [question])).toBeCloseTo(0.01, 10);
  });
});

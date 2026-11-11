import type { Attempt, Question } from "./types";

const D = 1.702;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Birnbaum 3PL probability on the normal metric. */
export function threePL(theta: number, a: number, b: number, c: number): number {
  const z = clamp(-D * a * (theta - b), -35, 35);
  return c + (1 - c) / (1 + Math.exp(z));
}

/** Bounded Newton–Raphson maximum-likelihood estimate for a completed item set. */
export function estimateTheta(
  questions: Question[],
  attempts: Attempt[],
  startTheta = 0
): number {
  const usable = attempts.filter((a) => a.selectedOptionId);
  if (!usable.length) return startTheta;

  const ll = (theta: number) => usable.reduce((sum, attempt) => {
    const q = questions.find((item) => item.id === attempt.questionId)!;
    const p = clamp(threePL(theta, q.psychometric.a, q.psychometric.b, q.psychometric.c), 1e-7, 1 - 1e-7);
    const correct = attempt.selectedOptionId === q.correctOptionId ? 1 : 0;
    return sum + correct * Math.log(p) + (1 - correct) * Math.log(1 - p);
  }, 0);

  let theta = clamp(startTheta, -3, 3);
  const h = 0.01;
  for (let iteration = 0; iteration < 8; iteration++) {
    const center = ll(theta);
    const score = (ll(theta + h) - ll(theta - h)) / (2 * h);
    const hessian = (ll(theta + h) - 2 * center + ll(theta - h)) / (h * h);
    if (!Number.isFinite(hessian) || Math.abs(hessian) < 1e-5) break;
    const step = clamp(score / hessian, -0.8, 0.8);
    const next = clamp(theta - step, -3, 3);
    if (Math.abs(next - theta) < 0.005) return next;
    theta = next;
  }
  return theta;
}

export type VanDerLindenSpeedFit = {
  /** MLE of candidate speed τ under ln(T_i) ~ N(β_i − τ, 1/α_i²). */
  tau: number;
  /** sqrt(1 / Σα_i²), the conditional standard error of τ. */
  standardError: number;
  /** Sum of normal log densities under the fitted hierarchical timing model. */
  logLikelihood: number;
  observations: number;
};

/**
 * Log-density for Van der Linden's hierarchical response-time model:
 * ln(T_i) ~ Normal(β_i − τ, 1 / α_i²).
 */
export function responseTimeLogDensity(question: Question, responseSeconds: number, tau: number): number {
  const logTime = Math.log(Math.max(responseSeconds, 1));
  const mean = question.psychometric.beta - tau;
  const alpha = question.psychometric.alpha;
  const variance = 1 / (alpha * alpha);
  return -0.5 * Math.log(2 * Math.PI * variance) - ((logTime - mean) ** 2) / (2 * variance);
}

/**
 * Closed-form weighted MLE of τ. Item precision α_i contributes weight α_i², so
 * high-precision time-intensity items correctly contribute more than noisy items.
 */
export function fitVanDerLindenSpeed(questions: Question[], attempts: Attempt[]): VanDerLindenSpeedFit {
  const usable = attempts
    .filter((attempt) => attempt.responseSeconds > 0)
    .map((attempt) => ({ attempt, question: questions.find((item) => item.id === attempt.questionId) }))
    .filter((item): item is { attempt: Attempt; question: Question } => Boolean(item.question));
  if (!usable.length) return { tau: 0, standardError: 0, logLikelihood: 0, observations: 0 };

  const totalPrecision = usable.reduce((sum, { question }) => sum + question.psychometric.alpha ** 2, 0);
  const tau = usable.reduce((sum, { attempt, question }) => {
    const weight = question.psychometric.alpha ** 2;
    return sum + weight * (question.psychometric.beta - Math.log(Math.max(attempt.responseSeconds, 1)));
  }, 0) / totalPrecision;
  const logLikelihood = usable.reduce((sum, { attempt, question }) => sum + responseTimeLogDensity(question, attempt.responseSeconds, tau), 0);

  return { tau, standardError: Math.sqrt(1 / totalPrecision), logLikelihood, observations: usable.length };
}

/** Backwards-compatible scalar τ helper used by summary cards. */
export function estimateSpeed(questions: Question[], attempts: Attempt[]): number {
  return fitVanDerLindenSpeed(questions, attempts).tau;
}

/** Timer budget is derived directly from β_i because β_i is log expected seconds. */
export function calibratedSeconds(question: Question): number {
  return Math.max(30, Math.round(Math.exp(question.psychometric.beta)));
}

export const SATO_HASTE_LAMBDA = 0.38;
export const SATO_TIME_DEFICIT_LAMBDA = 0.22;

export type SatoPenalty = {
  haste: number;
  timeDeficit: number;
  total: number;
};

/**
 * Timer-pressure ability degradation: θ*(t) = θ − λ max(0, β_i / t − 1).
 * β_i is converted from the stored log-time intensity into calibrated seconds so
 * it shares units with observed response time t.
 */
export function timerPressureAbility(theta: number, question: Question, elapsedSeconds: number): number {
  const beta_i = Math.exp(question.psychometric.beta);
  return theta - SATO_HASTE_LAMBDA * Math.max(0, beta_i / Math.max(elapsedSeconds, 1) - 1);
}

/**
 * Pressure-adjusted ability used in the diagnostic review.
 *
 * The first term is the requested Van der Linden-style hasty-response penalty.
 * A grace buffer is a separate, explicit time deficit: it preserves the response
 * but reduces the pressure-adjusted estimate in proportion to the calibrated item
 * budget. This makes every +1 / +2 minute event analytically visible rather than
 * silently turning extra time into an advantage.
 */
export function satoPenalty(question: Question, elapsedSeconds: number, extensionSeconds = 0): SatoPenalty {
  const betaSeconds = Math.exp(question.psychometric.beta);
  const haste = -timerPressureAbility(0, question, elapsedSeconds);
  const deficitLambda = SATO_TIME_DEFICIT_LAMBDA;
  const timeDeficit = extensionSeconds > 0
    ? deficitLambda * Math.log1p(extensionSeconds / betaSeconds)
    : 0;
  return { haste, timeDeficit, total: haste + timeDeficit };
}

export function pressureAdjustedTheta(
  theta: number,
  question: Question,
  elapsedSeconds: number,
  extensionSeconds = 0
): number {
  return timerPressureAbility(theta, question, elapsedSeconds)
    - satoPenalty(question, elapsedSeconds, extensionSeconds).timeDeficit;
}

export function nrmProbabilities(theta: number, question: Question): Record<string, number> {
  const raw = question.options.map((option) => {
    const a = option.isCorrect ? question.psychometric.a : option.trap?.nrm.a ?? 0;
    const c = option.isCorrect ? 0.85 : option.trap?.nrm.c ?? 0;
    return Math.exp(clamp(a * theta + c, -20, 20));
  });
  const denominator = raw.reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(question.options.map((option, index) => [option.id, raw[index] / denominator]));
}

export function brierScore(attempts: Attempt[], questions: Question[]): number {
  // A default slider position is not a metacognitive judgment; only explicit reports count.
  const answered = attempts.filter((attempt) => attempt.selectedOptionId && attempt.confidenceReported);
  if (!answered.length) return 0;
  return answered.reduce((sum, attempt) => {
    const q = questions.find((item) => item.id === attempt.questionId)!;
    const outcome = attempt.selectedOptionId === q.correctOptionId ? 1 : 0;
    return sum + (attempt.confidence - outcome) ** 2;
  }, 0) / answered.length;
}

export function expectedCalibrationError(attempts: Attempt[], questions: Question[], bins = 5): number {
  const answered = attempts.filter((attempt) => attempt.selectedOptionId && attempt.confidenceReported);
  if (!answered.length) return 0;
  let error = 0;
  for (let bin = 0; bin < bins; bin++) {
    const lower = bin / bins;
    const upper = (bin + 1) / bins;
    const members = answered.filter((attempt) => attempt.confidence >= lower && (bin === bins - 1 ? attempt.confidence <= upper : attempt.confidence < upper));
    if (!members.length) continue;
    const meanConfidence = members.reduce((sum, attempt) => sum + attempt.confidence, 0) / members.length;
    const accuracy = members.filter((attempt) => {
      const q = questions.find((item) => item.id === attempt.questionId)!;
      return attempt.selectedOptionId === q.correctOptionId;
    }).length / members.length;
    error += (members.length / answered.length) * Math.abs(meanConfidence - accuracy);
  }
  return error;
}

export function timePressureLabel(question: Question, attempt: Attempt, correct: boolean): string {
  const betaSeconds = Math.exp(question.psychometric.beta);
  if (!correct && attempt.responseSeconds < betaSeconds * 0.58) return "Premature Closure Error";
  if (attempt.extensionsSeconds > 0) return "Time Deficit Logged";
  if (attempt.responseSeconds > betaSeconds * 1.35) return "Deliberate but inefficient";
  return correct ? "Controlled execution" : "Conceptual recovery needed";
}

export function formatTheta(theta: number): string {
  return `${theta >= 0 ? "+" : ""}${theta.toFixed(2)}σ`;
}

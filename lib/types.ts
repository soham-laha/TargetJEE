export type Subject = "Physics" | "Chemistry" | "Mathematics";
export type QuestionStatus = "not-visited" | "unanswered" | "answered" | "marked" | "answered-marked";

export type Trap = {
  id: string;
  label: string;
  archetype: string;
  description: string;
  avoidanceRule: string;
  nrm: { a: number; c: number };
};

export type Option = {
  id: string;
  latex: string;
  plain: string;
  isCorrect: boolean;
  trap?: Trap;
};

export type Question = {
  id: string;
  serial: number;
  subject: Subject;
  chapter: string;
  topic: string;
  level: "JEE Main" | "JEE Advanced";
  stem: string;
  context?: string;
  options: Option[];
  correctOptionId: string;
  psychometric: {
    a: number;
    b: number;
    c: number;
    beta: number;
    alpha: number;
  };
  derivation: string[];
  shortcut: string[];
  avoidanceRule: string;
};

export type TimeDeficit = {
  /** Immutable client event; persist as a TimeDeficitEvent server-side on submission. */
  id: string;
  addedSeconds: number;
  budgetExhaustedAtSeconds: number;
  grantedAt: string;
};

export type Attempt = {
  questionId: string;
  selectedOptionId?: string;
  /** Subjective probability f_n in [0, 1]. */
  confidence: number;
  /** Submission is blocked until the learner explicitly sets a confidence value. */
  confidenceReported: boolean;
  responseSeconds: number;
  /** Aggregate extension time, retained for fast session-level analytics. */
  extensionsSeconds: number;
  /** One record for every +1 or +2 minute decision. */
  timeDeficits: TimeDeficit[];
  status: QuestionStatus;
};

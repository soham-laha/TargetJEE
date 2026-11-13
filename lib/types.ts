export type Subject = "Physics" | "Chemistry" | "Mathematics";
export type QuestionStatus =
  "not-visited" | "unanswered" | "answered" | "marked" | "answered-marked";

export type Trap = {
  id: string;
  label: string;
  archetype: string;
  /** Evidence-led learner-facing diagnosis, never a generic option label. */
  description: string;
  /** The earliest invalid assumption or transformation in this trap path. */
  firstWrongPivot: string;
  /** Why the selected distractor can feel reasonable before the decisive condition is checked. */
  whyPlausible: string;
  /** The narrow counterfactual in which this option or approach would be valid. */
  validWhen: string;
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
  /** A verified, question-specific check used to confirm that the explanation resolved the doubt. */
  recoveryCheck?: {
    prompt: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
  };
};

export type TimeDeficit = {
  /** Immutable client event; persist as a TimeDeficitEvent server-side on submission. */
  id: string;
  addedSeconds: number;
  budgetExhaustedAtSeconds: number;
  grantedAt: string;
};

export type PacingTier = "first-exposure" | "guided" | "exam" | "pressure";

export type PacingProfile = {
  tier: PacingTier;
  /** Consecutive qualifying submitted drills at the current tier. */
  steadyDrills: number;
};

export type OptionSelectionEvent = {
  /** Undefined for the initial selected option; defined only when a learner changes answer. */
  fromOptionId?: string;
  toOptionId: string;
  /** Active seconds spent on this item before this selection. */
  elapsedSeconds: number;
  /** Seconds still available in the learner's paced practice window. */
  remainingSeconds: number;
  /** The paced practice window in force when this action happened. */
  allocatedBudgetSeconds: number;
  recordedAt: string;
};

export type SwitchSignalKind = "evidence-led" | "reconsidered" | "late-reactive";

export type Attempt = {
  questionId: string;
  selectedOptionId?: string;
  /** Optional learner-reported certainty in Diagnostic Practice, stored as f_n in [0, 1]. */
  confidence: number;
  /** False in uninterrupted NTA Simulation; never blocks session submission. */
  confidenceReported: boolean;
  responseSeconds: number;
  /** Aggregate extension time, retained for fast session-level analytics. */
  extensionsSeconds: number;
  /** One record for every +1 or +2 minute decision. */
  timeDeficits: TimeDeficit[];
  /** Silent in-exam trace used only for post-submission switch analysis. */
  selectionEvents?: OptionSelectionEvent[];
  status: QuestionStatus;
};

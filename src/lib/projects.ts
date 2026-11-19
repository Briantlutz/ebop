export const PHASES = ["define", "plan", "build", "launch", "live"] as const;
export type PhaseName = (typeof PHASES)[number];
export type PhaseState = "upcoming" | "open" | "done";

export const PLAN_SHAPES = ["app", "operations", "mixed"] as const;
export type PlanShape = (typeof PLAN_SHAPES)[number];

export const PHASE_LABEL: Record<PhaseName, string> = {
  define: "Define",
  plan: "Plan",
  build: "Build",
  launch: "Launch",
  live: "Live",
};

export const PLAN_SHAPE_LABEL: Record<PlanShape, string> = {
  app: "App",
  operations: "Operations",
  mixed: "Mixed",
};

export const PLAN_SHAPE_HINT: Record<PlanShape, string> = {
  app: "Something people use: an app, site or tool. Leaves as a Build Brief for a builder.",
  operations: "Something you run: a business, service or routine. Leaves as a task list and schedule.",
  mixed: "Something you run with an app inside it.",
};

export type ProjectCardData = {
  id: string;
  name: string;
  plan_shape: PlanShape;
  current_phase: PhaseName;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
  phases: { name: PhaseName; state: PhaseState }[];
  forYouCount: number;
  /** First-session questions still unanswered (0 once the Strategist has the basics). */
  questionsLeft: number;
};

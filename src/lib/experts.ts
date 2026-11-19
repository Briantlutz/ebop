import type { PlanShape } from "./projects";

export type ExpertRole = "strategist" | "designer" | "engineer";
export type GuardrailKind = "legal" | "medical" | "financial" | "tax" | "safety";

export type Expert = {
  id: string;
  role: ExpertRole;
  name: string;
  warmth: "warm" | "candid";
  pace: "deep" | "quick";
  sample_line: string;
  voice_prompt: string;
};

export const ROLE_LABEL: Record<ExpertRole, string> = {
  strategist: "Strategist",
  designer: "Designer",
  engineer: "Engineer",
};

export const GUARDRAIL_LABEL: Record<GuardrailKind, string> = {
  legal: "Legal",
  medical: "Medical",
  financial: "Financial",
  tax: "Tax",
  safety: "Safety",
};

// ---------------------------------------------------------------- first-session intake
export const INTAKE_KEYS = ["what", "who", "done"] as const;
export type IntakeKey = (typeof INTAKE_KEYS)[number];
export type Intake = Partial<Record<IntakeKey, string>>;

export function nextIntakeKey(intake: Intake): IntakeKey | null {
  return INTAKE_KEYS.find((k) => !intake[k]?.trim()) ?? null;
}

type Script = { greeting: string; questions: Record<IntakeKey, string> };

// The three questions are the same for every Strategist; the voice changes.
const SCRIPTS: Record<string, Script> = {
  "strategist-coach": {
    greeting: "Hi, I'm The Coach, your Strategist. We'll take this one step at a time: three questions, then I'll suggest your first few decisions.",
    questions: {
      what: "First, in your own words: what is it?",
      who: "Thanks. Who is it for? Picture the first person who'd use it or benefit from it.",
      done: "Last one. What does done look like? What would tell you this worked?",
    },
  },
  "strategist-champion": {
    greeting: "Hey, I'm The Champion, your Strategist. Three quick questions and we'll lock your first decisions.",
    questions: {
      what: "What is it?",
      who: "Love it. Who's it for?",
      done: "And what does done look like?",
    },
  },
  "strategist-analyst": {
    greeting: "I'm The Analyst, your Strategist. I'll ask three questions, then propose the decisions everything else depends on.",
    questions: {
      what: "What is it? Be as specific as you can.",
      who: "Who is it for, and what do they do today instead?",
      done: "What does done look like? Something you could measure is ideal.",
    },
  },
  "strategist-straight-shooter": {
    greeting: "The Straight Shooter, your Strategist. Three questions, then decisions.",
    questions: {
      what: "What is it?",
      who: "Who's it for?",
      done: "What's done?",
    },
  },
};

export function intakeScript(expertId: string): Script {
  return SCRIPTS[expertId] ?? SCRIPTS["strategist-champion"];
}

export const INTAKE_SAMPLES: Record<PlanShape, Record<IntakeKey, string[]>> = {
  app: {
    what: [
      "An app that helps neighbors swap tools instead of buying them.",
      "A booking page for my dog-walking business.",
      "A simple tracker for my team's weekly goals.",
    ],
    who: [
      "Renters in my building who don't have room to store tools.",
      "Busy dog owners within a mile of me.",
      "My team of six, mostly on their phones.",
    ],
    done: [
      "Twenty neighbors have used it at least once.",
      "Clients book and pay without texting me.",
      "Everyone updates their goals every Monday without a reminder.",
    ],
  },
  operations: {
    what: [
      "A weekend ice cream cart at the farmers market.",
      "Finding the right spa day as a holiday gift.",
      "A monthly supper club for friends.",
    ],
    who: [
      "Families walking the market on Saturdays.",
      "My partner, who's been stressed and loves quiet places.",
      "Eight friends who keep saying we should cook together.",
    ],
    done: [
      "Selling out most Saturdays by June.",
      "A booked, paid spa day wrapped and ready by December 20.",
      "Three dinners in a row where nobody had to organize at the last minute.",
    ],
  },
  mixed: {
    what: [
      "An ice cream shop with online preorders.",
      "A tutoring service with a simple sign-up site.",
      "A plant shop with a delivery app.",
    ],
    who: [
      "Office workers nearby who want pickup without waiting.",
      "Parents of middle schoolers in my town.",
      "Apartment dwellers who can't carry big pots home.",
    ],
    done: [
      "A third of weekend orders come in online.",
      "Ten steady students who booked through the site.",
      "Fifty deliveries a month without me answering the phone.",
    ],
  },
};

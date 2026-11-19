import type { ReactNode } from "react";
import { GUARDRAIL_LABEL, type GuardrailKind } from "@/lib/experts";
import { PHASE_LABEL, type PhaseName } from "@/lib/projects";

export type DecisionRow = {
  id: string;
  title: string;
  detail: string;
  reason: string;
  status: "open" | "locked" | "parked";
  author: "user" | "expert_suggested_user_approved" | null;
  proposed_by: string | null;
  guardrail_kind: GuardrailKind | null;
  guardrail_stakes: string | null;
  professional_questions: string[];
  batch_id: string | null;
  parked_for_phase: PhaseName | null;
  created_at: string;
  locked_at: string | null;
};

export function Bubble({ from, name, children }: { from: "user" | "expert"; name: string; children: ReactNode }) {
  const mine = from === "user";
  return (
    <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
      <span className="px-1 text-[13px] leading-[18px] font-semibold text-ink-muted">{name}</span>
      <div
        className={`max-w-[92%] rounded-md px-4 py-3 whitespace-pre-wrap sm:max-w-[85%] ${
          mine ? "bg-surface-alt text-ink" : "border border-line bg-surface text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function ShieldIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  );
}

export function GuardrailChip({ kind }: { kind: GuardrailKind }) {
  return (
    <span className="type-label inline-flex items-center gap-1 self-start rounded-sm bg-guardrail-tint px-2 py-[2px] text-guardrail">
      <ShieldIcon />
      Guardrail: {GUARDRAIL_LABEL[kind]}
    </span>
  );
}

export function authorLine(d: Pick<DecisionRow, "author">, expertName: string) {
  return d.author === "user" ? "Written by you" : `Suggested by ${expertName}, approved by you`;
}

export function DoneCheckpoint({ items, expertName }: { items: DecisionRow[]; expertName: string }) {
  const locked = items.filter((d) => d.status === "locked");
  return (
    <section className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <svg aria-hidden viewBox="0 0 24 24" className="size-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
        <h2 className="type-label">
          Checkpoint · {locked.length} {locked.length === 1 ? "decision" : "decisions"} locked
        </h2>
      </div>
      <ul className="flex flex-col gap-3">
        {locked.map((d) => (
          <li key={d.id} className="flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0">
            {d.guardrail_kind ? <GuardrailChip kind={d.guardrail_kind} /> : null}
            <p className="font-semibold">{d.title}</p>
            {d.detail ? <p className="text-ink-muted">{d.detail}</p> : null}
            {d.reason ? (
              <p className="text-[14px] leading-5 text-ink-muted">
                <span className="font-semibold text-ink">Why: </span>
                {d.reason}
              </p>
            ) : null}
            <p className="text-[13px] leading-[18px] text-ink-muted">{authorLine(d, expertName)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ParkedNote({ decision }: { decision: DecisionRow }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-[14px] leading-5 text-ink-muted">
      <svg aria-hidden viewBox="0 0 24 24" className="mt-[2px] size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 21V4h11l-2 4 2 4H5" />
      </svg>
      <span>
        <span className="font-semibold text-ink">
          Parked for {decision.parked_for_phase ? PHASE_LABEL[decision.parked_for_phase] : "later"}:
        </span>{" "}
        {decision.title}
      </span>
    </p>
  );
}

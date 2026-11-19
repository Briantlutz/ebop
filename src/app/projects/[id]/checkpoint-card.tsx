"use client";

import { useActionState, useState, useTransition } from "react";
import { FormMessage, OutlineButton, PrimaryButton } from "@/components/ui";
import {
  approveDecision,
  approveSet,
  askAboutDecision,
  changeDecision,
  setBatchPaused,
  type ActionState,
} from "./actions";
import { authorLine, GuardrailChip, ShieldIcon, type DecisionRow } from "./thread";

type Batch = { id: string; state: "pending" | "paused" | "done"; single: boolean };

const textArea =
  "type-body-lg w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-ink placeholder:text-ink-muted";

export function CheckpointCard({
  batch,
  items,
  expertName,
  waitingCount,
}: {
  batch: Batch;
  items: DecisionRow[];
  expertName: string;
  waitingCount: number;
}) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const open = items.filter((d) => d.status === "open");
  const decided = items.filter((d) => d.status === "locked");

  const run = (fn: () => Promise<ActionState>) =>
    startTransition(async () => {
      setError(undefined);
      const result = await fn();
      if (result.error) setError(result.error);
    });

  if (batch.state === "paused") {
    return (
      <section aria-label="Paused Checkpoint" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:p-5">
        <p className="type-title-sm">Checkpoint paused</p>
        <p className="text-ink-muted">
          {open.length} {open.length === 1 ? "item is" : "items are"} waiting for you
          {decided.length ? `, ${decided.length} already decided` : ""}. Pick up where you left off whenever you’re ready.
        </p>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <PrimaryButton type="button" className="self-start" disabled={busy} onClick={() => run(() => setBatchPaused(batch.id, false))}>
          {busy ? "Opening…" : "Resume Checkpoint"}
        </PrimaryButton>
      </section>
    );
  }

  const guardrail = batch.single && items[0]?.guardrail_kind;

  return (
    <section
      aria-label="Checkpoint"
      className={`flex flex-col gap-4 rounded-md border bg-surface p-4 sm:p-5 ${guardrail ? "border-guardrail" : "border-line-strong"}`}
    >
      <header className="flex flex-col gap-1">
        <h2 className="type-title-sm">
          {batch.single
            ? guardrail
              ? "Checkpoint · one guardrail decision"
              : "Checkpoint · one big decision"
            : `Checkpoint · ${items.length} decisions from ${expertName}`}
        </h2>
        <p className="text-[14px] leading-5 text-ink-muted">
          {batch.single
            ? "This one gets its own look. Approve it, change it, or ask about it."
            : `Approve each one, change it, or ask about it. ${decided.length} of ${items.length} decided.`}
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {items.map((d) => (
          <li key={d.id}>
            {d.status === "open" ? (
              <OpenItem decision={d} single={batch.single} onApprove={() => run(() => approveDecision(d.id))} disabled={busy} />
            ) : (
              <DecidedItem decision={d} expertName={expertName} />
            )}
          </li>
        ))}
      </ol>

      {error ? <FormMessage>{error}</FormMessage> : null}

      <footer className="flex flex-wrap items-center gap-3">
        {!batch.single && open.length > 0 ? (
          <PrimaryButton type="button" disabled={busy} onClick={() => run(() => approveSet(batch.id))}>
            {busy ? "Saving…" : open.length === items.length ? "Approve set" : `Approve the other ${open.length}`}
          </PrimaryButton>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => setBatchPaused(batch.id, true))}
          className="type-label inline-flex min-h-target items-center px-2 text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Pause for later
        </button>
      </footer>
      {waitingCount > 0 ? (
        <p className="text-[14px] leading-5 text-ink-muted">
          {waitingCount} more {waitingCount === 1 ? "decision comes" : "decisions come"} after this, one at a time.
        </p>
      ) : null}
    </section>
  );
}

function OpenItem({
  decision: d,
  single,
  onApprove,
  disabled,
}: {
  decision: DecisionRow;
  single: boolean;
  onApprove: () => void;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "change" | "ask">("idle");

  return (
    <article className={`flex flex-col gap-2 rounded-md p-4 ${d.guardrail_kind ? "bg-guardrail-tint" : "bg-surface-alt"}`}>
      {d.guardrail_kind ? <GuardrailChip kind={d.guardrail_kind} /> : null}
      <h3 className="type-title-sm">{d.title}</h3>
      {d.detail ? <p>{d.detail}</p> : null}
      {d.reason ? (
        <p className="text-[14px] leading-5 text-ink-muted">
          <span className="font-semibold text-ink">Why: </span>
          {d.reason}
        </p>
      ) : null}

      {d.guardrail_kind ? (
        <div className="flex flex-col gap-2 rounded-sm border border-guardrail bg-surface p-3">
          {d.guardrail_stakes ? (
            <p className="text-[14px] leading-5">
              <span className="font-semibold">What’s at stake: </span>
              {d.guardrail_stakes}
            </p>
          ) : null}
          {d.professional_questions.length ? (
            <div className="flex flex-col gap-1">
              <p className="inline-flex items-center gap-1 text-[14px] leading-5 font-semibold">
                <ShieldIcon />
                Questions for a licensed professional
              </p>
              <ul className="list-disc pl-6 text-[14px] leading-5">
                {d.professional_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {single ? (
            <PrimaryButton type="button" onClick={onApprove} disabled={disabled}>
              Approve
            </PrimaryButton>
          ) : (
            <OutlineButton type="button" onClick={onApprove} disabled={disabled}>
              Approve
            </OutlineButton>
          )}
          <OutlineButton type="button" onClick={() => setMode("change")} disabled={disabled}>
            Change
          </OutlineButton>
          <OutlineButton type="button" onClick={() => setMode("ask")} disabled={disabled}>
            Ask
          </OutlineButton>
        </div>
      ) : mode === "change" ? (
        <ChangeForm decision={d} onCancel={() => setMode("idle")} />
      ) : (
        <AskForm decision={d} onCancel={() => setMode("idle")} />
      )}
    </article>
  );
}

function ChangeForm({ decision: d, onCancel }: { decision: DecisionRow; onCancel: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(changeDecision.bind(null, d.id), {});
  return (
    <form action={action} className="flex flex-col gap-3 pt-1">
      <label className="flex flex-col gap-1">
        <span className="type-label">Decision</span>
        <input name="title" defaultValue={d.title} maxLength={200} className={`${textArea} min-h-target`} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-label">What it means</span>
        <textarea name="detail" defaultValue={d.detail} maxLength={2000} rows={3} className={textArea} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-label">Why</span>
        <textarea name="reason" defaultValue={d.reason} maxLength={2000} rows={2} className={textArea} />
      </label>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div className="flex flex-wrap gap-2">
        <OutlineButton type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save and lock"}
        </OutlineButton>
        <button type="button" onClick={onCancel} className="type-label min-h-target px-2 text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AskForm({ decision: d, onCancel }: { decision: DecisionRow; onCancel: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await askAboutDecision(d.id, prev, formData);
    if (!result.error) onCancel(); // answered: the reply is in the conversation, close the box
    return result;
  }, {});
  return (
    <form action={action} className="flex flex-col gap-3 pt-1">
      <label className="flex flex-col gap-1">
        <span className="type-label">Your question</span>
        <textarea
          name="text"
          defaultValue={state.draft}
          rows={2}
          maxLength={4000}
          placeholder="What would change if we didn't do this?"
          className={textArea}
          required
        />
      </label>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div className="flex flex-wrap items-center gap-2">
        <OutlineButton type="submit" disabled={pending}>
          {pending ? "Asking…" : "Ask"}
        </OutlineButton>
        <button type="button" onClick={onCancel} className="type-label min-h-target px-2 text-ink-muted hover:text-ink">
          Cancel
        </button>
        {pending ? <span className="text-[14px] leading-5 text-ink-muted">The answer will appear in the conversation above.</span> : null}
      </div>
    </form>
  );
}

function DecidedItem({ decision: d, expertName }: { decision: DecisionRow; expertName: string }) {
  return (
    <article className="flex items-start gap-3 rounded-md border border-line px-4 py-3">
      <svg aria-hidden viewBox="0 0 24 24" className="mt-[3px] size-4 shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-10" />
      </svg>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{d.title}</p>
        <p className="text-[13px] leading-[18px] text-ink-muted">Locked · {authorLine(d, expertName)}</p>
      </div>
    </article>
  );
}

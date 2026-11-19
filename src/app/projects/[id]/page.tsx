import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { TopBar } from "@/components/top-bar";
import { requireUser } from "@/lib/auth";
import { INTAKE_KEYS, INTAKE_SAMPLES, intakeScript, nextIntakeKey, ROLE_LABEL, type Expert, type Intake } from "@/lib/experts";
import { PHASE_LABEL, PLAN_SHAPE_LABEL, type PhaseName, type PlanShape } from "@/lib/projects";
import { Bubble, DoneCheckpoint, ParkedNote, type DecisionRow } from "./thread";
import { CheckpointCard } from "./checkpoint-card";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "Session · Ebop" };

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <Suspense fallback={<SessionSkeleton />}>
          <Session params={params} />
        </Suspense>
      </main>
    </>
  );
}

type BatchRow = { id: string; state: "pending" | "paused" | "done"; single: boolean; created_at: string; done_at: string | null };
type MessageRow = { id: string; sender: "user" | "expert"; body: string; decision_id: string | null; created_at: string };

async function Session({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, plan_shape, current_phase, intake, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [teamRes, messagesRes, batchesRes, decisionsRes] = await Promise.all([
    supabase
      .from("project_experts")
      .select("expert:experts(id, role, name, warmth, pace, sample_line, voice_prompt)")
      .eq("project_id", id)
      .eq("role", "strategist")
      .maybeSingle(),
    supabase.from("messages").select("id, sender, body, decision_id, created_at").eq("project_id", id).order("created_at"),
    supabase.from("checkpoint_batches").select("id, state, single, created_at, done_at").eq("project_id", id).order("created_at"),
    supabase
      .from("decisions")
      .select(
        "id, title, detail, reason, status, author, proposed_by, guardrail_kind, guardrail_stakes, professional_questions, batch_id, parked_for_phase, created_at, locked_at",
      )
      .eq("project_id", id)
      .order("created_at"),
  ]);

  const expert = teamRes.data?.expert as unknown as Expert;
  const messages = (messagesRes.data ?? []) as MessageRow[];
  const batches = (batchesRes.data ?? []) as BatchRow[];
  const decisions = (decisionsRes.data ?? []) as DecisionRow[];
  const intake = (project.intake ?? {}) as Intake;
  const phase = project.current_phase as PhaseName;
  const shape = project.plan_shape as PlanShape;
  const script = intakeScript(expert.id);
  const nextKey = nextIntakeKey(intake);

  const itemsOf = (batchId: string) => decisions.filter((d) => d.batch_id === batchId);
  const titleOf = new Map(decisions.map((d) => [d.id, d.title]));
  const openBatches = batches.filter((b) => b.state !== "done" && itemsOf(b.id).length > 0);
  const [activeBatch, ...waitingBatches] = openBatches;

  // Conversation after the three questions, in time order: messages, finished
  // Checkpoints (placed when they were finished) and parked ideas.
  type Entry = { at: string; key: string; node: React.ReactNode };
  const entries: Entry[] = [
    ...messages.map((m) => ({
      at: m.created_at,
      key: `m-${m.id}`,
      node: (
        <Bubble from={m.sender} name={m.sender === "expert" ? expert.name : "You"}>
          {m.decision_id && titleOf.get(m.decision_id) ? (
            <span className="mb-1 block text-[13px] leading-[18px] text-ink-muted">
              About “{titleOf.get(m.decision_id)}”
            </span>
          ) : null}
          {m.body}
        </Bubble>
      ),
    })),
    ...batches
      .filter((b) => b.state === "done")
      .map((b) => ({
        at: b.done_at ?? b.created_at,
        key: `b-${b.id}`,
        node: <DoneCheckpoint items={itemsOf(b.id)} expertName={expert.name} />,
      })),
    ...decisions
      .filter((d) => d.status === "parked")
      .map((d) => ({ at: d.created_at, key: `p-${d.id}`, node: <ParkedNote decision={d} /> })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const firstCheckpointDone = batches.length > 0 && openBatches.length === 0;
  const lockedCount = decisions.filter((d) => d.status === "locked").length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link href="/" className="type-label inline-flex min-h-target items-center gap-1 self-start text-ink-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Home
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="type-title-lg min-w-0 break-words">{project.name}</h1>
          <span className="type-label mt-1 shrink-0 rounded-sm border border-line-strong px-2 py-[2px] text-ink-muted">
            {PLAN_SHAPE_LABEL[shape]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line pb-3 text-[14px] leading-5 text-ink-muted">
          <span className="font-semibold text-ink">{PHASE_LABEL[phase]}</span>
          <span aria-hidden>·</span>
          <span>Session with {expert.name}, your {ROLE_LABEL[expert.role]}</span>
          <span className="text-[13px]">({expert.warmth}, {expert.pace})</span>
        </div>
      </div>

      <ol className="flex flex-col gap-4" aria-label="Session">
        <li>
          <Bubble from="expert" name={expert.name}>
            {script.greeting}
            {"\n\n"}
            {script.questions.what}
          </Bubble>
        </li>
        {INTAKE_KEYS.map((key, i) => {
          const answer = intake[key];
          if (!answer) return null;
          const next = INTAKE_KEYS[i + 1];
          return (
            <li key={key} className="flex flex-col gap-4">
              <Bubble from="user" name="You">{answer}</Bubble>
              {next ? <Bubble from="expert" name={expert.name}>{script.questions[next]}</Bubble> : null}
            </li>
          );
        })}
        {entries.map((e) => (
          <li key={e.key}>{e.node}</li>
        ))}
      </ol>

      {activeBatch ? (
        <CheckpointCard
          key={activeBatch.id}
          batch={activeBatch}
          items={itemsOf(activeBatch.id)}
          expertName={expert.name}
          waitingCount={waitingBatches.length}
        />
      ) : null}

      {firstCheckpointDone && lockedCount > 0 && messages.filter((m) => m.sender === "user").length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-md border border-line bg-surface p-4 sm:p-5">
          <p className="type-title-sm">First Checkpoint done</p>
          <p className="text-ink-muted">
            {lockedCount} {lockedCount === 1 ? "decision is" : "decisions are"} locked with their reasons. Keep talking with{" "}
            {expert.name} below, or pick this up later from Home.
          </p>
          <Link
            href="/"
            className="type-label inline-flex min-h-target items-center rounded-sm border border-line-strong bg-surface px-4 text-ink"
          >
            Back to Home
          </Link>
        </section>
      ) : null}

      <Composer
        projectId={project.id}
        expertName={expert.name}
        intakeKey={nextKey}
        samples={nextKey ? INTAKE_SAMPLES[shape][nextKey] : []}
        // Ember goes to the one primary action: the Checkpoint when one is open, otherwise the composer.
        primary={!activeBatch}
      />
    </>
  );
}

function SessionSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="h-[34px] w-56 rounded-sm bg-surface-alt" />
      <div className="h-[96px] w-4/5 rounded-md bg-surface-alt" />
      <div className="ml-auto h-[56px] w-3/5 rounded-md bg-surface-alt" />
    </div>
  );
}

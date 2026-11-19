"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { ExpertTurnError, runExpertTurn, type TurnMode } from "@/lib/ai/expert-turn";
import { INTAKE_KEYS, nextIntakeKey, type Intake, type IntakeKey } from "@/lib/experts";

export type ActionState = { error?: string; retry?: boolean; draft?: string };

const MAX_MESSAGE = 4000;

// Every action re-checks the user; row-level security limits every query to
// the user's own projects, so a foreign id simply finds nothing.
async function loadProject(projectId: string) {
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select("id, current_phase, intake")
    .eq("id", projectId)
    .maybeSingle();
  return { supabase, project };
}

async function expertTurn(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  projectId: string,
  mode: TurnMode,
): Promise<ActionState> {
  try {
    await runExpertTurn(supabase, projectId, mode);
    return {};
  } catch (error) {
    if (error instanceof ExpertTurnError) return { error: error.message, retry: true };
    console.error(error);
    return { error: "Something went wrong. Try again.", retry: true };
  } finally {
    refresh();
  }
}

// ---------------------------------------------------------------- first session: three questions
export async function answerIntake(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const key = String(formData.get("key") ?? "") as IntakeKey;
  const text = String(formData.get("text") ?? "").trim();
  if (!INTAKE_KEYS.includes(key)) return { error: "Something went wrong. Reload the page." };
  if (!text) return { error: "Add an answer, or tap a sample to start from." };
  if (text.length > 1000) return { error: "Keep it under 1,000 characters. You can add more later.", draft: text };

  const { supabase, project } = await loadProject(projectId);
  if (!project) return { error: "We couldn't find that project." };

  const intake = { ...(project.intake as Intake), [key]: text };
  const { error } = await supabase.from("projects").update({ intake }).eq("id", projectId);
  if (error) return { error: "We couldn't save that. Try again.", draft: text };

  if (nextIntakeKey(intake) === null) return expertTurn(supabase, projectId, { kind: "first_batch" });
  refresh();
  return {};
}

// ---------------------------------------------------------------- chat
export async function sendMessage(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return {};
  if (text.length > MAX_MESSAGE) return { error: "That's a long one. Keep it under 4,000 characters.", draft: text };

  const { supabase, project } = await loadProject(projectId);
  if (!project) return { error: "We couldn't find that project." };

  const { data: team } = await supabase
    .from("project_experts")
    .select("expert_id")
    .eq("project_id", projectId)
    .eq("role", "strategist")
    .maybeSingle();

  const { error } = await supabase.from("messages").insert({
    project_id: projectId,
    phase: project.current_phase,
    expert_id: team?.expert_id ?? null,
    sender: "user",
    body: text,
  });
  if (error) return { error: "We couldn't send that. Try again.", draft: text };

  return expertTurn(supabase, projectId, { kind: "chat" });
}

/** Re-runs the expert after a failed reply: the first Checkpoint, or the last unanswered message. */
export async function retryReply(projectId: string): Promise<ActionState> {
  const { supabase, project } = await loadProject(projectId);
  if (!project) return { error: "We couldn't find that project." };

  const [{ count: batches }, { data: last }] = await Promise.all([
    supabase.from("checkpoint_batches").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase
      .from("messages")
      .select("sender, decision_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!batches && nextIntakeKey(project.intake as Intake) === null && !last) {
    return expertTurn(supabase, projectId, { kind: "first_batch" });
  }
  if (last?.sender === "user") {
    return expertTurn(
      supabase,
      projectId,
      last.decision_id ? { kind: "ask", decisionId: last.decision_id } : { kind: "chat" },
    );
  }
  refresh();
  return {};
}

// ---------------------------------------------------------------- checkpoint items
async function loadOpenDecision(decisionId: string) {
  const { supabase } = await requireUser();
  const { data: decision } = await supabase
    .from("decisions")
    .select("id, project_id, phase, batch_id, status, title")
    .eq("id", decisionId)
    .maybeSingle();
  return { supabase, decision: decision?.status === "open" ? decision : null };
}

async function closeBatchIfDone(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], batchId: string | null) {
  if (!batchId) return;
  const { count } = await supabase
    .from("decisions")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "open");
  if (count === 0) {
    await supabase
      .from("checkpoint_batches")
      .update({ state: "done", done_at: new Date().toISOString() })
      .eq("id", batchId);
  }
}

export async function approveDecision(decisionId: string): Promise<ActionState> {
  const { supabase, decision } = await loadOpenDecision(decisionId);
  if (!decision) return { error: "That item was already decided." };

  const { error } = await supabase
    .from("decisions")
    .update({ status: "locked", author: "expert_suggested_user_approved", locked_at: new Date().toISOString() })
    .eq("id", decisionId)
    .eq("status", "open");
  if (error) return { error: "We couldn't approve that. Try again." };

  await closeBatchIfDone(supabase, decision.batch_id);
  refresh();
  return {};
}

export async function changeDecision(decisionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!title) return { error: "The decision needs a short title." };
  if (title.length > 200) return { error: "Keep the title under 200 characters." };
  if (detail.length > 2000 || reason.length > 2000) return { error: "Keep each box under 2,000 characters." };

  const { supabase, decision } = await loadOpenDecision(decisionId);
  if (!decision) return { error: "That item was already decided." };

  // The person rewrote it, so the person is its author.
  const { error } = await supabase
    .from("decisions")
    .update({ title, detail, reason, status: "locked", author: "user", locked_at: new Date().toISOString() })
    .eq("id", decisionId)
    .eq("status", "open");
  if (error) return { error: "We couldn't save that. Try again." };

  await closeBatchIfDone(supabase, decision.batch_id);
  refresh();
  return {};
}

export async function askAboutDecision(decisionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Type your question first." };
  if (text.length > MAX_MESSAGE) return { error: "Keep it under 4,000 characters.", draft: text };

  const { supabase, decision } = await loadOpenDecision(decisionId);
  if (!decision) return { error: "That item was already decided." };

  const { data: team } = await supabase
    .from("project_experts")
    .select("expert_id")
    .eq("project_id", decision.project_id)
    .eq("role", "strategist")
    .maybeSingle();

  const { error } = await supabase.from("messages").insert({
    project_id: decision.project_id,
    phase: decision.phase,
    expert_id: team?.expert_id ?? null,
    sender: "user",
    body: text,
    decision_id: decisionId,
  });
  if (error) return { error: "We couldn't send that. Try again.", draft: text };

  return expertTurn(supabase, decision.project_id, { kind: "ask", decisionId });
}

// ---------------------------------------------------------------- batches
export async function approveSet(batchId: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const { data: batch } = await supabase.from("checkpoint_batches").select("id, single").eq("id", batchId).maybeSingle();
  if (!batch) return { error: "We couldn't find that Checkpoint." };
  if (batch.single) return { error: "This one is decided on its own." };

  const { error } = await supabase
    .from("decisions")
    .update({ status: "locked", author: "expert_suggested_user_approved", locked_at: new Date().toISOString() })
    .eq("batch_id", batchId)
    .eq("status", "open")
    .is("guardrail_kind", null);
  if (error) return { error: "We couldn't approve the set. Try again." };

  await closeBatchIfDone(supabase, batchId);
  refresh();
  return {};
}

export async function setBatchPaused(batchId: string, paused: boolean): Promise<ActionState> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("checkpoint_batches")
    .update({ state: paused ? "paused" : "pending" })
    .eq("id", batchId)
    .neq("state", "done");
  if (error) return { error: "We couldn't update that Checkpoint. Try again." };
  refresh();
  return {};
}

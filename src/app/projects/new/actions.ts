"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PLAN_SHAPES, type PlanShape } from "@/lib/projects";

export type NewProjectState = { error?: string; name?: string; planShape?: string };

export async function createProject(_prev: NewProjectState, formData: FormData): Promise<NewProjectState> {
  const { supabase, userId } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const planShape = String(formData.get("plan_shape") ?? "");

  if (!name) return { error: "Give your project a name. You can change it later.", name, planShape };
  if (name.length > 80) return { error: "Keep the name under 80 characters.", name, planShape };
  if (!PLAN_SHAPES.includes(planShape as PlanShape)) {
    return { error: "Pick what kind of project this is.", name, planShape };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name, plan_shape: planShape })
    .select("id")
    .single();

  if (error || !project) return { error: "We couldn't save that project. Try again.", name, planShape };
  // Straight into the first session with the Strategist.
  redirect(`/projects/${project.id}`);
}

"use client";

import { useActionState } from "react";
import { createProject, type NewProjectState } from "./actions";
import { Field, FormMessage, PrimaryButton, TextInput } from "@/components/ui";
import { PLAN_SHAPES, PLAN_SHAPE_HINT, PLAN_SHAPE_LABEL } from "@/lib/projects";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<NewProjectState, FormData>(createProject, {});

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <Field label="Project name">
        <TextInput name="name" maxLength={80} defaultValue={state.name} placeholder="Scoop NYC" required />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="type-label mb-2">What kind of project is it?</legend>
        {PLAN_SHAPES.map((shape) => (
          <label
            key={shape}
            className="flex min-h-target cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-4 has-[:checked]:border-ink"
          >
            <input
              type="radio"
              name="plan_shape"
              value={shape}
              defaultChecked={state.planShape === shape}
              className="mt-[3px] size-4 accent-[var(--ink)]"
              required
            />
            <span className="flex flex-col gap-1">
              <span className="type-title-sm">{PLAN_SHAPE_LABEL[shape]}</span>
              <span className="text-[14px] leading-5 text-ink-muted">{PLAN_SHAPE_HINT[shape]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

      <PrimaryButton type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create project"}
      </PrimaryButton>
    </form>
  );
}

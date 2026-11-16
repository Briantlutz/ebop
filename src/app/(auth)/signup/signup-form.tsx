"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";
import { Field, FormMessage, PrimaryButton, TextInput } from "@/components/ui";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Your name">
        <TextInput name="name" autoComplete="name" defaultValue={state.name} required />
      </Field>
      <Field label="Email">
        <TextInput name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <TextInput name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      {state.notice ? <FormMessage tone="ok">{state.notice}</FormMessage> : null}

      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </PrimaryButton>
    </form>
  );
}

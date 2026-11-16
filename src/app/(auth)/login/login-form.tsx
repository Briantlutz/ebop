"use client";

import { useActionState } from "react";
import { logIn, type AuthState } from "../actions";
import { Field, FormMessage, PrimaryButton, TextInput } from "@/components/ui";

export function LogInForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(logIn, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email">
        <TextInput name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <Field label="Password">
        <TextInput name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </PrimaryButton>
    </form>
  );
}

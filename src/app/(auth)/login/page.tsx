import type { Metadata } from "next";
import Link from "next/link";
import { LogInForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Ebop" };

export default function LogInPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="type-title-lg">Welcome back</h1>
      <LogInForm />
      <p className="text-ink-muted">
        New to Ebop?{" "}
        <Link href="/signup" className="inline-flex min-h-target items-center text-ink underline hover:text-ember-deep">
          Create an account
        </Link>
      </p>
    </section>
  );
}

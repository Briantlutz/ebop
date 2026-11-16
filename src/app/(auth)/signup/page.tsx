import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up · Ebop" };

export default function SignUpPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="type-title-lg">Start your first project</h1>
        <p className="text-ink-muted">Plan it. Build it. Run it. It&apos;s all here.</p>
      </div>

      <DataPromise />

      <SignUpForm />

      <p className="text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex min-h-target items-center text-ink underline hover:text-ember-deep">
          Log in
        </Link>
      </p>
    </section>
  );
}

function DataPromise() {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-surface p-4">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="mt-[2px] size-5 shrink-0 text-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <p className="type-body">
        Your projects are yours. Export them anytime, delete them anytime. We never sell them or
        train on them.
      </p>
    </div>
  );
}

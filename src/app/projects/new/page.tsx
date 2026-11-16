import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { NewProjectForm } from "./new-project-form";

export const metadata: Metadata = { title: "New project · Ebop" };

export default function NewProjectPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/" className="type-label inline-flex min-h-target items-center gap-1 self-start text-ink-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Home
        </Link>
        <h1 className="type-title-lg">New project</h1>
        <NewProjectForm />
      </main>
    </>
  );
}

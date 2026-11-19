import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { TopBar } from "@/components/top-bar";
import { ProjectCard } from "@/components/project-card";
import { requireUser } from "@/lib/auth";
import type { ProjectCardData } from "@/lib/projects";
import { INTAKE_KEYS, type Intake } from "@/lib/experts";

export default function HomePage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <Suspense fallback={<HomeSkeleton />}>
          <Home />
        </Suspense>
      </main>
    </>
  );
}

async function Home() {
  await connection();
  const { supabase, userId } = await requireUser();

  const [{ data: profile }, { data: projects, error }, { data: openItems }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, plan_shape, current_phase, status, intake, created_at, updated_at, phases(name, state)")
      .order("updated_at", { ascending: false }),
    // Checkpoint items waiting on the person. Row-level security limits this to their projects.
    supabase.from("decisions").select("project_id").eq("status", "open"),
  ]);

  if (error) throw new Error(error.message);

  // "N for you" counts open Checkpoint items (tasks waiting on the user join in step 7).
  const forYou = new Map<string, number>();
  for (const d of openItems ?? []) forYou.set(d.project_id, (forYou.get(d.project_id) ?? 0) + 1);
  const cards: ProjectCardData[] = (projects ?? []).map((p) => ({
    ...p,
    forYouCount: forYou.get(p.id) ?? 0,
    questionsLeft: INTAKE_KEYS.filter((k) => !(p.intake as Intake)?.[k]?.trim()).length,
  }));
  const firstName = profile?.name?.split(" ")[0];
  const now = new Date();

  if (cards.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface p-5 sm:p-8">
        <h1 className="type-title-lg">{firstName ? `Welcome, ${firstName}` : "Welcome"}</h1>
        <p className="type-body-lg max-w-[52ch] text-ink-muted">
          Bring an idea, or something you already run. Your Strategist will help you shape it,
          one decision at a time.
        </p>
        <Link
          href="/projects/new"
          className="type-label inline-flex min-h-12 items-center rounded-sm bg-ember px-5 text-on-ember"
        >
          Start your first project
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-title-lg">Your projects</h1>
        <Link
          href="/projects/new"
          className="type-label inline-flex min-h-target items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-ink"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New project
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((p) => (
          <li key={p.id}>
            <ProjectCard project={p} now={now} />
          </li>
        ))}
      </ul>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="h-[34px] w-48 rounded-sm bg-surface-alt" />
      <div className="h-[132px] rounded-md bg-surface-alt" />
    </div>
  );
}

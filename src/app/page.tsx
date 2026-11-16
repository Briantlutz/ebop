import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { TopBar } from "@/components/top-bar";
import { ProjectCard } from "@/components/project-card";
import { requireUser } from "@/lib/auth";
import type { ProjectCardData } from "@/lib/projects";

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

  const [{ data: profile }, { data: projects, error }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, plan_shape, current_phase, status, created_at, updated_at, phases(name, state)")
      .order("updated_at", { ascending: false }),
  ]);

  if (error) throw new Error(error.message);

  // "N for you" counts open checkpoint items and tasks waiting on the user.
  // Those arrive in step 2; until then every project has nothing waiting.
  const cards: ProjectCardData[] = (projects ?? []).map((p) => ({ ...p, forYouCount: 0 }));
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

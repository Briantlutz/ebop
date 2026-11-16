import {
  PHASES,
  PHASE_LABEL,
  PLAN_SHAPE_LABEL,
  type PhaseState,
  type ProjectCardData,
} from "@/lib/projects";

export function ProjectCard({ project, now }: { project: ProjectCardData; now: Date }) {
  const stateOf = new Map(project.phases.map((p) => [p.name, p.state]));
  const currentIndex = PHASES.indexOf(project.current_phase);

  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="type-title-sm min-w-0 break-words">{project.name}</h3>
        <span className="type-label shrink-0 rounded-sm border border-line-strong px-2 py-[2px] text-ink-muted">
          {PLAN_SHAPE_LABEL[project.plan_shape]}
        </span>
      </div>

      <PhaseBar
        states={PHASES.map((name) => stateOf.get(name) ?? "upcoming")}
        currentIndex={currentIndex}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] leading-5 text-ink-muted">{statusLine(project, now)}</p>
        {project.forYouCount > 0 ? (
          <span className="type-label rounded-pill bg-today-tint px-3 py-[2px] text-today">
            {project.forYouCount} for you
          </span>
        ) : null}
      </div>
    </article>
  );
}

function PhaseBar({ states, currentIndex }: { states: PhaseState[]; currentIndex: number }) {
  const label = `Phase ${currentIndex + 1} of 5: ${PHASE_LABEL[PHASES[currentIndex]]}`;
  return (
    <div role="img" aria-label={label} className="flex flex-col gap-1">
      <div className="flex gap-1">
        {states.map((state, i) => (
          <span
            key={PHASES[i]}
            className={`h-2 flex-1 rounded-sm ${
              i === currentIndex ? "bg-ember" : state === "done" ? "bg-ember-deep" : "bg-surface-alt"
            }`}
          />
        ))}
      </div>
      <div className="flex gap-1" aria-hidden>
        {PHASES.map((name, i) => (
          <span
            key={name}
            className={`flex-1 text-[13px] leading-[18px] ${
              i === currentIndex ? "font-semibold text-ink" : "text-ink-muted"
            }`}
          >
            {PHASE_LABEL[name]}
          </span>
        ))}
      </div>
    </div>
  );
}

function statusLine(project: ProjectCardData, now: Date) {
  if (project.status === "closed") return "Closed";
  const phase = PHASE_LABEL[project.current_phase];
  const started = new Date(project.created_at);
  return `${phase} is open · started ${relativeDay(started, now)}`;
}

function relativeDay(d: Date, now: Date) {
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

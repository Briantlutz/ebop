import type { ComponentProps, ReactNode } from "react";

// Ember is reserved for the ONE primary action per view.
export function PrimaryButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`type-label inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-ember px-5 text-on-ember disabled:opacity-60 ${className}`}
    />
  );
}

export function OutlineButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`type-label inline-flex min-h-target items-center justify-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-ink ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="type-label">{label}</span>
      {children}
      {hint ? <span className="text-[14px] leading-5 text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`type-body-lg min-h-target w-full rounded-sm border border-line-strong bg-surface px-3 text-ink placeholder:text-ink-muted ${className}`}
    />
  );
}

export function FormMessage({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "ok" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`text-[14px] leading-5 ${tone === "error" ? "text-guardrail" : "text-ember-deep"}`}
    >
      {children}
    </p>
  );
}

import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-8 px-4 py-8 sm:py-16">
      <header className="flex flex-col gap-2">
        <Wordmark />
        <p className="text-[14px] leading-5 text-ink-muted">From spark to running.</p>
      </header>
      {children}
    </main>
  );
}

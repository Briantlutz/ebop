import Link from "next/link";
import { logOut } from "@/app/(auth)/actions";
import { Wordmark } from "./wordmark";

export function TopBar() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[960px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="inline-flex min-h-target items-center" aria-label="Ebop home">
          <Wordmark />
        </Link>
        <form action={logOut}>
          <button
            type="submit"
            className="type-label inline-flex min-h-target items-center px-2 text-ink-muted hover:text-ink"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

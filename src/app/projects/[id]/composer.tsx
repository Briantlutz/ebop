"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/components/ui";
import type { IntakeKey } from "@/lib/experts";
import { answerIntake, retryReply, sendMessage, type ActionState } from "./actions";
import { Bubble } from "./thread";

const LABEL: Record<IntakeKey, string> = {
  what: "What it is",
  who: "Who it's for",
  done: "What done looks like",
};

export function Composer({
  projectId,
  expertName,
  intakeKey,
  samples,
  primary,
}: {
  projectId: string;
  expertName: string;
  intakeKey: IntakeKey | null;
  samples: string[];
  primary: boolean;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState("");
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string>();

  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = intakeKey
      ? await answerIntake(projectId, prev, formData)
      : await sendMessage(projectId, prev, formData);
    // Keep the text in the box if it never reached the server.
    if (!result.error || result.retry) formRef.current?.reset();
    return result;
  }, {});

  const thinking = (pending && (!intakeKey || intakeKey === "done")) || retrying;
  const error = retryError ?? state.error;
  const canRetry = !pending && !retrying && (retryError ? true : state.retry);

  const retry = () =>
    startRetry(async () => {
      setRetryError(undefined);
      const result = await retryReply(projectId);
      setRetryError(result.error);
    });

  return (
    <div className="flex flex-col gap-3">
      {pending && sent ? <Bubble from="user" name="You">{sent}</Bubble> : null}
      {thinking ? (
        <div role="status" className="flex items-center gap-2 px-1 text-ink-muted">
          <span className="inline-flex gap-1" aria-hidden>
            <span className="size-1.5 animate-pulse rounded-pill bg-ink-muted" />
            <span className="size-1.5 animate-pulse rounded-pill bg-ink-muted [animation-delay:150ms]" />
            <span className="size-1.5 animate-pulse rounded-pill bg-ink-muted [animation-delay:300ms]" />
          </span>
          {intakeKey === "done" ? `${expertName} is drafting your first Checkpoint…` : `${expertName} is thinking…`}
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <FormMessage>{error}</FormMessage>
          {canRetry ? (
            <button
              type="button"
              onClick={retry}
              className="type-label inline-flex min-h-target items-center rounded-sm border border-line-strong bg-surface px-4 text-ink"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      <form
        ref={formRef}
        action={action}
        onSubmit={() => {
          setSent(textRef.current?.value.trim() ?? "");
          setRetryError(undefined);
        }}
        className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-ground pt-3 pb-4"
      >
        {intakeKey ? <input type="hidden" name="key" value={intakeKey} /> : null}
        <label htmlFor="composer" className={intakeKey ? "type-label" : "sr-only"}>
          {intakeKey ? `Your answer: ${LABEL[intakeKey]}` : `Message ${expertName}`}
        </label>

        {intakeKey && samples.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] leading-[18px] text-ink-muted">Not sure? Start from a sample and make it yours.</p>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (textRef.current) {
                      textRef.current.value = s;
                      textRef.current.focus();
                    }
                  }}
                  className="min-h-target rounded-md border border-line bg-surface px-3 py-2 text-left text-[14px] leading-5 text-ink hover:border-line-strong"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <textarea
            id="composer"
            ref={textRef}
            name="text"
            key={intakeKey ?? "chat"}
            defaultValue={state.draft}
            rows={2}
            maxLength={intakeKey ? 1000 : 4000}
            disabled={pending}
            placeholder={intakeKey ? "Type your answer" : `Message ${expertName}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            className="type-body-lg min-h-12 w-full resize-y rounded-sm border border-line-strong bg-surface px-3 py-2 text-ink placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={pending}
            aria-label={intakeKey ? "Send answer" : "Send message"}
            className={`inline-flex size-12 shrink-0 items-center justify-center rounded-sm disabled:opacity-60 ${
              primary ? "bg-ember text-on-ember" : "border border-line-strong bg-surface text-ink"
            }`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

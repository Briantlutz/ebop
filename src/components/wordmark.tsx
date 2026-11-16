// Placeholder wordmark. Swap for ebop-wordmark.svg (and later the designer's logo)
// by replacing this component; nothing else references the logo directly.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-[26px] leading-none font-bold tracking-tight text-ink ${className}`}
      aria-label="Ebop"
    >
      ebop
    </span>
  );
}

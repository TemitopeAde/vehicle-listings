import { cn } from "./utils";

/** A pulsing placeholder block, shown in place of content that is still loading. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

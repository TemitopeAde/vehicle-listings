import type { ReactNode } from "react";
import { SearchX, RefreshCw } from "lucide-react";
import { Button, cn } from "./ui/button";
export function Badge({
  children,
  status = "draft",
}: {
  children: ReactNode;
  status?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
        status === "published" || status === "approved"
          ? "bg-green-50 text-green-800"
          : status === "reserved" || status === "pending"
            ? "bg-amber-50 text-amber-800"
            : status === "sold" || status === "suspended"
              ? "bg-red-50 text-red-800"
              : "bg-slate-100 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX className="text-muted-foreground" size={32} />
      <h3 className="font-semibold">{title}</h3>
      <p className="hint max-w-md">{description}</p>
      {action}
    </div>
  );
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div role="alert" className="surface p-6">
        <p className="mb-3 text-red-700">{error}</p>
        <Button variant="outline" onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </Button>
      </div>
    );
  if (loading)
    return (
      <div aria-label="Loading" className="space-y-4 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  return null;
}

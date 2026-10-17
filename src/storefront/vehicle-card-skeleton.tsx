import type { CSSProperties } from "react";
import { Card, CardFooter, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

/** Placeholder with the vehicle card layout. */
export function VehicleCardSkeleton() {
  return (
    <Card data-sf="card" className="flex flex-col">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex items-center justify-between px-4 pt-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <CardHeader className="gap-2 p-4 pt-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardFooter className="mt-auto flex-col items-stretch gap-3 p-4 pt-0">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-24" />
      </CardFooter>
    </Card>
  );
}

/** A grid of card placeholders, laid out like the inventory grid it stands in for. */
export function VehicleGridSkeleton({
  count,
  label,
  style,
}: {
  count: number;
  label: string;
  style?: CSSProperties;
}) {
  return (
    <div className="grid gap-5" role="status" aria-busy="true" style={style}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}

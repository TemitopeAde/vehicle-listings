import { useEffect, useState } from "react";
import { cacheTtl, cachedApi } from "../shared/client";
import type { Dealer } from "../shared/schemas";
import { Button } from "./ui/button";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input, Label } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
type DealerPage = { items: Dealer[]; total: number; nextCursor: number | null };
export function DealerDirectory({
  onDealer,
}: {
  onDealer: (id: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [cursor, setCursor] = useState(0),
    [data, setData] = useState<DealerPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    cachedApi<DealerPage>(
      `dealers?public=1&search=${encodeURIComponent(search)}&cursor=${cursor}`,
      cacheTtl.dealers,
    )
      .then((r) => active && setData(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [search, cursor]);
  return (
    <section className="mt-6 grid gap-6">
      <h3 className="text-xl font-semibold">Meet our dealerships</h3>
      <Label className="max-w-sm">
        Find a dealership
        <Input
          placeholder="Search dealership name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor(0);
          }}
        />
      </Label>
      {loading && !data && (
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5"
          role="status"
          aria-busy="true"
        >
          <span className="sr-only">Loading dealerships…</span>
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="grid gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-44" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      )}
      <div
        className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5 transition-opacity ${loading ? "opacity-50" : ""}`}
        aria-busy={loading}
      >
        {data?.items.map((d) => (
          <Card key={d._id}>
            <CardHeader>
              <CardTitle>{d.businessName}</CardTitle>
              <CardDescription>
                {[d.location, d.address].filter(Boolean).join(" · ")}
              </CardDescription>
            </CardHeader>
            {d.description && (
              <CardContent className="whitespace-pre-wrap">
                {d.description}
              </CardContent>
            )}
            <CardFooter>
              <Button onClick={() => onDealer(d._id)}>
                Browse their vehicles
              </Button>
              {d.website && (
                <Button variant="outline" asChild>
                  <a href={d.website} rel="noreferrer" target="_blank">
                    Website
                  </a>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>{data?.total ?? 0} dealerships</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!cursor}
            onClick={() => setCursor(Math.max(0, cursor - 30))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={data?.nextCursor == null}
            onClick={() => setCursor(data?.nextCursor ?? 0)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

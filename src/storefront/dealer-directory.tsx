import { useEffect, useState } from "react";
import { cacheTtl, cachedApi } from "../shared/client";
import { LocaleProvider, localeProps, useI18n } from "../shared/i18n-react";
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
export function DealerDirectory(props: { onDealer: (id: string) => void }) {
  return (
    <LocaleProvider>
      <DealerDirectoryView {...props} />
    </LocaleProvider>
  );
}
function DealerDirectoryView({
  onDealer,
}: {
  onDealer: (id: string) => void;
}) {
  const { t, language, number } = useI18n();
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
    <section className="mt-6 grid gap-6" {...localeProps(language)}>
      <h3 className="text-xl font-semibold">{t("Meet our dealerships")}</h3>
      <Label className="max-w-sm">
        {t("Find a dealership")}
        <Input
          placeholder={t("Search dealership name")}
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
          <span className="sr-only">{t("Loading dealerships…")}</span>
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
          {t(error)}
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
                {t("Browse their vehicles")}
              </Button>
              {d.website && (
                <Button variant="outline" asChild>
                  <a href={d.website} rel="noreferrer" target="_blank">
                    {t("Website")}
                  </a>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>
          {t("{count} dealerships", { count: number(data?.total ?? 0) })}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!cursor}
            onClick={() => setCursor(Math.max(0, cursor - 30))}
          >
            {t("Previous")}
          </Button>
          <Button
            variant="outline"
            disabled={data?.nextCursor == null}
            onClick={() => setCursor(data?.nextCursor ?? 0)}
          >
            {t("Next")}
          </Button>
        </div>
      </div>
    </section>
  );
}

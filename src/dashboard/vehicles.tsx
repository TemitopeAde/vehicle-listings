import { useState } from "react";
import { Checkbox } from "./components/ui/checkbox";
import { assetUrl } from "../shared/client";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Download,
  Copy,
  Pencil,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Archive,
} from "lucide-react";
import { useResource } from "./hooks";
import { Button, cn } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { Badge, Empty, LoadState } from "./components/common";
import { api, download } from "./api";
import { exportCSV } from "../shared/csv";
import { vehicleCsvEnabled } from "./features";
import { categoryLabels, vehicleCategories } from "../shared/vehicle-options";
import { statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import type { Vehicle } from "../shared/schemas";
export function Vehicles({ edit }: { edit: (v: Vehicle | null) => void }) {
  const { t, money, number } = useI18n();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("recent"),
    [cursor, setCursor] = useState(0),
    [grid, setGrid] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false);
  const resource = useResource<{
    items: Vehicle[];
    total: number;
    nextCursor: number | null;
    stats: Record<string, { views: number; clicks: number }>;
  }>(
    `vehicles?search=${encodeURIComponent(search)}&status=${status}&category=${category}&sort=${sort}&cursor=${cursor}&limit=20`,
  );
  const rows = resource.data?.items ?? [];
  async function action(id: string, type: string) {
    try {
      await api("vehicles", {
        action: type,
        id,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(t("Vehicle duplicated as a draft"));
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    }
  }
  async function bulk() {
    setBusy(true);
    try {
      const r = await api<{ results: { success: boolean; error?: string }[] }>(
        "vehicles",
        { action: "bulk", ids: selected, status: confirm },
      );
      const failed = r.results.filter((r) => !r.success);
      if (failed.length)
        toast.error(
          t("{count} could not be updated: {error}", {
            count: failed.length,
            error: t(failed[0]?.error ?? ""),
          }),
        );
      else
        toast.success(
          t("{count} vehicles updated", { count: selected.length }),
        );
      setSelected([]);
      setConfirm("");
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function exportAll() {
    setBusy(true);
    try {
      const all: Vehicle[] = [];
      let next: number | null = 0;
      while (next !== null) {
        const r: { items: Vehicle[]; nextCursor: number | null } = await api<{
          items: Vehicle[];
          nextCursor: number | null;
        }>(
          `vehicles?limit=100&cursor=${next}&search=${encodeURIComponent(search)}&status=${status}&category=${category}`,
        );
        all.push(...r.items);
        next = r.nextCursor;
      }
      download("vehicle-inventory.csv", exportCSV(all));
      toast.success(t("Exported {count} vehicles", { count: all.length }));
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="section-heading">{t("Your inventory")}</h2>
          <p className="hint mt-1">
            {t("Manage every vehicle, from first draft to the final handshake.")}
          </p>
        </div>
        <div className="flex gap-2">
          {vehicleCsvEnabled && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void exportAll()}
            >
              <Download size={16} />
              {t("Export")}
            </Button>
          )}
          <Button onClick={() => edit(null)}>
            <Plus size={16} />
            {t("Add vehicle")}
          </Button>
        </div>
      </div>
      <div className="surface">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="relative min-w-48 flex-1">
            <Search
              className="absolute start-3 top-3 text-muted-foreground"
              size={16}
            />
            <input
              className="field ps-9"
              placeholder={t("Search by vehicle title…")}
              aria-label={t("Search vehicles")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCursor(0);
                setSelected([]);
              }}
            />
          </div>
          <select
            className="field w-auto"
            aria-label={t("Filter by status")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCursor(0);
              setSelected([]);
            }}
          >
            <option value="">{t("All statuses")}</option>
            {[
              "draft",
              "published",
              "reserved",
              "sold",
              "archived",
              "deleted",
            ].map((s) => (
              <option key={s} value={s}>
                {t(statusLabel[s] ?? s)}
              </option>
            ))}
          </select>
          <select
            className="field w-auto"
            aria-label={t("Filter by category")}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setCursor(0);
              setSelected([]);
            }}
          >
            <option value="">{t("All categories")}</option>
            {vehicleCategories.map((c) => (
              <option key={c} value={c}>
                {t(categoryLabels[c])}
              </option>
            ))}
          </select>
          <select
            className="field w-auto"
            aria-label={t("Sort vehicles")}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setCursor(0);
            }}
          >
            <option value="recent">{t("Recently added")}</option>
            <option value="price-asc">{t("Price: low to high")}</option>
            <option value="price-desc">{t("Price: high to low")}</option>
            <option value="year-desc">{t("Newest model year")}</option>
          </select>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={grid ? "ghost" : "secondary"}
              size="sm"
              aria-label={t("Table view")}
              onClick={() => setGrid(false)}
            >
              <List size={16} />
            </Button>
            <Button
              variant={grid ? "secondary" : "ghost"}
              size="sm"
              aria-label={t("Grid view")}
              onClick={() => setGrid(true)}
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center px-4 py-3 bg-green-50 border-b">
            <p className="text-sm font-medium me-auto">
              {t("{count} selected", { count: selected.length })}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirm("published")}
            >
              {t("Publish")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirm("archived")}
            >
              <Archive size={14} />
              {t("Archive")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              {t("Clear")}
            </Button>
          </div>
        )}
        <div className="px-4">
          <LoadState {...resource} retry={() => void resource.reload()} />
        </div>
        {!resource.loading &&
          !resource.error &&
          (rows.length === 0 ? (
            <Empty
              title="No vehicles found"
              description="Try another search or add your first vehicle."
              action={
                <Button onClick={() => edit(null)}>{t("Add vehicle")}</Button>
              }
            />
          ) : grid ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
              {rows.map((v) => (
                <div className="surface overflow-hidden" key={v._id}>
                  <button className="w-full text-start" onClick={() => edit(v)}>
                    <img
                      src={assetUrl(v.media[0]?.url ?? "/media/demo-car.svg")}
                      title={v.media[0]?.credit}
                      alt={v.media[0]?.alt ?? v.title}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="p-4">
                      <div className="flex justify-between gap-2">
                        <h3 className="font-semibold text-sm">{v.title}</h3>
                        <Badge status={v.status}>
                          {v.demo
                            ? t("Demo")
                            : t(statusLabel[v.status] ?? v.status)}
                        </Badge>
                      </div>
                      <p className="hint text-xs mt-2">
                        {number(v.mileage)} {t(v.mileageUnit)} · {t(v.fuel)} ·{" "}
                        {t(v.transmission)}
                      </p>
                      <p className="mt-3 font-semibold">
                        {money(v.price, v.currency)}
                      </p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-4">
                      <Checkbox
                        aria-label={t("Select all vehicles on this page")}
                        indeterminate={
                          rows.some((v) => selected.includes(v._id)) &&
                          !rows.every((v) => selected.includes(v._id))
                        }
                        checked={
                          rows.length > 0 &&
                          rows.every((v) => selected.includes(v._id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? rows.map((v) => v._id) : [],
                          )
                        }
                      />
                    </th>
                    {[
                      "Vehicle",
                      "Status",
                      "Price",
                      "Mileage",
                      "Views",
                      "Clicks",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="text-start p-4 font-medium">
                        {t(heading)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr
                      key={v._id}
                      className={cn(
                        "border-t hover:bg-muted/40",
                        selected.includes(v._id) && "bg-green-50/50",
                      )}
                    >
                      <td className="p-4">
                        <Checkbox
                          aria-label={t("Select {title}", { title: v.title })}
                          checked={selected.includes(v._id)}
                          onChange={() => toggle(v._id)}
                        />
                      </td>
                      <td className="p-4">
                        <button
                          className="flex items-center gap-3 text-start"
                          onClick={() => edit(v)}
                        >
                          <img
                            src={assetUrl(
                              v.media[0]?.url ?? "/media/demo-car.svg",
                            )}
                            title={v.media[0]?.credit}
                            alt=""
                            className="w-20 h-14 rounded-md object-cover"
                          />
                          <span>
                            <span className="block font-semibold whitespace-nowrap">
                              {v.make} {v.model}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {v.year} · {t(v.bodyStyle)}
                              {v.demo ? t(" · Demo") : ""}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="p-4">
                        <Badge status={v.status}>
                          {t(statusLabel[v.status] ?? v.status)}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium whitespace-nowrap">
                        {money(v.price, v.currency)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {number(v.mileage)} {t(v.mileageUnit)}
                      </td>
                      <td className="p-4 tabular-nums">
                        {number(resource.data?.stats[v._id]?.views ?? 0)}
                      </td>
                      <td className="p-4 tabular-nums">
                        {number(resource.data?.stats[v._id]?.clicks ?? 0)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("Edit {title}", { title: v.title })}
                            onClick={() => edit(v)}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("Duplicate {title}", { title: v.title })}
                            onClick={() => void action(v._id, "duplicate")}
                          >
                            <Copy size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        <div className="border-t px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t("{total} vehicles · {from}–{to} shown", {
              total: resource.data?.total ?? 0,
              from: rows.length ? cursor + 1 : 0,
              to: cursor + rows.length,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={cursor === 0}
              onClick={() => {
                setCursor((c) => Math.max(0, c - 20));
                setSelected([]);
              }}
            >
              <ChevronLeft size={14} />
              {t("Previous")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={resource.data?.nextCursor == null}
              onClick={() => {
                setCursor(resource.data?.nextCursor ?? 0);
                setSelected([]);
              }}
            >
              {t("Next")}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm("");
        }}
      >
        <DialogContent>
          <DialogTitle className="section-heading">
            {t(
              confirm === "published"
                ? "Publish {count} vehicles?"
                : "Archive {count} vehicles?",
              { count: selected.length },
            )}
          </DialogTitle>
          <DialogDescription className="hint mt-2 mb-6">
            {confirm === "published"
              ? t(
                  "Published listings are visible to visitors. Each vehicle must have a photo, description and approved dealership.",
                )
              : t(
                  "Archived listings will be hidden from your storefront. You can restore them as drafts.",
                )}
          </DialogDescription>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirm("")}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void bulk()} disabled={busy} pending={busy}>
              {t("Confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

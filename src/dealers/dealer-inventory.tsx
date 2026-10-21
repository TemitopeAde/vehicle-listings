import { useMemo, useState } from "react";
import { CarFront, MapPin, Pencil, Plus, Search } from "lucide-react";
import type { Vehicle } from "../shared/schemas";
import { assetUrl } from "../shared/client";
import { statusLabel as statusNames } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import { Button, cn } from "../dashboard/components/ui/button";
import { Badge } from "../dashboard/components/common";

const filters = [
  { value: "all", label: "All" },
  { value: "published", label: "For sale" },
  { value: "draft", label: "Drafts" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
] as const;
type Filter = (typeof filters)[number]["value"];

function statusText(
  status: string,
  t: (key: string) => string,
) {
  if (status === "published") return t("For sale");
  return t(statusNames[status] ?? status);
}

export function DealerInventory({
  businessName,
  location,
  vehicles,
  onAdd,
  onEdit,
}: {
  businessName: string;
  location: string;
  vehicles: Vehicle[];
  onAdd: () => void;
  onEdit: (vehicle: Vehicle) => void;
}) {
  const { t, money, number } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const counts = useMemo(() => {
    const count = (status: string) =>
      vehicles.filter((vehicle) => vehicle.status === status).length;
    return {
      all: vehicles.length,
      published: count("published"),
      draft: count("draft"),
      reserved: count("reserved"),
      sold: count("sold"),
    };
  }, [vehicles]);
  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter(
      (vehicle) =>
        (filter === "all" || vehicle.status === filter) &&
        (!query ||
          `${vehicle.title} ${vehicle.make} ${vehicle.model}`
            .toLowerCase()
            .includes(query)),
    );
  }, [vehicles, filter, search]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {businessName}
            </h1>
            <Badge status="approved">{t("Approved")}</Badge>
          </div>
          {location && (
            <p className="hint mt-2 flex items-center gap-1.5">
              <MapPin size={14} aria-hidden="true" />
              {location}
            </p>
          )}
        </div>
        <Button type="button" onClick={onAdd}>
          <Plus size={16} aria-hidden="true" />
          {t("Add vehicle")}
        </Button>
      </header>

      <dl className="surface mt-8 grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
        {(
          [
            ["Listings", counts.all],
            ["For sale", counts.published],
            ["Drafts", counts.draft],
            ["Sold", counts.sold],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="px-5 py-4">
            <dt className="hint">{t(label)}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {vehicles.length === 0 ? (
        <section className="surface mt-6 flex flex-col items-center px-6 py-14 text-center">
          <span className="rounded-full bg-muted p-3 text-primary">
            <CarFront size={24} aria-hidden="true" />
          </span>
          <h2 className="section-heading mt-4">{t("Add your first vehicle")}</h2>
          <p className="hint mt-2 max-w-sm">
            {t(
              "Fill in the details, add photos, and publish it so buyers can find it on the site.",
            )}
          </p>
          <Button type="button" className="mt-6" onClick={onAdd}>
            <Plus size={16} aria-hidden="true" />
            {t("Add vehicle")}
          </Button>
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="dealer-vehicles-heading">
          <h2 id="dealer-vehicles-heading" className="sr-only">
            {t("Your vehicles")}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label={t("Filter by status")}
              className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
            >
              {filters.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm",
                    filter === value
                      ? "bg-white font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(label)}
                  <span className="ml-1.5 tabular-nums opacity-60">
                    {counts[value]}
                  </span>
                </button>
              ))}
            </div>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">{t("Search your vehicles")}</span>
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                className="field pl-9"
                placeholder={t("Search your vehicles")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="surface mt-4 p-8 text-center hint" role="status">
              {t("No vehicles match this filter.")}
            </p>
          ) : (
            <ul className="surface mt-4 divide-y overflow-hidden">
              {shown.map((vehicle) => (
                <li key={vehicle._id}>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50"
                    onClick={() => onEdit(vehicle)}
                    aria-label={t("Edit {title}", { title: vehicle.title })}
                  >
                    <img
                      src={assetUrl(
                        vehicle.media[0]?.url ?? "/media/demo-car.svg",
                      )}
                      alt=""
                      className="h-16 w-24 shrink-0 rounded-md bg-muted object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {vehicle.title}
                      </span>
                      <span className="hint mt-0.5 block truncate">
                        {[
                          vehicle.year,
                          vehicle.mileage
                            ? `${number(vehicle.mileage)} ${vehicle.mileageUnit}`
                            : "",
                          vehicle.location,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block font-semibold tabular-nums">
                        {money(vehicle.price, vehicle.currency)}
                      </span>
                    </span>
                    <Badge status={vehicle.status}>
                      {statusText(vehicle.status, t)}
                    </Badge>
                    <Pencil
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground group-hover:text-foreground"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

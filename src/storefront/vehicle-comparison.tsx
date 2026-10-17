import { useElementStyle } from "./element-style";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type HTMLAttributes,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, GitCompareArrows, Minus, X } from "lucide-react";
import type { Vehicle } from "../shared/schemas";
import { money } from "../shared/utils";
import { categoryLabels, isCommercial } from "../shared/vehicle-options";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/input";
import { cn } from "./ui/utils";
import { VehiclePhoto } from "./vehicle-photo";

export const compareLimit = 3;

type Spec = {
  label: string;
  value: (v: Vehicle) => string;
  /** Numeric score where higher is better; used to highlight the best vehicle. */
  score?: (v: Vehicle) => number | undefined;
};
const known = (value: string | number | undefined | null) =>
  value === undefined || value === null || value === "" || value === 0
    ? "—"
    : String(value);
const groups: { title: string; specs: Spec[]; commercialOnly?: boolean }[] = [
  {
    title: "Overview",
    specs: [
      {
        label: "Price",
        value: (v) => money(v.price, v.currency),
        score: (v) => -v.price,
      },
      { label: "Category", value: (v) => categoryLabels[v.category] },
      { label: "Year", value: (v) => String(v.year), score: (v) => v.year },
      {
        label: "Mileage",
        value: (v) => `${v.mileage.toLocaleString("en")} ${v.mileageUnit}`,
        // Compare distances in one unit so km and mi listings rank fairly.
        score: (v) => -(v.mileageUnit === "mi" ? v.mileage * 1.609 : v.mileage),
      },
      {
        label: "Condition",
        value: (v) => v.condition[0]!.toUpperCase() + v.condition.slice(1),
      },
      { label: "Location", value: (v) => known(v.location) },
    ],
  },
  {
    title: "Performance",
    specs: [
      { label: "Engine", value: (v) => known(v.engineSize) },
      {
        label: "Horsepower",
        value: (v) => (v.horsepower ? `${v.horsepower} hp` : "—"),
        score: (v) => v.horsepower || undefined,
      },
      { label: "Transmission", value: (v) => v.transmission },
      { label: "Drivetrain", value: (v) => known(v.drivetrain) },
      { label: "Fuel", value: (v) => v.fuel },
    ],
  },
  {
    title: "Body",
    specs: [
      { label: "Body type", value: (v) => v.bodyStyle },
      { label: "Doors", value: (v) => known(v.doors) },
      { label: "Seats", value: (v) => known(v.seats) },
      { label: "Exterior", value: (v) => known(v.exteriorColor) },
      { label: "Interior", value: (v) => known(v.interiorColor) },
    ],
  },
  {
    title: "Load",
    commercialOnly: true,
    specs: [
      { label: "Axles", value: (v) => known(v.axles) },
      {
        label: "Gross weight",
        value: (v) =>
          v.grossWeight ? `${v.grossWeight.toLocaleString("en")} kg` : "—",
      },
      {
        label: "Payload",
        value: (v) =>
          v.payload ? `${v.payload.toLocaleString("en")} kg` : "—",
        score: (v) => v.payload || undefined,
      },
      {
        label: "Body length",
        value: (v) => (v.bodyLength ? `${v.bodyLength} m` : "—"),
      },
    ],
  },
];

/** IDs of the vehicles that score best on a spec, or none when they tie or can't be compared. */
function best(spec: Spec, vehicles: Vehicle[]) {
  if (!spec.score || vehicles.length < 2) return new Set<string>();
  // Prices in different currencies aren't comparable.
  if (
    spec.label === "Price" &&
    new Set(vehicles.map((v) => v.currency)).size > 1
  )
    return new Set<string>();
  const scores = vehicles.map((v) => spec.score!(v));
  const known = scores.filter((s): s is number => s !== undefined);
  if (known.length < 2) return new Set<string>();
  const top = Math.max(...known);
  if (known.every((s) => s === top)) return new Set<string>();
  return new Set(
    vehicles.filter((_, i) => scores[i] === top).map((v) => v._id),
  );
}

export function CompareToggle({
  vehicle,
  comparison,
  setComparison,
  className,
}: {
  className?: string;
  vehicle: Vehicle;
  comparison: Vehicle[];
  setComparison: Dispatch<SetStateAction<Vehicle[]>>;
}) {
  const elementStyle = useElementStyle();
  const checked = comparison.some((c) => c._id === vehicle._id);
  const full = !checked && comparison.length >= compareLimit;
  return (
    <label
      {...elementStyle("compare-toggle")}
      className={cn(
        "flex items-center gap-2 text-sm",
        full && "cursor-not-allowed opacity-60",
        className,
      )}
      title={
        full ? `You can compare up to ${compareLimit} vehicles` : undefined
      }
    >
      <Checkbox
        className="mt-0"
        checked={checked}
        disabled={full}
        onChange={(e) =>
          setComparison((current) =>
            e.target.checked
              ? current.length < compareLimit
                ? [...current, vehicle]
                : current
              : current.filter((c) => c._id !== vehicle._id),
          )
        }
      />
      Compare
    </label>
  );
}

function Thumb({
  vehicle,
  className,
  credit = false,
}: {
  vehicle: Vehicle;
  className?: string;
  credit?: boolean;
}) {
  const image = vehicle.media[0];
  return image ? (
    <VehiclePhoto
      media={image}
      credit={credit}
      alt=""
      loading="lazy"
      className={cn("aspect-[16/10] w-full rounded-md object-cover", className)}
    />
  ) : (
    <div
      className={cn("aspect-[16/10] w-full rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

/**
 * Fixed to the bottom of the screen while vehicles are selected. It is portalled to `document.body`
 * because Wix site containers can clip overflow or transform, which would break fixed positioning.
 */
export function CompareTray({
  comparison,
  setComparison,
  onCompare,
  scope,
  inline = false,
}: {
  comparison: Vehicle[];
  setComparison: Dispatch<SetStateAction<Vehicle[]>>;
  onCompare: () => void;
  /** Theme attributes of the widget root, so merchant styling applies outside the widget. */
  scope: HTMLAttributes<HTMLDivElement>;
  /** Render in place instead, e.g. in the editor where a floating bar would cover the canvas. */
  inline?: boolean;
}) {
  const trayRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => setMounted(true), []);
  const visible = comparison.length > 0;
  useEffect(() => {
    const tray = trayRef.current;
    if (inline || !visible || !tray || typeof ResizeObserver === "undefined")
      return;
    const observer = new ResizeObserver(() => setHeight(tray.offsetHeight));
    observer.observe(tray);
    return () => observer.disconnect();
  }, [inline, visible, mounted]);
  if (!visible) return null;
  const ready = comparison.length >= 2;
  const tray = (
    <section
      ref={trayRef}
      aria-label="Vehicles to compare"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3",
        inline
          ? "mt-6"
          : "pointer-events-auto mx-auto w-full max-w-5xl shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
      )}
    >
      <ul className="grid min-w-0 flex-1 grid-cols-3 gap-2">
        {Array.from({ length: compareLimit }, (_, i) => {
          const v = comparison[i];
          return v ? (
            <li
              key={v._id}
              className="relative flex min-w-0 items-center gap-2 rounded-md border p-1.5 pr-8"
            >
              <Thumb vehicle={v} className="w-16 shrink-0 max-sm:w-full" />
              <span className="truncate text-xs font-medium max-sm:sr-only">
                {v.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 px-0"
                aria-label={`Remove ${v.title} from comparison`}
                onClick={() =>
                  setComparison((c) => c.filter((x) => x._id !== v._id))
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ) : (
            <li
              key={`empty-${i}`}
              className="flex min-h-[46px] items-center justify-center rounded-md border border-dashed px-2 text-center text-xs text-muted-foreground"
            >
              Add a vehicle
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-2 max-sm:w-full">
        <Button variant="ghost" size="sm" onClick={() => setComparison([])}>
          Clear
        </Button>
        <Button
          className="max-sm:flex-1"
          disabled={!ready}
          title={ready ? undefined : "Select at least 2 vehicles"}
          onClick={onCompare}
        >
          <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          Compare {comparison.length}
        </Button>
      </div>
    </section>
  );
  if (inline) return tray;
  return (
    <>
      {/* Reserves room so the bar never covers the last vehicles or the page controls. */}
      <div aria-hidden="true" style={{ height: height + 24 }} />
      {mounted &&
        createPortal(
          <div
            {...scope}
            className={cn("autohaus", scope.className)}
            style={{
              ...scope.style,
              position: "fixed",
              insetInline: 0,
              bottom: 0,
              zIndex: 2147483000,
              width: "auto",
              padding: "0 12px 12px",
              background: "transparent",
              pointerEvents: "none",
            }}
          >
            {tray}
          </div>,
          document.body,
        )}
    </>
  );
}

export function VehicleComparison({
  comparison,
  setComparison,
  onBack,
  onView,
}: {
  comparison: Vehicle[];
  setComparison: Dispatch<SetStateAction<Vehicle[]>>;
  onBack: () => void;
  onView?: (v: Vehicle) => void;
}) {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const differs = (values: string[]) => new Set(values).size > 1;
  const shownGroups = groups.filter(
    (g) =>
      !g.commercialOnly || comparison.some((v) => isCommercial(v.category)),
  );
  const features = [...new Set(comparison.flatMap((v) => v.features))].sort();
  const visibleFeatures = differencesOnly
    ? features.filter((f) =>
        differs(comparison.map((v) => String(v.features.includes(f)))),
      )
    : features;
  const columns = `minmax(96px,0.7fr) repeat(${comparison.length},minmax(170px,1fr))`;
  return (
    <section className="grid gap-5" aria-labelledby="compare-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to inventory
          </Button>
          <h3
            id="compare-heading"
            data-sf="heading"
            className="mt-3 text-2xl font-semibold tracking-tight"
          >
            Compare vehicles
          </h3>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            className="mt-0"
            checked={differencesOnly}
            onChange={(e) => setDifferencesOnly(e.target.checked)}
          />
          Show only differences
        </label>
      </div>
      {comparison.length < 2 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Add at least one more vehicle to compare.
        </p>
      )}
      {/* Labels stay pinned while the vehicle columns scroll on narrow screens. */}
      <div
        className="overflow-x-auto rounded-lg border"
        role="table"
        aria-label="Vehicle comparison"
      >
        <div
          className="grid min-w-fit"
          style={{ gridTemplateColumns: columns }}
        >
          <div role="row" className="contents">
            <div
              role="columnheader"
              className="sticky left-0 z-[1] border-b bg-background p-3"
            />
            {comparison.map((v) => (
              <div
                key={v._id}
                role="columnheader"
                className="relative grid content-start gap-2 border-b border-l p-3"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-4 top-4 z-[1] h-8 w-8 rounded-full px-0"
                  aria-label={`Remove ${v.title} from comparison`}
                  onClick={() =>
                    setComparison((c) => c.filter((x) => x._id !== v._id))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
                <Thumb vehicle={v} credit />
                <span
                  data-sf="vehicle-title"
                  className="text-sm font-semibold leading-snug"
                >
                  {v.title}
                </span>
                <span data-sf="price" className="text-lg font-semibold">
                  {money(v.price, v.currency)}
                </span>
                {onView && (
                  <Button size="sm" className="w-fit" onClick={() => onView(v)}>
                    View vehicle
                  </Button>
                )}
              </div>
            ))}
          </div>
          {shownGroups.map((group) => {
            const rows = group.specs.filter(
              (s) => !differencesOnly || differs(comparison.map(s.value)),
            );
            if (rows.length === 0) return null;
            return (
              <div key={group.title} role="rowgroup" className="contents">
                <div
                  role="row"
                  className="col-span-full bg-muted py-2 text-xs font-semibold uppercase tracking-wide text-foreground"
                >
                  <span role="rowheader" className="sticky left-0 px-3">
                    {group.title}
                  </span>
                </div>
                {rows.map((spec) => {
                  const winners = best(spec, comparison);
                  return (
                    <div key={spec.label} role="row" className="contents">
                      <div
                        role="rowheader"
                        className="sticky left-0 z-[1] border-b bg-background p-3 text-sm text-muted-foreground"
                      >
                        {spec.label}
                      </div>
                      {comparison.map((v) => (
                        <div
                          key={v._id}
                          role="cell"
                          data-sf="vehicle-meta"
                          className={cn(
                            "flex flex-wrap items-center gap-2 border-b border-l p-3 text-sm",
                            winners.has(v._id) && "font-semibold",
                          )}
                        >
                          {spec.value(v)}
                          {winners.has(v._id) && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                              Best
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {visibleFeatures.length > 0 && (
            <div role="rowgroup" className="contents">
              <div
                role="row"
                className="col-span-full bg-muted py-2 text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                <span role="rowheader" className="sticky left-0 px-3">
                  Features
                </span>
              </div>
              {visibleFeatures.map((feature) => (
                <div key={feature} role="row" className="contents">
                  <div
                    role="rowheader"
                    className="sticky left-0 z-[1] border-b bg-background p-3 text-sm text-muted-foreground"
                  >
                    {feature}
                  </div>
                  {comparison.map((v) => (
                    <div
                      key={v._id}
                      role="cell"
                      className="flex items-center border-b border-l p-3"
                    >
                      {v.features.includes(feature) ? (
                        <Check
                          className="h-4 w-4 text-primary"
                          aria-label="Included"
                        />
                      ) : (
                        <Minus
                          className="h-4 w-4 text-muted-foreground"
                          aria-label="Not listed"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {differencesOnly &&
        shownGroups.every((g) =>
          g.specs.every((s) => !differs(comparison.map(s.value))),
        ) &&
        visibleFeatures.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            These vehicles have identical specifications.
          </p>
        )}
    </section>
  );
}

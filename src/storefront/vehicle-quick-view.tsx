import type { HTMLAttributes } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { conditionLabel, statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import type { Vehicle } from "../shared/schemas";
import { isTrailer } from "../shared/vehicle-options";
import { Button } from "./ui/button";
import { AddToCart } from "./add-to-cart";
import { Badge } from "./ui/card";
import { cn } from "./ui/utils";
import { VehiclePhoto } from "./vehicle-photo";

function specs(
  v: Vehicle,
  t: (key: string, vars?: Record<string, string | number>) => string,
  formatNumber: (value: number) => string,
): [string, string][] {
  const rows: [string, string | number | undefined][] = isTrailer(v.category)
    ? [
        ["Year", String(v.year)],
        ["Body", t(v.bodyStyle)],
        ["Axles", v.axles ? formatNumber(v.axles) : undefined],
        [
          "Length",
          v.bodyLength
            ? t("{length} m", { length: formatNumber(v.bodyLength) })
            : undefined,
        ],
        [
          "Payload",
          v.payload
            ? t("{weight} kg", { weight: formatNumber(v.payload) })
            : undefined,
        ],
        ["Location", v.location],
      ]
    : [
        ["Year", String(v.year)],
        ["Mileage", `${formatNumber(v.mileage)} ${v.mileageUnit}`],
        ["Transmission", t(v.transmission)],
        ["Fuel", t(v.fuel)],
        ["Body", t(v.bodyStyle)],
        ["Location", v.location],
      ];
  return rows
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([label, value]) => [label, String(value)]);
}

/**
 * Minimal vehicle summary in a modal. Portalled to `document.body` inside the widget's theme scope,
 * so Wix site containers can't clip it and merchant styling still applies.
 */
export function VehicleQuickView({
  vehicle,
  badge,
  onClose,
  returnFocus,
  onViewDetails,
  scope,
  preview = false,
}: {
  vehicle: Vehicle | null;
  badge?: string;
  onClose: () => void;
  /** The button that opened the dialog; Radix only restores focus to its own triggers. */
  returnFocus?: HTMLElement | null;
  onViewDetails: (v: Vehicle) => void;
  scope: HTMLAttributes<HTMLDivElement>;
  /** Editor preview: the cart button is shown but inactive. */
  preview?: boolean;
}) {
  const { t, money, number } = useI18n();
  const photo = vehicle?.media[0];
  const badgeLabel = badge
    ? t(statusLabel[badge] ?? conditionLabel[badge] ?? badge)
    : "";
  return (
    <Dialog.Root
      open={vehicle !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog.Portal>
        <div
          {...scope}
          className={cn("autohaus", scope.className)}
          style={{
            ...scope.style,
            padding: 0,
            background: "transparent",
            width: "auto",
          }}
        >
          <Dialog.Overlay className="fixed inset-0 z-[2147483000] bg-black/50" />
          {vehicle && (
            <Dialog.Content
              aria-describedby={undefined}
              onCloseAutoFocus={(e) => {
                if (!returnFocus?.isConnected) return;
                e.preventDefault();
                returnFocus.focus();
              }}
              className="fixed left-1/2 top-1/2 z-[2147483001] grid max-h-[90vh] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-background shadow-[0_20px_60px_rgba(0,0,0,0.3)] focus:outline-none"
            >
              {photo && (
                <VehiclePhoto
                  media={photo}
                  alt={photo.alt || vehicle.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              )}
              <div className="grid gap-4 p-5">
                <div className="grid gap-1.5 pr-8">
                  {badge && <Badge className="w-fit">{badgeLabel}</Badge>}
                  <Dialog.Title
                    data-sf="vehicle-title"
                    className="text-lg font-semibold leading-snug"
                  >
                    {vehicle.title}
                  </Dialog.Title>
                  <p data-sf="price" className="text-xl font-semibold">
                    {money(vehicle.price, vehicle.currency)}
                    {vehicle.negotiable && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {t("Negotiable")}
                      </span>
                    )}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  {specs(vehicle, t, number).map(([label, value]) => (
                    <div key={label} className="grid min-w-0 gap-0.5">
                      <dt className="text-xs text-muted-foreground">
                        {t(label)}
                      </dt>
                      <dd
                        data-sf="vehicle-meta"
                        className="truncate text-sm font-medium"
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <AddToCart
                  key={vehicle._id}
                  vehicle={vehicle}
                  preview={preview}
                />
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => onViewDetails(vehicle)}
                >
                  {t("View full details")}
                </Button>
              </div>
              {/* Dark and unthemed so it stays visible over any photo. */}
              <Dialog.Close
                className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/70 text-white transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label={t("Close quick view")}
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </Dialog.Content>
          )}
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

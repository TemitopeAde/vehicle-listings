import { useEffect, useState } from "react";
import { api, cacheTtl, cachedApi } from "../shared/client";
import { conditionLabel, statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import { payment, vehicleDetailsUrl } from "../shared/utils";
import { siteNavigation } from "../shared/site-navigation";
import type { Vehicle } from "../shared/schemas";
import {
  categoryLabels,
  isCommercial,
  isTrailer,
} from "../shared/vehicle-options";
import { Button } from "./ui/button";
import { Alert, Badge } from "./ui/card";
import { Input, Label, NativeSelect } from "./ui/input";
import { VehicleCard } from "./vehicle-card";
import { DetailGallery } from "./vehicle-gallery";
import { VehicleContact, type PublicDealer } from "./vehicle-contact";
// import { AddToCart } from "./add-to-cart";
import { VehicleShare } from "./vehicle-share";
import { VehicleVideo } from "./vehicle-video";
import { VehicleDetailSkeleton } from "./vehicle-detail-skeleton";
import { PriceHistory } from "./price-history";
import { descriptionHtml, descriptionText } from "../shared/rich-text";

function VehicleDescription({ value }: { value: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(descriptionHtml(value));
  }, [value]);
  if (html)
    return (
      <div
        className="break-words leading-7 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  return (
    <p className="whitespace-pre-wrap break-words leading-7">
      {/<\/?[a-z]/i.test(value) ? descriptionText(value) : value}
    </p>
  );
}

/** A typed number limited to 0..max; empty or invalid input counts as 0. */
function clamp(value: string, max: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

/** Puts the Wix page at the top. The widget document is scrolled too, for the local preview. */
async function scrollPageToTop() {
  window.scrollTo(0, 0);
  try {
    const { window: siteWindow } = await import("@wix/site-window");
    await siteWindow.scrollTo(0, 0, { scrollAnimation: false });
  } catch {
    window.scrollTo(0, 0);
  }
}

export function VehicleDetail({
  slug,
  initialVehicle,
  consent,
  onRelated,
  preview = false,
}: {
  /** The vehicle's public slug, used to look it up. */
  slug: string;
  initialVehicle?: Vehicle;
  consent: boolean;
  onRelated?: (slug: string) => void;
  /** Editor preview: show `initialVehicle` without calling the API. */
  preview?: boolean;
}) {
  const { t, money, number } = useI18n();
  const [vehicle, setVehicle] = useState<Vehicle | null>(
      initialVehicle ?? null,
    ),
    [dealer, setDealer] = useState<PublicDealer | null>(null),
    [related, setRelated] = useState<Vehicle[]>([]),
    [error, setError] = useState(""),
    [navigationError, setNavigationError] = useState(""),
    [loading, setLoading] = useState(!initialVehicle),
    // Kept as typed so a field can be cleared; the payment uses the clamped number.
    [deposit, setDeposit] = useState("0"),
    [rate, setRate] = useState("12"),
    [months, setMonths] = useState(48);
  useEffect(() => {
    if (preview) return;
    let active = true;
    setLoading(true);
    setError("");
    setRelated([]);
    cachedApi<Vehicle>(
      `vehicles?public=1&slug=${encodeURIComponent(slug)}`,
      cacheTtl.vehicle,
    )
      .then(async (v) => {
        if (!active) return;
        setVehicle(v);
        setLoading(false);
        const [seller, cars] = await Promise.allSettled([
          cachedApi<PublicDealer | null>(
            `dealers?public=1&id=${encodeURIComponent(v.dealerId)}`,
            cacheTtl.dealers,
          ),
          cachedApi<{ items: Vehicle[] }>(
            `vehicles?public=1&similar=${encodeURIComponent(v._id)}&limit=4`,
            cacheTtl.vehicle,
          ),
        ]);
        if (!active) return;
        if (seller.status === "fulfilled") setDealer(seller.value);
        else setDealer(null);
        if (cars.status === "fulfilled")
          setRelated(cars.value.items.filter((x) => x._id !== v._id));
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [slug, preview]);
  useEffect(() => {
    if (preview) return;
    void scrollPageToTop();
  }, [slug, preview]);
  useEffect(() => {
    if (preview || !vehicle) return;
    void scrollPageToTop();
  }, [preview, vehicle?._id]);
  useEffect(() => {
    if (consent && vehicle)
      void api("events", {
        vehicleId: vehicle._id,
        eventType: "view",
        consent: true,
      }).catch(() => {});
  }, [consent, vehicle?._id]);
  function track(channel: string) {
    if (consent && vehicle)
      void api("events", {
        vehicleId: vehicle._id,
        eventType: channel,
        consent: true,
      }).catch(() => {});
  }
  function openRelated(relatedVehicle: Vehicle) {
    void scrollPageToTop();
    if (onRelated) {
      onRelated(relatedVehicle.slug);
      return;
    }
    setNavigationError("");
    siteNavigation.rememberSitePage();
    void siteNavigation
      .to(vehicleDetailsUrl(relatedVehicle.slug))
      .catch(() =>
        setNavigationError(
          "Could not open the vehicle page. Please try again.",
        ),
      );
  }
  if (loading) return <VehicleDetailSkeleton />;
  if (error)
    return (
      <Alert variant="destructive" role="alert">
        {t(error)}
      </Alert>
    );
  if (!vehicle) return null;
  const notSpecified = (value: string | number) => value || t("Not specified");
  const weight = (value: number) =>
    value ? t("{weight} kg", { weight: number(value) }) : t("Not specified");
  const trailer = isTrailer(vehicle.category);
  const specs: [string, string | number][] = [
    ["Category", t(categoryLabels[vehicle.category])],
    ["Year", String(vehicle.year)],
    ...(trailer
      ? []
      : ([
          ["Mileage", `${number(vehicle.mileage)} ${vehicle.mileageUnit}`],
          ["Transmission", t(vehicle.transmission)],
          ["Fuel", t(vehicle.fuel)],
        ] as [string, string][])),
    [vehicle.category === "car" ? "Body" : "Body type", t(vehicle.bodyStyle)],
    ["Condition", t(conditionLabel[vehicle.condition] ?? vehicle.condition)],
    ...(trailer
      ? []
      : ([
          ["Engine", notSpecified(vehicle.engineSize)],
          [
            vehicle.category === "lorry" ? "Axle configuration" : "Drivetrain",
            notSpecified(vehicle.drivetrain),
          ],
        ] as [string, string | number][])),
    ...(isCommercial(vehicle.category)
      ? ([
          ["Axles", notSpecified(vehicle.axles)],
          ["Gross weight", weight(vehicle.grossWeight)],
          ["Payload", weight(vehicle.payload)],
          [
            "Body length",
            vehicle.bodyLength
              ? t("{length} m", { length: number(vehicle.bodyLength) })
              : t("Not specified"),
          ],
        ] as [string, string | number][])
      : []),
    ["Color", notSpecified(vehicle.exteriorColor)],
    ...(trailer
      ? []
      : ([
          ["Seats", vehicle.seats],
          ["Doors", vehicle.doors],
        ] as [string, number][])),
  ];
  return (
    <div className="mt-6 grid gap-8">
      {navigationError && (
        <Alert variant="destructive" role="alert">
          {t(navigationError)}
        </Alert>
      )}
      <header className="sf-detail-header flex flex-wrap items-end justify-between gap-5">
        <div className="grid gap-2">
          <Badge>
            {t(
              vehicle.status === "published"
                ? (conditionLabel[vehicle.condition] ?? vehicle.condition)
                : (statusLabel[vehicle.status] ?? vehicle.status),
            )}
          </Badge>
          <h2 className="sf-title text-3xl font-semibold tracking-tight">
            {vehicle.title}
          </h2>
          <p className="text-muted-foreground">{vehicle.location}</p>
        </div>
        <div className="sf-price-block ml-auto grid justify-items-end gap-3">
          <p data-sf="price" className="text-2xl font-semibold">
            {money(vehicle.price, vehicle.currency)}
            {vehicle.negotiable && (
              <small className="text-sm font-normal text-muted-foreground">
                {" "}
                · {t("Negotiable")}
              </small>
            )}
          </p>
          {/* <AddToCart
            key={vehicle._id}
            vehicle={vehicle}
            preview={preview}
            className="w-full min-w-[12rem]"
          /> */}
          <VehicleShare vehicle={vehicle} />
        </div>
      </header>
      <div className="sf-detail grid grid-cols-1 gap-8">
        <div className="grid min-w-0 content-start gap-6">
          <DetailGallery
            key={vehicle._id}
            media={vehicle.media}
            title={vehicle.title}
          />
          {vehicle.videos.length > 0 && (
            <section className="grid gap-4" aria-label={t("Vehicle videos")}>
              <h3 className="text-lg font-semibold">{t("Videos")}</h3>
              {vehicle.videos.map((video, index) => (
                <VehicleVideo
                  key={video.fileId ?? video.url}
                  src={video.url}
                  poster={video.poster}
                  label={t("Vehicle video {index}", {
                    index: number(index + 1),
                  })}
                />
              ))}
            </section>
          )}
          <section className="grid gap-4">
            <h3 className="text-lg font-semibold">{t("Vehicle details")}</h3>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-5">
              {specs.map(([label, value]) => (
                <div key={label} className="border-b pb-3">
                  <dt className="mb-1 text-xs text-muted-foreground">
                    {t(label)}
                  </dt>
                  <dd className="capitalize">
                    {typeof value === "number" ? number(value) : value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">{t("About this vehicle")}</h3>
            <VehicleDescription value={vehicle.description} />
          </section>
          {vehicle.features.length > 0 && (
            <section className="grid gap-3">
              <h3 className="text-lg font-semibold">
                {t("Features & equipment")}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {vehicle.features.map((f) => (
                  <li key={f}>
                    <Badge variant="outline" className="normal-case">
                      ✓ {f}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {vehicle.taxDisclaimer && (
            <p className="text-xs text-muted-foreground">
              {vehicle.taxDisclaimer}
            </p>
          )}
          <details className="rounded-lg border p-5">
            <summary className="font-medium">
              {t("Illustrative payment estimator")}
            </summary>
            <div className="mt-4 grid gap-4">
              <p className="text-sm text-muted-foreground">
                {t(
                  "This calculator is an estimate, not a lender offer. Fees and taxes are excluded.",
                )}
              </p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                <Label>
                  {t("Deposit")}
                  <Input
                    type="number"
                    min="0"
                    max={vehicle.price}
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    onBlur={() =>
                      setDeposit(String(clamp(deposit, vehicle.price)))
                    }
                  />
                </Label>
                <Label>
                  {t("Annual interest (%)")}
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    onBlur={() => setRate(String(clamp(rate, 100)))}
                  />
                </Label>
                <Label>
                  {t("Months")}
                  <NativeSelect
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    {[12, 24, 36, 48, 60, 72].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </NativeSelect>
                </Label>
              </div>
              <p className="text-xl font-semibold">
                {t("{amount} / month", {
                  amount: money(
                    payment(
                      vehicle.price,
                      clamp(deposit, vehicle.price),
                      clamp(rate, 100),
                      months,
                    ),
                    vehicle.currency,
                  ),
                })}
              </p>
            </div>
          </details>
        </div>
        <VehicleContact
          key={vehicle._id}
          vehicle={vehicle}
          dealer={dealer}
          track={track}
        />
      </div>
      <PriceHistory vehicle={vehicle} preview={preview} />
      {related.length > 0 && (
        <section className="grid min-w-0 gap-4">
          <h3 className="text-lg font-semibold">{t("You may also like")}</h3>
          {/* One swipeable row on narrow widgets instead of a long stack of cards. */}
          <div className="sf-related grid auto-rows-fr gap-5">
            {related.map((v) => (
              <VehicleCard
                key={v._id}
                vehicle={v}
                onOpen={() => openRelated(v)}
              >
                <Button variant="outline" onClick={() => openRelated(v)}>
                  {t("View vehicle")}
                </Button>
              </VehicleCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

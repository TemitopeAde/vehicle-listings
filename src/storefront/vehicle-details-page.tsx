import { useEffect, useId, useState } from "react";
import { cacheTtl, cachedApi } from "../shared/client";
import { localizeDefault } from "../shared/i18n";
import { LocaleProvider, localeProps, useI18n } from "../shared/i18n-react";
import { defaultTheme, type Theme, type Vehicle } from "../shared/schemas";
import { demoVehicles } from "../shared/demo";
import { ElementStyleContext } from "./element-style";
import { VehicleDetail } from "./vehicle-detail";
import { VehicleDetailSkeleton } from "./vehicle-detail-skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Alert } from "./ui/card";
import { Label, NativeSelect } from "./ui/input";
import { siteNavigation } from "../shared/site-navigation";
import {
  readFont,
  storefrontRootStyle,
  textSections,
  type WidgetStyle,
} from "./widget-style";
export type VehicleDetailsPageProps = {
  /** Vehicle slug read from the page URL (`?slug=`); `null` until it has been read. */
  slug: string | null;
  backLabel?: string;
  designMode?: boolean;
  accent?: string;
  radius?: number;
  widgetStyle?: WidgetStyle;
  inquiryFieldLabels?: string;
  quoteFieldLabels?: string;
};
export function VehicleDetailsPage(props: VehicleDetailsPageProps) {
  return (
    <LocaleProvider>
      {/* Per-element styles reach the details page too, as they do inside the marketplace. */}
      <ElementStyleContext.Provider value={props.widgetStyle ?? {}}>
        <VehicleDetailsView {...props} />
      </ElementStyleContext.Provider>
    </LocaleProvider>
  );
}
function VehicleDetailsView({
  slug,
  backLabel = "Back",
  designMode = false,
  accent,
  radius,
  widgetStyle = {},
  inquiryFieldLabels,
  quoteFieldLabels,
}: VehicleDetailsPageProps) {
  const { t, language } = useI18n();
  const back = localizeDefault(language, backLabel, "Back");
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [navigationError, setNavigationError] = useState("");
  const pickerId = useId();
  function browseInventory() {
    setNavigationError("");
    void siteNavigation
      .back("/")
      .catch(() =>
        setNavigationError(
          "Could not open the site's inventory. Please try again.",
        ),
      );
  }
  useEffect(() => {
    // The site's own theme applies in the editor too, so the preview matches the live page.
    cachedApi<Theme>("settings", cacheTtl.settings)
      .then(setTheme)
      .catch(() => {});
  }, []);
  // The editor auto-selects the first vehicle in the inventory (the marketplace's default
  // order), and its dropdown switches between vehicles. The listings API returns the sample cars
  // while nothing is published; they are also the fallback if the API can't be reached.
  const [previewVehicles, setPreviewVehicles] = useState<Vehicle[] | null>(null);
  const [previewId, setPreviewId] = useState("");
  useEffect(() => {
    if (!designMode) return;
    let active = true;
    cachedApi<{ items: Vehicle[] }>(
      "vehicles?public=1&sort=recent&limit=50",
      cacheTtl.listings,
    )
      .then(({ items }) => {
        if (active) setPreviewVehicles(items.length ? items : demoVehicles);
      })
      .catch((error) => {
        console.error("Could not load vehicles for the editor preview", error);
        if (active) setPreviewVehicles(demoVehicles);
      });
    return () => {
      active = false;
    };
  }, [designMode]);
  // Outside the editor (the editor's Preview mode, or the page opened directly), a page with no
  // `?slug=` shows the first vehicle instead of an empty state. `undefined` while it loads, `""`
  // when there is no vehicle to show.
  const [firstSlug, setFirstSlug] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (designMode || slug !== "") return;
    let active = true;
    cachedApi<{ items: Vehicle[] }>(
      "vehicles?public=1&sort=recent&limit=1",
      cacheTtl.listings,
    )
      .then(({ items }) => {
        if (active) setFirstSlug(items[0]?.slug ?? "");
      })
      .catch((error) => {
        console.error("Could not load the first vehicle", error);
        if (active) setFirstSlug("");
      });
    return () => {
      active = false;
    };
  }, [designMode, slug]);
  const shownSlug = slug || firstSlug;
  const previewVehicle =
    previewVehicles?.find((v) => v._id === previewId) ??
    previewVehicles?.[0] ??
    null;
  /** A similar vehicle clicked in the editor becomes the previewed one. */
  function previewRelated(relatedSlug: string) {
    const listed = previewVehicles?.find((v) => v.slug === relatedSlug);
    if (listed) {
      setPreviewId(listed._id);
      return;
    }
    cachedApi<Vehicle>(
      `vehicles?public=1&slug=${encodeURIComponent(relatedSlug)}`,
      cacheTtl.vehicle,
    )
      .then((v) => {
        setPreviewVehicles((current) => [...(current ?? []), v]);
        setPreviewId(v._id);
      })
      .catch((error) =>
        console.error("Could not open that vehicle in the editor preview", error),
      );
  }
  return (
    <div
      className="autohaus"
      {...localeProps(language)}
      data-color-roles={textSections
        .filter(([key]) => widgetStyle[`${key}-color`])
        .map(([key]) => key)
        .join(" ")}
      data-font-roles={textSections
        .filter(([key]) => readFont(widgetStyle[`${key}-font`]))
        .map(([key]) => key)
        .join(" ")}
      style={storefrontRootStyle(
        {
          ...theme,
          accent: accent || theme.accent,
          radius: radius ?? theme.radius,
        },
        widgetStyle,
      )}
    >
      {navigationError && (
        <Alert variant="destructive" role="alert">
          {t(navigationError)}
        </Alert>
      )}
      {designMode ? (
        previewVehicle && previewVehicles ? (
          <>
            {/* Editor only: choose which vehicle the page is designed around. */}
            <div className="mb-5 grid max-w-md gap-1.5">
              <Label htmlFor={pickerId}>{t("Preview vehicle")}</Label>
              <NativeSelect
                id={pickerId}
                value={previewVehicle._id}
                onChange={(event) => setPreviewId(event.target.value)}
              >
                {previewVehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.title}
                    {v.demo ? ` (${t("sample")})` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {previewVehicle.demo && (
              <Alert className="mb-5">
                {t(
                  "Editor preview · sample vehicle. On your live site this shows the vehicle a visitor clicked in the marketplace.",
                )}
              </Alert>
            )}
            <Button
              variant="outline"
              className="w-10 px-0"
              // Shown as on the live page; the editor stays on this page.
              onClick={() => {}}
              aria-label={back}
              title={back}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Button>
            <VehicleDetail
              key={previewVehicle._id}
              slug={previewVehicle.slug}
              initialVehicle={previewVehicle}
              consent={false}
              preview
              onRelated={previewRelated}
              inquiryFieldLabels={inquiryFieldLabels}
              quoteFieldLabels={quoteFieldLabels}
            />
          </>
        ) : (
          <VehicleDetailSkeleton />
        )
      ) : slug === null || shownSlug === undefined ? (
        <VehicleDetailSkeleton />
      ) : shownSlug ? (
        <>
          <Button
            variant="outline"
            className="w-10 px-0"
            onClick={browseInventory}
            aria-label={back}
            title={back}
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Button>
          <VehicleDetail
            key={shownSlug}
            slug={shownSlug}
            consent={false}
            inquiryFieldLabels={inquiryFieldLabels}
            quoteFieldLabels={quoteFieldLabels}
          />
        </>
      ) : (
        <div className="grid justify-items-center gap-4 py-12 text-center">
          <p className="text-muted-foreground">
            {t(
              "No vehicle selected. Choose a car from the inventory to see its details.",
            )}
          </p>
          <Button variant="outline" onClick={browseInventory}>
            {t("Browse inventory")}
          </Button>
        </div>
      )}
    </div>
  );
}

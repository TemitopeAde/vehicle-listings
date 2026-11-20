import { useEffect, useState } from "react";
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
  // The editor previews a real vehicle when the site has one (the page's `?slug=` first, then the
  // newest published listing) and the sample vehicle otherwise. The listings API itself returns
  // samples while nothing is published.
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
  useEffect(() => {
    if (!designMode) return;
    let active = true;
    const fallback = demoVehicles[0] ?? null;
    const load = async () => {
      if (slug) {
        try {
          return await cachedApi<Vehicle>(
            `vehicles?public=1&slug=${encodeURIComponent(slug)}`,
            cacheTtl.vehicle,
          );
        } catch {
          // A stale or sample slug falls through to the newest listing.
        }
      }
      const page = await cachedApi<{ items: Vehicle[] }>(
        "vehicles?public=1&sort=recent&limit=1",
        cacheTtl.listings,
      );
      return page.items[0] ?? fallback;
    };
    load()
      .then((vehicle) => {
        if (active) setPreviewVehicle(vehicle ?? fallback);
      })
      .catch((error) => {
        console.error("Could not load a vehicle for the editor preview", error);
        if (active) setPreviewVehicle(fallback);
      });
    return () => {
      active = false;
    };
  }, [designMode, slug]);
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
        previewVehicle ? (
          <>
            {previewVehicle.demo && (
              <Alert>
                {t(
                  "Editor preview · sample vehicle. On your live site this shows the vehicle a visitor clicked in the marketplace.",
                )}
              </Alert>
            )}
            <VehicleDetail
              key={previewVehicle._id}
              slug={previewVehicle.slug}
              initialVehicle={previewVehicle}
              consent={false}
              preview
              inquiryFieldLabels={inquiryFieldLabels}
              quoteFieldLabels={quoteFieldLabels}
            />
          </>
        ) : (
          <VehicleDetailSkeleton />
        )
      ) : slug === null ? (
        <VehicleDetailSkeleton />
      ) : slug ? (
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
            slug={slug}
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

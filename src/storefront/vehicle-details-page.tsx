import { useEffect, useState } from "react";
import { cacheTtl, cachedApi } from "../shared/client";
import { defaultTheme, type Theme } from "../shared/schemas";
import { demoVehicles } from "../shared/demo";
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
};
export function VehicleDetailsPage({
  slug,
  backLabel = "Back",
  designMode = false,
  accent,
  radius,
  widgetStyle = {},
}: VehicleDetailsPageProps) {
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
    if (designMode) return;
    cachedApi<Theme>("settings", cacheTtl.settings)
      .then(setTheme)
      .catch(() => {});
  }, [designMode]);
  const sample = demoVehicles[0];
  return (
    <div
      className="autohaus"
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
          {navigationError}
        </Alert>
      )}
      {designMode ? (
        <>
          <Alert>
            Editor preview · sample vehicle. On your live site this shows the
            vehicle a visitor clicked in the marketplace.
          </Alert>
          {sample && (
            <VehicleDetail
              slug={sample.slug}
              initialVehicle={sample}
              consent={false}
              preview
            />
          )}
        </>
      ) : slug === null ? (
        <VehicleDetailSkeleton />
      ) : slug ? (
        <>
          <Button
            variant="outline"
            className="w-10 px-0"
            onClick={browseInventory}
            aria-label={backLabel}
            title={backLabel}
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Button>
          <VehicleDetail slug={slug} consent={false} />
        </>
      ) : (
        <div className="grid justify-items-center gap-4 py-12 text-center">
          <p className="text-muted-foreground">
            No vehicle selected. Choose a car from the inventory to see its
            details.
          </p>
          <Button variant="outline" onClick={browseInventory}>
            Browse inventory
          </Button>
        </div>
      )}
    </div>
  );
}

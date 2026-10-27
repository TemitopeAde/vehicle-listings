import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useI18n } from "../shared/i18n-react";
import { assetUrl } from "../shared/client";
import type { Vehicle } from "../shared/schemas";
import {
  siteNavigation,
  vehicleLinkWithFallback,
} from "../shared/site-navigation";
import {
  onSavedCarsChange,
  readSavedCars,
  savedCarsState,
  toggleSavedCar,
  watchSavedCars,
} from "../shared/saved-cars";
import { useElementStyle } from "./element-style";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

/** Adds the vehicle to, or removes it from, the member's saved cars. */
export function VehicleSave({
  vehicle,
  disabled = false,
}: {
  vehicle: Vehicle;
  /** Editor preview: there is no member to save for. */
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const elementStyle = useElementStyle();
  const [saved, setSaved] = useState(false),
    [loading, setLoading] = useState(false),
    [toggling, setToggling] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (disabled) return;
    const sync = () => {
      setSaved(readSavedCars().some((c) => c.id === vehicle._id));
      setLoading(savedCarsState().loading);
    };
    sync();
    const unsubscribe = onSavedCarsChange(sync);
    const stopWatching = watchSavedCars();
    return () => {
      unsubscribe();
      stopWatching();
    };
  }, [disabled, vehicle._id]);
  async function toggle() {
    setToggling(true);
    setMessage("");
    try {
      const next = await toggleSavedCar(async () => ({
        id: vehicle._id,
        title: vehicle.title,
        price: vehicle.price,
        currency: vehicle.currency,
        // Saved cars are shown by a site script, so the image needs an absolute URL.
        image: vehicle.media[0] ? assetUrl(vehicle.media[0].url) : "",
        href: await vehicleLinkWithFallback(
          () => siteNavigation.vehicleLink(vehicle.slug),
          vehicle.slug,
          window.location.href,
        ),
      }));
      if (!next) setMessage(t("Please log in to like vehicles."));
      else setSaved(next.some((c) => c.id === vehicle._id));
    } catch (error) {
      console.error("Could not save vehicle", error);
      setMessage(t("Could not save this vehicle. Please try again."));
    } finally {
      setToggling(false);
    }
  }
  return (
    <div className="grid justify-items-end gap-1">
      <Button
        {...elementStyle("save-vehicle")}
        variant="outline"
        size="sm"
        className={cn(saved && "text-primary")}
        aria-pressed={saved}
        disabled={disabled || loading}
        pending={toggling}
        onClick={() => void toggle()}
      >
        <Heart className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
        {saved ? t("Saved") : t("Save")}
      </Button>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}

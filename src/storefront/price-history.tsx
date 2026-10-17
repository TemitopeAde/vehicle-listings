import { useEffect, useState } from "react";
import { cacheTtl, cachedApi } from "../shared/client";
import {
  openingPriceHistory,
  type PricePoint,
} from "../shared/price-history";
import type { Vehicle } from "../shared/schemas";
import { PriceHistoryPanel } from "./price-history-panel";

export function PriceHistory({
  vehicle,
  preview = false,
}: {
  vehicle: Vehicle;
  preview?: boolean;
}) {
  const [points, setPoints] = useState<PricePoint[] | null>(
    preview ? openingPriceHistory(vehicle) : null,
  );
  useEffect(() => {
    if (preview) {
      setPoints(openingPriceHistory(vehicle));
      return;
    }
    let active = true;
    cachedApi<{ items: PricePoint[] }>(
      `vehicles?public=1&history=${encodeURIComponent(vehicle._id)}`,
      cacheTtl.vehicle,
    )
      .then((result) => {
        if (active) setPoints(result.items);
      })
      .catch(() => {
        if (active) setPoints(openingPriceHistory(vehicle));
      });
    return () => {
      active = false;
    };
  }, [
    preview,
    vehicle._id,
    vehicle.price,
    vehicle.currency,
    vehicle.originalPrice,
    vehicle.createdAt,
    vehicle.updatedAt,
  ]);
  if (!points?.length) return null;
  return <PriceHistoryPanel points={points} />;
}

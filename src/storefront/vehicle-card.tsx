import { useElementStyle } from "./element-style";
import {
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { Vehicle } from "../shared/schemas";
import { money } from "../shared/utils";
import { isTrailer } from "../shared/vehicle-options";
import { CardGallery } from "./vehicle-gallery";
import { cn } from "./ui/utils";
import {
  Badge,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

function isCardControl(target: EventTarget | null) {
  const node = target as (Element & { parentElement?: Element | null }) | null;
  const element =
    node && "closest" in node
      ? node
      : node && "parentElement" in node
        ? node.parentElement
        : null;
  return Boolean(element?.closest("button, a, input, select, textarea, label"));
}

const conditionLabel = {
  used: "Used",
  new: "New",
  certified: "Certified",
} as const;
export function VehicleCard({
  vehicle: v,
  badge,
  children,
  mediaAction,
  onOpen,
}: {
  vehicle: Vehicle;
  badge?: string;
  children: ReactNode;
  /** Save control drawn over the photo. */
  mediaAction?: ReactNode;
  /** Opens the vehicle details, including when the card itself is clicked. */
  onOpen?: () => void;
}) {
  const elementStyle = useElementStyle();
  const press = useRef<{ x: number; y: number } | null>(null);
  const openedFromPress = useRef(false);
  function openFromCard(event: MouseEvent<HTMLDivElement>) {
    if (!onOpen || isCardControl(event.target)) return;
    if (openedFromPress.current) {
      openedFromPress.current = false;
      return;
    }
    onOpen();
  }
  function trackPress(event: PointerEvent<HTMLDivElement>) {
    if (!onOpen || event.button !== 0 || isCardControl(event.target)) {
      press.current = null;
      return;
    }
    press.current = { x: event.clientX, y: event.clientY };
  }
  function releasePress(event: PointerEvent<HTMLDivElement>) {
    const start = press.current;
    press.current = null;
    if (!onOpen || !start || isCardControl(event.target)) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // A photo swipe should change the image, not leave the listing.
    if (dx * dx + dy * dy > 36) return;
    openedFromPress.current = true;
    onOpen();
    queueMicrotask(() => {
      openedFromPress.current = false;
    });
  }
  const condition = conditionLabel[v.condition];
  const status =
    badge && badge.toLowerCase() !== v.condition && badge !== condition
      ? badge
      : "";
  const extraBadge = v.badges.find(
    (item) =>
      item.toLowerCase() !== v.condition && item.toLowerCase() !== condition.toLowerCase(),
  );
  const pricedDown = v.originalPrice !== undefined && v.originalPrice > v.price;
  const hasPhoto = v.media.length > 0;
  return (
    <Card
      data-sf="card"
      className={cn("flex flex-col", onOpen && "cursor-pointer")}
      onPointerDown={onOpen ? trackPress : undefined}
      onPointerUp={onOpen ? releasePress : undefined}
      onClick={onOpen ? openFromCard : undefined}
    >
      <div className="relative">
        <CardGallery
          media={v.media}
          title={v.title}
          className={onOpen ? "cursor-pointer" : undefined}
        />
        {hasPhoto && mediaAction && (
          <div className="absolute right-2 top-2 z-10">{mediaAction}</div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <p data-sf="price" className="text-xl font-semibold">
          {money(v.price, v.currency)}
          {pricedDown && (
            <span className="ml-2 text-sm font-normal text-muted-foreground line-through">
              {money(v.originalPrice ?? 0, v.currency)}
            </span>
          )}
        </p>
        <p className="shrink-0 text-sm text-muted-foreground">
          {isTrailer(v.category) ? (
            <span {...elementStyle("vehicle-mileage")}>{v.bodyStyle}</span>
          ) : (
            <span {...elementStyle("vehicle-mileage")}>
              {v.mileage.toLocaleString("en")} {v.mileageUnit}
            </span>
          )}
        </p>
      </div>
      <CardHeader className="gap-2 p-4 pt-1">
        <CardTitle data-sf="vehicle-title" className="text-primary">
          {onOpen ? (
            <button
              type="button"
              className="block w-full cursor-pointer bg-transparent p-0 text-left text-inherit [font:inherit] hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              {v.title}
            </button>
          ) : (
            v.title
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{condition}</Badge>
          {status && <Badge>{status}</Badge>}
          {extraBadge && <Badge variant="outline">{extraBadge}</Badge>}
        </div>
        <CardDescription data-sf="vehicle-meta">
          {isTrailer(v.category) ? (
            // Trailers have no engine or gearbox; show what buyers compare instead.
            <>
              {v.axles > 0 && (
                <span {...elementStyle("vehicle-transmission")}>
                  {v.axles} axles
                </span>
              )}
              {v.bodyLength > 0 && (
                <>
                  {v.axles > 0 && " · "}
                  <span {...elementStyle("vehicle-fuel")}>{v.bodyLength} m</span>
                </>
              )}
              {(v.axles > 0 || v.bodyLength > 0) && v.location && " · "}
            </>
          ) : (
            <span className="sf-hide-sm">
              <span {...elementStyle("vehicle-transmission")}>
                {v.transmission}
              </span>
              {" · "}
              <span {...elementStyle("vehicle-fuel")}>{v.fuel}</span>
              {v.location && " · "}
            </span>
          )}
          {v.location && (
            <span {...elementStyle("vehicle-location")}>{v.location}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex-col items-stretch gap-3 p-4 pt-0">
        {children}
        {!hasPhoto && mediaAction}
      </CardFooter>
    </Card>
  );
}

import { useEffect, useState } from "react";
import type { Vehicle } from "../shared/schemas";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";
import { cn } from "./ui/utils";
import { VehiclePhoto } from "./vehicle-photo";
type Media = Vehicle["media"];
function Slides({
  media,
  title,
  imageClassName,
  lazy,
}: {
  media: Media;
  title: string;
  imageClassName: string;
  lazy?: boolean;
}) {
  return (
    <CarouselContent>
      {media.map((m, i) => (
        <CarouselItem
          key={`${m.url}-${i}`}
          aria-label={`Image ${i + 1} of ${media.length}`}
        >
          <VehiclePhoto
            media={m}
            className={cn("aspect-[16/10] w-full object-cover", imageClassName)}
            alt={m.alt || title}
            loading={lazy || i > 0 ? "lazy" : undefined}
            draggable={false}
          />
        </CarouselItem>
      ))}
    </CarouselContent>
  );
}
/** Compact slider for listing cards: arrows and dots, no thumbnails. */
export function CardGallery({
  media,
  title,
  className,
}: {
  media: Media;
  title: string;
  className?: string;
}) {
  const first = media[0];
  if (!first) return null;
  if (media.length === 1)
    return (
      <VehiclePhoto
        media={first}
        className={cn("aspect-[16/10] w-full object-cover", className)}
        alt={first.alt || title}
        loading="lazy"
      />
    );
  return (
    <Carousel aria-label={`${title} photos`} className={cn("group", className)}>
      <Slides media={media} title={title} imageClassName="" lazy />
      <CarouselPrevious className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
      <CarouselNext className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
      <CarouselDots />
    </Carousel>
  );
}
/** Detail-page slider with a counter and synced thumbnail strip. */
export function DetailGallery({
  media,
  title,
}: {
  media: Media;
  title: string;
}) {
  const [api, setApi] = useState<CarouselApi>(),
    [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    return () => {
      api.off("select", sync);
    };
  }, [api]);
  const first = media[0];
  if (!first) return null;
  if (media.length === 1)
    return (
      <VehiclePhoto
        media={first}
        className="aspect-[16/10] w-full rounded-lg object-cover"
        alt={first.alt || title}
      />
    );
  return (
    <div className="grid gap-3">
      <Carousel
        aria-label={`${title} photos`}
        setApi={setApi}
        className="overflow-hidden rounded-lg"
      >
        <Slides media={media} title={title} imageClassName="" />
        {/* Narrow widgets swipe instead; the counter shows the position. */}
        <CarouselPrevious className="sf-hide-sm" />
        <CarouselNext className="sf-hide-sm" />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {selected + 1} / {media.length}
        </span>
      </Carousel>
      <div className="sf-hide-sm flex gap-2.5 overflow-x-auto pb-1">
        {media.map((m, i) => (
          <button
            type="button"
            className={cn(
              "shrink-0 cursor-pointer overflow-hidden rounded-md border-2 border-transparent bg-background p-0 opacity-70 transition hover:opacity-100",
              selected === i && "border-primary opacity-100",
            )}
            key={`${m.url}-${i}`}
            onClick={() => api?.scrollTo(i)}
            aria-label={`View image ${i + 1}: ${m.alt || title}`}
            aria-pressed={selected === i}
          >
            <VehiclePhoto
              media={m}
              credit={false}
              className="h-16 w-24 object-cover"
              alt=""
            />
          </button>
        ))}
      </div>
    </div>
  );
}

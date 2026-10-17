import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";
type CarouselApi = UseEmblaCarouselType[1];
type CarouselOptions = Parameters<typeof useEmblaCarousel>[0];
type CarouselContextValue = {
  carouselRef: UseEmblaCarouselType[0];
  api: CarouselApi;
  selected: number;
  count: number;
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
};
const CarouselContext = React.createContext<CarouselContextValue | null>(null);
export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within <Carousel>");
  return context;
}
export function Carousel({
  opts,
  setApi,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  opts?: CarouselOptions;
  setApi?: (api: CarouselApi) => void;
}) {
  const [carouselRef, api] = useEmblaCarousel(opts);
  const [selected, setSelected] = React.useState(0),
    [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!api) return;
    setApi?.(api);
    const sync = () => {
      setSelected(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    sync();
    api.on("select", sync).on("reInit", sync);
    return () => {
      api.off("select", sync).off("reInit", sync);
    };
  }, [api, setApi]);
  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);
  const scrollTo = React.useCallback((i: number) => api?.scrollTo(i), [api]);
  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        selected,
        count,
        scrollPrev,
        scrollNext,
        scrollTo,
      }}
    >
      <div
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollPrev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollNext();
          }
        }}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}
export function CarouselContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { carouselRef } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div className={cn("flex", className)} {...props} />
    </div>
  );
}
export function CarouselItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
      {...props}
    />
  );
}
const arrow =
  "absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-0 bg-white/90 px-0 text-[#1d2b23] shadow-md hover:bg-white";
export function CarouselPrevious({ className }: { className?: string }) {
  const { scrollPrev, selected } = useCarousel();
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(arrow, "left-3", className)}
      disabled={selected === 0}
      onClick={(e) => {
        e.stopPropagation();
        scrollPrev();
      }}
      aria-label="Previous image"
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}
export function CarouselNext({ className }: { className?: string }) {
  const { scrollNext, selected, count } = useCarousel();
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(arrow, "right-3", className)}
      disabled={selected >= count - 1}
      onClick={(e) => {
        e.stopPropagation();
        scrollNext();
      }}
      aria-label="Next image"
    >
      <ChevronRight className="h-5 w-5" />
    </Button>
  );
}
export function CarouselDots({ className }: { className?: string }) {
  const { selected, count, scrollTo } = useCarousel();
  return (
    <div
      className={cn(
        "absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className={cn(
            "h-2 cursor-pointer rounded-full border-0 bg-white/60 p-0 transition-all",
            i === selected ? "w-5 bg-white" : "w-2",
          )}
          aria-label={`Go to image ${i + 1}`}
          aria-current={i === selected}
          onClick={(e) => {
            e.stopPropagation();
            scrollTo(i);
          }}
        />
      ))}
    </div>
  );
}
export type { CarouselApi };

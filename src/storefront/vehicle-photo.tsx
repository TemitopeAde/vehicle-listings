import type { ImgHTMLAttributes } from "react";
import type { Vehicle } from "../shared/schemas";
import { assetUrl } from "../shared/client";
import { cn } from "./ui/utils";

type Media = Vehicle["media"][number];

/** A vehicle image that loads app-bundled files from the app and shows any licence credit. */
export function VehiclePhoto({
  media,
  className,
  credit = true,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  media: Media;
  /** Hide the credit where the image is too small to read it; it's then in the tooltip. */
  credit?: boolean;
}) {
  const image = (
    <img
      {...props}
      className={className}
      src={assetUrl(media.url)}
      title={!credit && media.credit ? media.credit : props.title}
    />
  );
  if (!credit || !media.credit) return image;
  return (
    <span className="relative block">
      {image}
      <PhotoCredit media={media} />
    </span>
  );
}

export function PhotoCredit({
  media,
  className,
}: {
  media: Media;
  className?: string;
}) {
  if (!media.credit) return null;
  return (
    <a
      href={media.creditUrl}
      target="_blank"
      rel="noopener noreferrer"
      dir="auto"
      className={cn(
        "absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] leading-tight text-white no-underline hover:underline",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {media.credit}
    </a>
  );
}

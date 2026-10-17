export type MediaKind = "image" | "video";
export const mediaLimits = { image: 30, video: 10 } as const;
export const mediaMimeTypes = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
} as const;
const extensions: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};
export function validateMediaFile(
  file: Pick<File, "name" | "type" | "size">,
  kind: MediaKind,
) {
  const mimeType =
    file.type ||
    extensions[file.name.split(".").pop()?.toLowerCase() ?? ""] ||
    "";
  if (!(mediaMimeTypes[kind] as readonly string[]).includes(mimeType))
    throw new Error(
      kind === "image"
        ? "Choose a JPG, PNG, WebP or GIF image."
        : "Choose an MP4, WebM or MOV video.",
    );
  const maximum = kind === "image" ? 25 : 500;
  if (!file.size || file.size > maximum * 1024 * 1024)
    throw new Error(`Choose a non-empty ${kind} smaller than ${maximum} MB.`);
  return mimeType;
}
export function isWixMediaUrl(value: string, kind: MediaKind) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (kind === "image"
        ? url.hostname === "static.wixstatic.com"
        : ["video.wixstatic.com", "static.wixstatic.com"].includes(
            url.hostname,
          ))
    );
  } catch {
    return false;
  }
}

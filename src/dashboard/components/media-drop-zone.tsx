import { useEffect, useState, type DragEvent } from "react";
import { ImagePlus, UploadCloud, Video } from "lucide-react";
import { useI18n } from "../../shared/i18n-react";
import { cn } from "./ui/button";
import {
  mediaLimits,
  mediaMimeTypes,
  type MediaKind,
} from "../../shared/media";

const copy = {
  image: {
    title: "Drag photos here",
    hint: "JPG, PNG, WebP or GIF, up to 25 MB each. The first photo is the cover.",
    icon: ImagePlus,
  },
  video: {
    title: "Drag videos here",
    hint: "MP4, WebM or MOV, up to 500 MB each.",
    icon: Video,
  },
} as const;

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

export function MediaDropZone({
  kind,
  count,
  busy,
  onFiles,
}: {
  kind: MediaKind;
  count: number;
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const full = count >= mediaLimits[kind];
  const disabled = busy || full;
  const { title, hint, icon: Icon } = copy[kind];
  const id = `upload-${kind}`;

  // A file dropped beside a zone would otherwise make the browser open it and leave the editor.
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  function onDrag(e: DragEvent<HTMLLabelElement>) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = disabled ? "none" : "copy";
    if (!disabled) setActive(true);
  }

  return (
    <label
      htmlFor={id}
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setActive(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setActive(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        disabled
          ? "cursor-not-allowed bg-muted/40 opacity-70"
          : "cursor-pointer hover:border-primary hover:bg-[#f3f8f4]",
        active && "border-primary bg-[#e8f0e9]",
      )}
    >
      <input
        id={id}
        type="file"
        multiple
        className="sr-only"
        accept={mediaMimeTypes[kind].join(",")}
        disabled={disabled}
        aria-label={
          kind === "image" ? t("Upload photos") : t("Upload videos")
        }
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          onFiles(Array.from(e.currentTarget.files ?? []));
          e.currentTarget.value = "";
        }}
      />
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full bg-[#e8f0e9] text-primary transition-transform",
          active && "scale-110",
        )}
      >
        {active ? <UploadCloud size={22} /> : <Icon size={22} />}
      </span>
      <span className="text-sm font-semibold">
        {full
          ? t(
              kind === "image"
                ? "Photo limit reached"
                : "Video limit reached",
            )
          : active
            ? t("Drop to upload")
            : t(title)}
      </span>
      <span className="text-sm text-muted-foreground">
        {full ? (
          t("Remove one to add another.")
        ) : (
          <>
            {t("or")}{" "}
            <span className="font-medium text-primary underline">
              {t("browse your device")}
            </span>
          </>
        )}
      </span>
      <span id={`${id}-hint`} className="hint text-xs">
        {t(hint)}{" "}
        {t("{count}/{limit} added.", {
          count,
          limit: mediaLimits[kind],
        })}
      </span>
    </label>
  );
}

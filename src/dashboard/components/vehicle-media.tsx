import { ImagePlus, Video, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { assetUrl } from "../../shared/client";
import { Button } from "./ui/button";
import type { VehicleForm } from "./vehicle-form-types";
import type { VehicleUploads } from "../use-vehicle-uploads";
import { MediaDropZone } from "./media-drop-zone";

export function VehicleMedia({
  form,
  uploads,
}: {
  form: VehicleForm;
  uploads: VehicleUploads;
}) {
  const { watch, setValue } = form;
  const media = watch("media") ?? [];
  const videos = watch("videos") ?? [];
  function movePhoto(index: number, direction: number) {
    const list = [...(form.getValues("media") ?? [])];
    const current = list[index],
      next = list[index + direction];
    if (!current || !next) return;
    list[index] = next;
    list[index + direction] = current;
    setValue("media", list, { shouldDirty: true, shouldValidate: true });
  }
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 gap-5">
        <MediaDropZone
          kind="image"
          count={media.length}
          busy={uploads.busy}
          onFiles={(files) => uploads.add(files, "image")}
        />
        <MediaDropZone
          kind="video"
          count={videos.length}
          busy={uploads.busy}
          onFiles={(files) => uploads.add(files, "video")}
        />
      </div>
      {uploads.jobs.some((job) => job.status !== "ready") && (
        <section aria-label="Media upload progress" className="space-y-3">
          {uploads.jobs.filter((job) => job.status !== "ready").map((job) => (
            <div key={job.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm break-all">{job.name}</p>
                {["queued", "uploading", "processing"].includes(job.status) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => uploads.cancel(job.id)}
                  >
                    Cancel
                  </Button>
                ) : (job.status === "failed" || job.status === "cancelled") &&
                  uploads.canRetry(job.id) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploads.busy}
                    onClick={() => uploads.retry(job.id)}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
              {job.error ||
              job.status === "queued" ||
              job.status === "uploading" ? (
                <p
                  role={job.error ? "alert" : "status"}
                  className={job.error ? "text-sm text-red-700" : "hint"}
                >
                  {job.error ??
                    (job.status === "queued"
                      ? "Waiting to upload…"
                      : `Uploading ${job.progress}%`)}
                </p>
              ) : null}
              {job.status === "uploading" && (
                <progress
                  className="w-full"
                  aria-label={`Uploading ${job.name}`}
                  value={job.progress}
                  max={100}
                />
              )}
            </div>
          ))}
        </section>
      )}
      <section className="space-y-4" aria-label="Vehicle photos">
        <h3 className="font-semibold flex gap-2 items-center">
          <ImagePlus size={18} />
          Photos
        </h3>
        {media.length === 0 && (
          <p className="hint">Add photos to show buyers your vehicle.</p>
        )}
        {media.map((item, index) => (
          <div
            key={`${item.fileId ?? item.url}-${index}`}
            className="flex flex-wrap gap-4 border rounded-lg p-3"
          >
            <img
              src={assetUrl(item.url)}
              title={item.credit}
              alt={item.alt}
              className="w-28 h-20 rounded object-cover"
            />
            <div className="flex-1 min-w-40">
              <label className="label text-xs" htmlFor={`alt-${index}`}>
                Image {index + 1}
                {index === 0 ? " · Cover" : ""} — alt text
              </label>
              <input
                id={`alt-${index}`}
                className="field"
                maxLength={200}
                value={item.alt}
                onChange={(e) =>
                  setValue(
                    "media",
                    media.map((value, i) =>
                      i === index ? { ...value, alt: e.target.value } : value,
                    ),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={index === 0}
                aria-label={`Move photo ${index + 1} up`}
                onClick={() => movePhoto(index, -1)}
              >
                <ArrowUp size={15} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={index === media.length - 1}
                aria-label={`Move photo ${index + 1} down`}
                onClick={() => movePhoto(index, 1)}
              >
                <ArrowDown size={15} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() =>
                  setValue(
                    "media",
                    media.filter((_, i) => i !== index),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              >
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-4" aria-label="Vehicle videos">
        <h3 className="font-semibold flex gap-2 items-center">
          <Video size={18} />
          Videos
        </h3>
        {videos.length === 0 && (
          <p className="hint">Add a walkaround or test-drive video.</p>
        )}
        {videos.map((item, index) => (
          <div
            key={`${item.fileId ?? item.url}-${index}`}
            className="grid sm:grid-cols-[180px_1fr_auto] gap-4 border rounded-lg p-3 items-start"
          >
            <video
              src={item.url}
              poster={item.poster}
              controls
              playsInline
              preload="metadata"
              aria-label={item.title || `Vehicle video ${index + 1}`}
              className="w-full rounded"
            />
            <div>
              <label className="label text-xs" htmlFor={`video-title-${index}`}>
                Video {index + 1} — title
              </label>
              <input
                id={`video-title-${index}`}
                className="field"
                maxLength={200}
                value={item.title}
                onChange={(e) =>
                  setValue(
                    "videos",
                    videos.map((value, i) =>
                      i === index ? { ...value, title: e.target.value } : value,
                    ),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Remove video ${index + 1}`}
              onClick={() =>
                setValue(
                  "videos",
                  videos.filter((_, i) => i !== index),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            >
              <Trash2 size={15} />
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}

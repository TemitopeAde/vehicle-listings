import { useEffect, useRef, useState } from "react";
import { mediaLimits, type MediaKind } from "../shared/media";
import {
  createMediaUpload,
  type UploadDependencies,
  type UploadUpdate,
} from "./media-upload";
import type { VehicleForm } from "./components/vehicle-form-types";

type Job = {
  id: string;
  name: string;
  kind: MediaKind;
  progress: number;
  status:
    "queued" | "uploading" | "processing" | "ready" | "failed" | "cancelled";
  error?: string;
};
type Task = {
  run: ReturnType<typeof createMediaUpload>;
  controller: AbortController;
};
export function useVehicleUploads(
  form: VehicleForm,
  dependencies?: Partial<UploadDependencies>,
) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const tasks = useRef(new Map<string, Task>());
  const alive = useRef(true);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    const currentTasks = tasks.current;
    return () => {
      alive.current = false;
      currentTasks.forEach((task) => task.controller.abort());
    };
  }, []);
  function update(id: string, patch: Partial<Job> | UploadUpdate) {
    if (alive.current)
      setJobs((rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
  }
  async function process(batch: Job[]) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      for (const job of batch) {
        const task = tasks.current.get(job.id);
        if (!task || !alive.current) continue;
        try {
          const field = job.kind === "image" ? "media" : "videos";
          if ((form.getValues(field)?.length ?? 0) >= mediaLimits[job.kind])
            throw new Error(
              `A vehicle can have up to ${mediaLimits[job.kind]} ${job.kind === "image" ? "photos" : "videos"}.`,
            );
          const asset = await task.run(task.controller.signal, (patch) =>
            update(job.id, patch),
          );
          if (!alive.current || task.controller.signal.aborted) continue;
          if (job.kind === "image")
            form.setValue(
              "media",
              [
                ...(form.getValues("media") ?? []),
                {
                  url: asset.url,
                  fileId: asset.fileId,
                  alt: job.name.replace(/\.[^.]+$/, "").slice(0, 200),
                  caption: "",
                },
              ],
              { shouldDirty: true, shouldValidate: true },
            );
          else
            form.setValue(
              "videos",
              [
                ...(form.getValues("videos") ?? []),
                { ...asset, title: job.name.slice(0, 200) },
              ],
              { shouldDirty: true, shouldValidate: true },
            );
          update(job.id, { status: "ready", progress: 100, error: undefined });
          tasks.current.delete(job.id);
        } catch (error) {
          update(job.id, {
            status: task.controller.signal.aborted ? "cancelled" : "failed",
            error: task.controller.signal.aborted
              ? "Upload cancelled."
              : error instanceof Error
                ? error.message
                : "Upload failed. Try again.",
          });
        }
      }
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function add(files: File[], kind: MediaKind) {
    if (running.current) return;
    const available =
      mediaLimits[kind] -
      (form.getValues(kind === "image" ? "media" : "videos")?.length ?? 0);
    const batch = files.map((file, index): Job => {
      const job: Job = {
        id: crypto.randomUUID(),
        name: file.name,
        kind,
        progress: 0,
        status: "queued",
      };
      try {
        if (index >= available)
          throw new Error(
            `Only ${Math.max(0, available)} more ${kind === "image" ? "photos" : "videos"} can be added.`,
          );
        tasks.current.set(job.id, {
          run: createMediaUpload(file, kind, dependencies),
          controller: new AbortController(),
        });
      } catch (error) {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : "Invalid file.";
      }
      return job;
    });
    setJobs((rows) => [
      ...rows.filter((row) => row.status !== "ready"),
      ...batch,
    ]);
    void process(batch.filter((job) => job.status === "queued"));
  }
  function retry(id: string) {
    if (running.current) return;
    const job = jobs.find((row) => row.id === id),
      task = tasks.current.get(id);
    if (!job || !task) return;
    task.controller = new AbortController();
    update(id, { status: "queued", error: undefined });
    void process([job]);
  }
  return {
    jobs,
    busy,
    add,
    retry,
    canRetry: (id: string) => tasks.current.has(id),
    cancel: (id: string) => tasks.current.get(id)?.controller.abort(),
  };
}
export type VehicleUploads = ReturnType<typeof useVehicleUploads>;

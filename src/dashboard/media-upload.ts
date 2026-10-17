import type { files } from "@wix/media";
import type { UploadOptions } from "tus-js-client";
import { z } from "zod";
import {
  isWixMediaUrl,
  validateMediaFile,
  type MediaKind,
} from "../shared/media";

type Descriptor = Pick<
  files.FileDescriptor,
  | "_id"
  | "url"
  | "thumbnailUrl"
  | "operationStatus"
  | "mediaType"
  | "private"
  | "state"
>;
type Transfer = { url?: string | null; start(): void; abort(): Promise<void> };
export type UploadDependencies = {
  generate(
    mimeType: string,
    name: string,
  ): Promise<{ uploadUrl?: string; uploadToken?: string }>;
  getFile(id: string): Promise<Descriptor>;
  transfer(file: File, options: UploadOptions): Promise<Transfer>;
  finalize(url: string, signal: AbortSignal): Promise<Response>;
  wait(signal: AbortSignal): Promise<void>;
};
const defaults: UploadDependencies = {
  generate: async (mimeType, fileName) =>
    (await import("@wix/media")).files.generateFileResumableUploadUrl(
      mimeType,
      { fileName, uploadProtocol: "TUS", private: false },
    ),
  getFile: async (id) =>
    (await import("@wix/media")).files.getFileDescriptor(id),
  transfer: async (file, options) =>
    new (await import("tus-js-client")).Upload(file, options),
  finalize: (url, signal) => fetch(url, { method: "PUT", signal }),
  wait: (signal) =>
    new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Upload cancelled", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, 2000);
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }),
};
const finalizedSchema = z.object({ file: z.object({ id: z.string().min(1) }) });
export type UploadedMedia = { fileId: string; url: string; poster?: string };
export type UploadUpdate = {
  status: "uploading" | "processing";
  progress: number;
};

// Keep the signed ticket and completed file ID on retry so finalization/processing
// failures do not upload a second copy to the merchant's Media Manager.
export function createMediaUpload(
  file: File,
  kind: MediaKind,
  overrides: Partial<UploadDependencies> = {},
) {
  const dependencies: UploadDependencies = Object.assign(overrides, {
    generate: overrides.generate ?? defaults.generate,
    getFile: overrides.getFile ?? defaults.getFile,
    transfer: overrides.transfer ?? defaults.transfer,
    finalize: overrides.finalize ?? defaults.finalize,
    wait: overrides.wait ?? defaults.wait,
  });
  const mimeType = validateMediaFile(file, kind);
  let ticket: { uploadUrl: string; uploadToken: string } | undefined;
  let fileId: string | undefined;
  let transferred = false;
  let transfer: Transfer | undefined;
  let transferUrl: string | undefined;
  return async (
    signal: AbortSignal,
    update: (value: UploadUpdate) => void,
  ): Promise<UploadedMedia> => {
    const check = () => signal.throwIfAborted();
    check();
    if (!ticket) {
      const generated = await dependencies.generate(mimeType, file.name);
      check();
      if (!generated.uploadUrl || !generated.uploadToken)
        throw new Error(
          "This file could not be uploaded. Try again.",
        );
      ticket = {
        uploadUrl: generated.uploadUrl,
        uploadToken: generated.uploadToken,
      };
    }
    if (!transferred) {
      update({ status: "uploading", progress: 0 });
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => signal.removeEventListener("abort", cancel);
        const cancel = () => {
          transferUrl = transfer?.url ?? undefined;
          void transfer?.abort().catch(() => {});
          cleanup();
          reject(new DOMException("Upload cancelled", "AbortError"));
        };
        signal.addEventListener("abort", cancel, { once: true });
        void dependencies
          .transfer(file, {
            endpoint: ticket?.uploadUrl,
            uploadUrl: transferUrl,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            chunkSize: 5 * 1024 * 1024,
            storeFingerprintForResuming: false,
            metadata: {
              filename: file.name,
              contentType: mimeType,
              token: ticket?.uploadToken ?? "",
            },
            onProgress: (sent, total) => {
              if (!signal.aborted)
                update({
                  status: "uploading",
                  progress: Math.round((sent / total) * 100),
                });
            },
            onError: () => {
              transferUrl = transfer?.url ?? undefined;
              cleanup();
              reject(
                new Error(
                  "The file transfer failed. Check your connection and retry.",
                ),
              );
            },
            onSuccess: () => {
              cleanup();
              transferred = true;
              resolve();
            },
          })
          .then(
            (created) => {
              transfer = created;
              if (signal.aborted) {
                cancel();
                return;
              }
              transfer.start();
            },
            (error: unknown) => {
              cleanup();
              reject(error);
            },
          );
      });
    }
    check();
    update({ status: "processing", progress: 100 });
    if (!fileId) {
      const url = new URL(
        `${ticket.uploadUrl.replace(/\/$/, "")}/${encodeURIComponent(ticket.uploadToken)}`,
      );
      url.searchParams.set("filename", file.name);
      const response = await dependencies.finalize(url.href, signal);
      if (!response.ok)
        throw new Error(
          "This file could not be saved. Retry to finish adding it.",
        );
      fileId = finalizedSchema.parse(await response.json()).file.id;
    }
    for (let attempt = 0; attempt < 90; attempt++) {
      check();
      const descriptor = await dependencies.getFile(fileId);
      check();
      if (
        descriptor.operationStatus === "FAILED" ||
        descriptor.state === "DELETED"
      )
        throw new Error(
          "This file could not be prepared. Choose another file.",
        );
      if (descriptor.operationStatus === "READY") {
        if (
          descriptor.private ||
          descriptor.mediaType !== kind.toUpperCase() ||
          !descriptor.url ||
          !isWixMediaUrl(descriptor.url, kind)
        )
          throw new Error("This file could not be added. Try another file.");
        return {
          fileId,
          url: descriptor.url,
          ...(descriptor.thumbnailUrl &&
          isWixMediaUrl(descriptor.thumbnailUrl, "image")
            ? { poster: descriptor.thumbnailUrl }
            : {}),
        };
      }
      await dependencies.wait(signal);
    }
    throw new Error(
      "This file is still being prepared. Retry in a moment.",
    );
  };
}

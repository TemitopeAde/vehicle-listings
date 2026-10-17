import type { UploadDependencies } from "../dashboard/media-upload";
import { api } from "../shared/client";

/**
 * The dealer form uploads with tus-js-client. This only asks the app for the
 * signed resumable URL and, after the transfer, whether Wix has finished the file.
 */
export const dealerMediaUpload: Partial<UploadDependencies> = {
  generate: (mimeType, fileName) =>
    api("media", { action: "resumable-url", mimeType, fileName }),
  getFile: (id) => api("media", { action: "file", id }),
};

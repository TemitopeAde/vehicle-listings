import { auth } from "@wix/essentials";
import { files } from "@wix/media";
import { z } from "zod";
import type { Context } from "../context";
import { AppError } from "../errors";

const resumableRequest = z
  .object({
    mimeType: z.string().trim().min(1).max(100),
    fileName: z.string().trim().min(1).max(1000),
  })
  .strict();

function requireUploader(ctx: Context) {
  if (ctx.subjectType !== "MEMBER" && !ctx.manager)
    throw new AppError("UNAUTHENTICATED", "Log in before uploading a file.", 401);
}

/** A signed TUS upload URL for the dealer's browser. The app creates it; the member does not need Media Manager access. */
export async function resumableUploadUrl(ctx: Context, raw: unknown) {
  requireUploader(ctx);
  const input = resumableRequest.parse(raw);
  const generated = await auth.elevate(files.generateFileResumableUploadUrl)(
    input.mimeType,
    {
      fileName: input.fileName,
      uploadProtocol: "TUS",
      private: false,
    },
  );
  if (!generated.uploadUrl || !generated.uploadToken)
    throw new AppError(
      "REQUEST_FAILED",
      "This file could not be uploaded. Try again.",
    );
  return {
    uploadUrl: generated.uploadUrl,
    uploadToken: generated.uploadToken,
  };
}

/** Processing status for a file the dealer just uploaded. */
export async function uploadedFile(ctx: Context, raw: unknown) {
  requireUploader(ctx);
  const { id } = z.object({ id: z.string().trim().min(1).max(1000) }).strict().parse(raw);
  const descriptor = await auth.elevate(files.getFileDescriptor)(id);
  return {
    _id: descriptor._id,
    url: descriptor.url,
    thumbnailUrl: descriptor.thumbnailUrl,
    operationStatus: descriptor.operationStatus,
    mediaType: descriptor.mediaType,
    private: descriptor.private,
    state: descriptor.state,
  };
}

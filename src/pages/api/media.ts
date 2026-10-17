import type { APIRoute } from "astro";
import { z } from "zod";
import { contextForRequest } from "../../backend/dealer-request";
import { methodNotAllowed, readJson, respond } from "../../backend/errors";
import {
  resumableUploadUrl,
  uploadedFile,
} from "../../backend/services/media-upload-service";

const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("resumable-url"),
      mimeType: z.string(),
      fileName: z.string(),
    })
    .strict(),
  z.object({ action: z.literal("file"), id: z.string() }).strict(),
]);

export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const ctx = await contextForRequest(request, false, true);
    const body = command.parse(await readJson(request));
    if (body.action === "file") return uploadedFile(ctx, { id: body.id });
    return resumableUploadUrl(ctx, {
      mimeType: body.mimeType,
      fileName: body.fileName,
    });
  });

export const ALL: APIRoute = () => methodNotAllowed(["POST"]);

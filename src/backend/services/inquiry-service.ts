import { sha256Hex } from "../web-crypto";
import { z } from "zod";
import { inquiryInput, inquirySchema } from "../../shared/schemas";
import type { Context } from "../context";
import { AppError } from "../errors";
import { getVehicle } from "./vehicle-service";
import { queryRows, saveRow, getRow } from "../repositories/repository";
import { audit } from "./audit-service";
import { confirmInquiry } from "./inquiry-email-service";
export async function submitInquiry(ctx: Context, raw: unknown) {
  const input = inquiryInput.parse(raw),
    v = await getVehicle(ctx, input.vehicleId, true);
  if (v.status === "sold")
    throw new AppError("UNAVAILABLE", "This vehicle has been sold.");
  const id = await sha256Hex(
    `${ctx.siteId}:${ctx.actorId}:${input.idempotencyKey}`,
  );
  if (await getRow(ctx, "inquiries", id, true))
    return {
      id,
      received: true,
      confirmationEmailStatus: await confirmInquiry(ctx, id),
    };
  const actorHash = await sha256Hex(
    `${ctx.siteId}:${ctx.actorId}:${new Date().toISOString().slice(0, 13)}`,
  );
  const siteRecent = await queryRows(
    ctx,
    "inquiries",
    {
      ge: { createdAt: new Date(Date.now() - 3600000).toISOString() },
      limit: 1,
    },
    true,
  );
  if (siteRecent.total >= 100)
    throw new AppError(
      "RATE_LIMIT",
      "The showroom is receiving many requests. Please try again later.",
      429,
    );
  const recent = await queryRows(
    ctx,
    "inquiries",
    {
      eq: { actorHash },
      ge: { createdAt: new Date(Date.now() - 3600000).toISOString() },
      limit: 1,
    },
    true,
  );
  if (recent.total >= 5)
    throw new AppError(
      "RATE_LIMIT",
      "Please wait before sending another inquiry.",
      429,
    );
  const now = new Date().toISOString();
  const { honeypot: _honeypot, idempotencyKey: _key, ...fields } = input;
  const inquiry = inquirySchema.parse({
    ...fields,
    _id: id,
    dealerId: v.dealerId,
    createdAt: now,
    updatedAt: now,
  });
  await saveRow(ctx, "inquiries", { ...inquiry, actorHash }, true, true);
  return {
    id,
    received: true,
    confirmationEmailStatus: await confirmInquiry(ctx, id),
  };
}
export async function listInquiries(ctx: Context, status = "", cursor = 0) {
  const r = await queryRows(ctx, "inquiries", {
    eq: status ? { status } : {},
    offset: cursor,
    limit: 50,
    sort: "createdAt",
    descending: true,
  });
  return {
    items: r.rows.map((row) => inquirySchema.parse(row)),
    total: r.total,
    nextCursor: cursor + 50 < r.total ? cursor + 50 : null,
  };
}
export async function updateInquiry(ctx: Context, id: string, raw: unknown) {
  const patch = z
    .object({
      status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
      notes: z.string().max(3000).optional(),
    })
    .strict()
    .parse(raw);
  const old = await getRow(ctx, "inquiries", id);
  if (!old) throw new AppError("NOT_FOUND", "Inquiry not found.", 404);
  const updated = { ...old, ...patch, updatedAt: new Date().toISOString() };
  await saveRow(ctx, "inquiries", updated);
  await audit(ctx, "inquiry", id, "update");
  return inquirySchema.parse(updated);
}

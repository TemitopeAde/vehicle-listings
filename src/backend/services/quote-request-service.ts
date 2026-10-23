import { sha256Hex } from "../web-crypto";
import {
  quoteRequestInput,
  quoteRequestPatch,
  quoteRequestSchema,
} from "../../shared/quote-requests";
import type { Context } from "../context";
import { AppError } from "../errors";
import { getRow, queryRows, saveRow } from "../repositories/repository";
import { audit } from "./audit-service";
import { getVehicle } from "./vehicle-service";
import {
  confirmQuoteRequest,
  notifyQuoteOwner,
} from "./quote-request-email-service";
import { syncQuoteContact } from "./quote-request-contact-service";

const collection = "quote-requests";

/** Adds the requester to Wix contacts and sends both automatic emails; none blocks another. */
async function followUp(ctx: Context, id: string) {
  // Each step records its own status, so they don't overwrite each other's fields.
  const contactStatus = await syncQuoteContact(ctx, id);
  const ownerEmailStatus = await notifyQuoteOwner(ctx, id);
  const confirmationEmailStatus = await confirmQuoteRequest(ctx, id);
  return {
    id,
    received: true,
    contactStatus,
    ownerEmailStatus,
    confirmationEmailStatus,
  };
}

export async function submitQuoteRequest(ctx: Context, raw: unknown) {
  const input = quoteRequestInput.parse(raw);
  const vehicle = await getVehicle(ctx, input.vehicleId, true);
  if (vehicle.status === "sold")
    throw new AppError("UNAVAILABLE", "This vehicle has been sold.");
  const id = await sha256Hex(
    `${ctx.siteId}:${ctx.actorId}:quote:${input.idempotencyKey}`,
  );
  // A retried submission resends any email that failed, without a second request.
  if (await getRow(ctx, collection, id, true)) return followUp(ctx, id);
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const siteRecent = await queryRows(
    ctx,
    collection,
    { ge: { createdAt: hourAgo }, limit: 1 },
    true,
  );
  if (siteRecent.total >= 100)
    throw new AppError(
      "RATE_LIMIT",
      "The showroom is receiving many requests. Please try again later.",
      429,
    );
  const actorHash = await sha256Hex(
    `${ctx.siteId}:${ctx.actorId}:${new Date().toISOString().slice(0, 13)}`,
  );
  const recent = await queryRows(
    ctx,
    collection,
    { eq: { actorHash }, ge: { createdAt: hourAgo }, limit: 1 },
    true,
  );
  if (recent.total >= 5)
    throw new AppError(
      "RATE_LIMIT",
      "Please wait before requesting another quote.",
      429,
    );
  const now = new Date().toISOString();
  const { honeypot: _honeypot, idempotencyKey: _key, ...fields } = input;
  const request = quoteRequestSchema.parse({
    ...fields,
    _id: id,
    vehicleTitle: vehicle.title.slice(0, 150),
    stockId: vehicle.stockId,
    dealerId: vehicle.dealerId,
    currency: vehicle.currency,
    listedPrice: vehicle.price,
    createdAt: now,
    updatedAt: now,
  });
  await saveRow(ctx, collection, { ...request, actorHash }, true, true);
  return followUp(ctx, id);
}

export async function listQuoteRequests(ctx: Context, status = "", cursor = 0) {
  const r = await queryRows(ctx, collection, {
    eq: status ? { status } : {},
    offset: cursor,
    limit: 50,
    sort: "createdAt",
    descending: true,
  });
  return {
    items: r.rows.map((row) => quoteRequestSchema.parse(row)),
    total: r.total,
    nextCursor: cursor + 50 < r.total ? cursor + 50 : null,
  };
}

export async function updateQuoteRequest(
  ctx: Context,
  id: string,
  raw: unknown,
) {
  const patch = quoteRequestPatch.parse(raw);
  const old = await getRow(ctx, collection, id);
  if (!old) throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  const updated = { ...old, ...patch, updatedAt: new Date().toISOString() };
  await saveRow(ctx, collection, updated);
  await audit(ctx, "quote-request", id, "update");
  return quoteRequestSchema.parse(updated);
}

/** Dashboard retry for automatic emails that failed when the request arrived. */
export async function retryQuoteRequestEmails(ctx: Context, id: string) {
  if (!(await getRow(ctx, collection, id)))
    throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  return followUp(ctx, id);
}

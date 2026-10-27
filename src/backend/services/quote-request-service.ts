import { sha256Hex } from "../web-crypto";
import {
  quoteRequestInput,
  quoteRequestPatch,
  quoteRequestSchema,
  quoteStatuses,
  advanceQuoteStatus,
  legacyQuotedStatuses,
} from "../../shared/quote-requests";
import type { Context } from "../context";
import { AppError } from "../errors";
import {
  countGroups,
  getRow,
  queryRows,
  removeRow,
  saveRow,
} from "../repositories/repository";
import { audit } from "./audit-service";
import { getVehicle } from "./vehicle-service";
import {
  confirmQuoteRequest,
  notifyQuoteOwner,
} from "./quote-request-email-service";
import { syncQuoteContact } from "./quote-request-contact-service";
import { canInvoiceQuotes } from "../../shared/plans";
import { currentPlanKey } from "./plan-service";
import { invoicesDashboardUrl } from "./quote-request-invoice-service";

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
  // Wix refuses aggregation to site collaborators, so the counts run elevated; the route
  // requires a manager. Counts only decorate the pipeline, so a failure leaves them out.
  const [r, groups, plan] = await Promise.all([
    queryRows(ctx, collection, {
      // Requests still stored as Won or Lost count as Quote sent.
      ...(status === "quoted"
        ? { notIn: { status: ["new", "in-progress"] } }
        : { eq: status ? { status } : {} }),
      offset: cursor,
      limit: 50,
      sort: "createdAt",
      descending: true,
    }),
    countGroups(ctx, collection, ["status"], {}, true).catch(() => null),
    // The invoice route checks the plan again; here it only decides how the button looks.
    currentPlanKey(ctx).catch(() => "basic" as const),
  ]);
  return {
    items: r.rows.map((row) => quoteRequestSchema.parse(row)),
    total: r.total,
    counts: groups
      ? Object.fromEntries(
          quoteStatuses.map((s) => [
            s,
            groups
              .filter((g) => {
                const stored = g.values.status ?? "new";
                return (
                  (legacyQuotedStatuses.includes(stored as string)
                    ? "quoted"
                    : stored) === s
                );
              })
              .reduce((sum, g) => sum + g.count, 0),
          ]),
        )
      : null,
    nextCursor: cursor + 50 < r.total ? cursor + 50 : null,
    invoicesUrl: invoicesDashboardUrl(ctx.siteId),
    invoicesEnabled: canInvoiceQuotes(plan),
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
  // Saving notes or a price means the dealer has started working on the request.
  const status = advanceQuoteStatus(
    quoteRequestSchema.parse(old).status,
    "in-progress",
  );
  const updated = {
    ...old,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
  await saveRow(ctx, collection, updated);
  await audit(ctx, "quote-request", id, "update");
  return quoteRequestSchema.parse(updated);
}

export async function getQuoteRequest(ctx: Context, id: string) {
  const row = await getRow(ctx, collection, id);
  if (!row) throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  return quoteRequestSchema.parse(row);
}

/** Removes a request for good. Its Wix contact and any draft invoice stay in Wix. */
export async function deleteQuoteRequest(ctx: Context, id: string) {
  if (!(await getRow(ctx, collection, id)))
    throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  await removeRow(ctx, collection, id);
  await audit(ctx, "quote-request", id, "delete");
  return { _id: id };
}

/** Dashboard retry for automatic emails that failed when the request arrived. */
export async function retryQuoteRequestEmails(ctx: Context, id: string) {
  if (!(await getRow(ctx, collection, id)))
    throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  return followUp(ctx, id);
}

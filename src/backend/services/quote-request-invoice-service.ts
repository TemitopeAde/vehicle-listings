import { auth } from "@wix/essentials";
import { invoices } from "@wix/get-paid";
import type { Context } from "../context";
import { AppError } from "../errors";
import { getRow, saveRow } from "../repositories/repository";
import {
  advanceQuoteStatus,
  quoteRequestSchema,
  type QuoteRequest,
} from "../../shared/quote-requests";
import { canInvoiceQuotes } from "../../shared/plans";
import { audit } from "./audit-service";
import { currentPlanKey } from "./plan-service";
import { syncQuoteContact, wixAddress } from "./quote-request-contact-service";

const collection = "quote-requests";

/** The site's Wix Invoices list; Get Paid has no documented route for a single invoice. */
export const invoicesDashboardUrl = (siteId: string) =>
  `https://manage.wix.com/dashboard/${siteId}/wix-invoices`;

/** A draft Get Paid invoice for the requested vehicle, at the quoted price when one was saved. */
export function quoteInvoice(q: QuoteRequest, now: Date) {
  const billingAddress = wixAddress(q);
  const name = q.vehicleTitle || "Vehicle";
  return {
    reference: {
      referenceType: "STANDALONE" as const,
      standaloneReference: {},
    },
    issueDate: now,
    currency: q.currency,
    title: `Quote for ${name}`.slice(0, 200),
    customerInfo: {
      contactId: q.contactId,
      contactDetails: {
        firstName: q.firstName,
        lastName: q.lastName,
        email: q.email,
        phone: q.phone,
        ...(q.company ? { company: q.company } : {}),
      },
      ...(Object.keys(billingAddress).length ? { billingAddress } : {}),
    },
    lineItems: [
      {
        lineItemType: "CUSTOM" as const,
        customItem: {
          name: name.slice(0, 200),
          ...(q.stockId ? { description: `Stock ${q.stockId}` } : {}),
          quantity: String(q.quantity),
          price: String(q.quotedPrice ?? q.listedPrice),
        },
      },
    ],
  };
}

export type QuoteInvoiceDependencies = {
  getRow: typeof getRow;
  saveRow: typeof saveRow;
  syncContact: typeof syncQuoteContact;
  audit: typeof audit;
  plan: typeof currentPlanKey;
  create: (invoice: ReturnType<typeof quoteInvoice>) => Promise<string>;
};
const dependencies: QuoteInvoiceDependencies = {
  getRow,
  saveRow,
  syncContact: syncQuoteContact,
  audit,
  plan: currentPlanKey,
  async create(invoice) {
    const created = await auth.elevate(invoices.createInvoice)(invoice);
    if (!created._id) throw new Error("Wix did not return an invoice ID");
    return created._id;
  },
};

/** Creates a draft Wix invoice for a quote request once; the dealer reviews and sends it in Wix Invoices. */
export async function createQuoteInvoice(
  ctx: Context,
  id: string,
  deps: QuoteInvoiceDependencies = dependencies,
) {
  const invoicesUrl = invoicesDashboardUrl(ctx.siteId);
  let row = await deps.getRow(ctx, collection, id);
  if (!row) throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  let request = quoteRequestSchema.parse(row);
  if (request.invoiceId) return { invoiceId: request.invoiceId, invoicesUrl };
  if (!canInvoiceQuotes(await deps.plan(ctx)))
    throw new AppError(
      "PLAN_REQUIRED",
      "Draft invoices are available on the Business plan.",
      403,
    );
  if (!request.contactId) {
    await deps.syncContact(ctx, id);
    row = (await deps.getRow(ctx, collection, id)) ?? row;
    request = quoteRequestSchema.parse(row);
    if (!request.contactId)
      throw new AppError(
        "CONTACT_REQUIRED",
        "The requester could not be added to Wix contacts. Check the app's Manage Contacts permission.",
        409,
      );
  }
  if (!request.currency)
    throw new AppError(
      "INVALID",
      "Set a currency on the vehicle before invoicing.",
      400,
    );
  let invoiceId: string;
  try {
    invoiceId = await deps.create(quoteInvoice(request, new Date()));
  } catch (error) {
    console.error(
      "Could not create Wix invoice for quote request",
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
    );
    throw new AppError(
      "INVOICE_FAILED",
      "The invoice could not be created. Check the app's Manage Invoices permission.",
      502,
    );
  }
  await deps.saveRow(ctx, collection, {
    ...row,
    invoiceId,
    status: advanceQuoteStatus(request.status, "quoted"),
    updatedAt: new Date().toISOString(),
  });
  await deps.audit(ctx, "quote-request", id, "invoice");
  return { invoiceId, invoicesUrl };
}

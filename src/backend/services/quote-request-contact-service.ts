import { auth } from "@wix/essentials";
import { contactsV5 } from "@wix/crm";
import type { Context } from "../context";
import { getRow, saveRow } from "../repositories/repository";
import {
  quoteRequestSchema,
  type QuoteRequest,
} from "../../shared/quote-requests";

const collection = "quote-requests";

/** The Wix contact for a requester; Wix matches existing contacts by email and phone. */
export function quoteContact(q: QuoteRequest) {
  const address = {
    ...(q.addressLine ? { addressLine1: q.addressLine } : {}),
    ...(q.city ? { city: q.city } : {}),
    ...(q.subdivision ? { subdivision: q.subdivision } : {}),
    ...(q.postalCode ? { postalCode: q.postalCode } : {}),
    // Wix stores countries as ISO 3166 alpha-2 codes; free-text names stay on the request only.
    ...(/^[a-z]{2}$/i.test(q.country)
      ? { country: q.country.toUpperCase() }
      : {}),
  };
  return {
    name: { first: q.firstName, last: q.lastName },
    email: { email: q.email },
    phone: { phone: q.phone },
    ...(q.company ? { company: { name: q.company } } : {}),
    ...(Object.keys(address).length
      ? { addresses: [{ tag: "BILLING" as const, address }] }
      : {}),
  };
}

export type QuoteContactDependencies = {
  getRow: typeof getRow;
  saveRow: typeof saveRow;
  upsert: (contact: ReturnType<typeof quoteContact>) => Promise<string>;
};
const dependencies: QuoteContactDependencies = {
  getRow,
  saveRow,
  async upsert(contact) {
    // APPEND fills only empty fields, so an anonymous form never overwrites an existing contact.
    const response = await auth.elevate(contactsV5.upsertContact)(contact, {
      upsertMode: "APPEND",
    });
    const id = response.contact?._id;
    if (!id) throw new Error("Wix did not return a contact ID");
    return id;
  },
};

/** Adds the requester to the site's Wix contacts and links the contact to the request. */
export async function syncQuoteContact(
  ctx: Context,
  id: string,
  deps: QuoteContactDependencies = dependencies,
) {
  const row = await deps.getRow(ctx, collection, id, true);
  if (!row) return "failed";
  const request = quoteRequestSchema.parse(row);
  if (request.contactId) return "added";
  if (ctx.demo) return "demo";
  try {
    const contactId = await deps.upsert(quoteContact(request));
    const latest = (await deps.getRow(ctx, collection, id, true)) ?? row;
    await deps.saveRow(ctx, collection, { ...latest, contactId }, false, true);
    return "added";
  } catch (error) {
    console.error(
      "Could not add quote requester to Wix contacts",
      error instanceof Error ? error.name : "unknown",
    );
    return "failed";
  }
}

import { auth } from "@wix/essentials";
import { contactsV5 } from "@wix/crm";
import type { Context } from "../context";
import { getRow, saveRow } from "../repositories/repository";
import {
  quoteRequestSchema,
  type QuoteRequest,
} from "../../shared/quote-requests";

const collection = "quote-requests";

/** A Wix address; Wix only accepts ISO 3166 codes, so free-text values stay on the request only. */
export function wixAddress(q: QuoteRequest) {
  const country = /^[a-z]{2}$/i.test(q.country) ? q.country.toUpperCase() : "";
  // The state picker stores bare codes ("LA"); Wix wants ISO 3166-2 ("NG-LA").
  const state = q.subdivision.trim().toUpperCase();
  const subdivision = !country
    ? ""
    : new RegExp(`^${country}-[A-Z0-9]{1,3}$`).test(state)
      ? state
      : /^[A-Z0-9]{1,3}$/.test(state)
        ? `${country}-${state}`
        : "";
  return {
    ...(q.addressLine ? { addressLine1: q.addressLine } : {}),
    ...(q.city ? { city: q.city } : {}),
    ...(subdivision ? { subdivision } : {}),
    ...(q.postalCode ? { postalCode: q.postalCode } : {}),
    ...(country ? { country } : {}),
  };
}

/** The Wix contact for a requester; Wix matches existing contacts by email and phone. */
export function quoteContact(q: QuoteRequest) {
  const address = wixAddress(q);
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

type Contact = ReturnType<typeof quoteContact>;

const isInvalidSubdivision = (error: unknown) =>
  (
    error as {
      details?: {
        validationError?: { fieldViolations?: { field?: string }[] };
      };
    }
  ).details?.validationError?.fieldViolations?.some((v) =>
    v.field?.endsWith(".subdivision"),
  ) ?? false;

function withoutSubdivision(contact: Contact): Contact {
  if (!contact.addresses) return contact;
  return {
    ...contact,
    addresses: contact.addresses.map(
      ({ address: { subdivision, ...address }, ...rest }) => ({
        ...rest,
        address,
      }),
    ),
  };
}

export type QuoteContactDependencies = {
  getRow: typeof getRow;
  saveRow: typeof saveRow;
  upsert: (contact: Contact) => Promise<string>;
};
const dependencies: QuoteContactDependencies = {
  getRow,
  saveRow,
  async upsert(contact) {
    try {
      // APPEND fills only empty fields, so an anonymous form never overwrites an existing contact.
      const response = await auth
        .elevate(contactsV5.upsertContact)(contact, { upsertMode: "APPEND" })
        .catch((error) => {
          // Some region codes from the location lookup aren't ISO 3166-2; keep the rest of the address.
          if (!isInvalidSubdivision(error)) throw error;
          return auth.elevate(contactsV5.upsertContact)(
            withoutSubdivision(contact),
            { upsertMode: "APPEND" },
          );
        });
      const id = response.contact?._id;
      if (!id) throw new Error("Wix did not return a contact ID");
      return id;
    } catch (error) {
      // Apps can't change a site member's contact, but linking the existing one is all we need.
      const applicationError = (
        error as {
          details?: {
            applicationError?: { code?: string; data?: { contactId?: string } };
          };
        }
      ).details?.applicationError;
      if (
        applicationError?.code !== "CANNOT_UPDATE_MEMBER" &&
        applicationError?.code !== "UNAUTHORIZED_UPDATE_MEMBER"
      )
        throw error;
      if (applicationError.data?.contactId)
        return applicationError.data.contactId;
      const matches = await auth.elevate(contactsV5.findMatchingContacts)({
        email: contact.email.email,
      });
      const id = matches.contacts?.[0]?._id;
      if (!id) throw error;
      return id;
    }
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
  try {
    const contactId = await deps.upsert(quoteContact(request));
    const latest = (await deps.getRow(ctx, collection, id, true)) ?? row;
    await deps.saveRow(ctx, collection, { ...latest, contactId }, false, true);
    return "added";
  } catch (error) {
    console.error(
      "Could not add quote requester to Wix contacts",
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
    );
    return "failed";
  }
}

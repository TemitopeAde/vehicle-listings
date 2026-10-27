import { z } from "zod";
import { countryCodes } from "./countries";

/** Set automatically by what the dealer does; a request only ever moves forward. */
export const quoteStatuses = ["new", "in-progress", "quoted"] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];
export const advanceQuoteStatus = (current: QuoteStatus, next: QuoteStatus) =>
  quoteStatuses.indexOf(next) > quoteStatuses.indexOf(current) ? next : current;
/** Stored statuses from when dealers set Won and Lost by hand; both had reached a quote. */
export const legacyQuotedStatuses = ["won", "lost"];
export const quotePaymentMethods = ["cash", "finance", "lease"] as const;
export const quoteTimelines = [
  "now",
  "this-month",
  "three-months",
  "researching",
] as const;
export const quotePaymentLabels: Record<
  (typeof quotePaymentMethods)[number],
  string
> = { cash: "Cash", finance: "Finance", lease: "Lease" };
export const quoteTimelineLabels: Record<
  (typeof quoteTimelines)[number],
  string
> = {
  now: "As soon as possible",
  "this-month": "Within a month",
  "three-months": "Within 3 months",
  researching: "Just researching",
};
export const quoteStatusLabels: Record<QuoteStatus, string> = {
  new: "New",
  "in-progress": "In progress",
  quoted: "Quote sent",
};

const optional = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .default("");

/**
 * Requester details follow the customer shape of Wix Get Paid quotes and invoices
 * (`contactDetails` and `billingAddress`), so a request can become a Wix quote unchanged.
 */
const quoteRequestFields = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name.")
    .max(100, "First name must be 100 characters or fewer."),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter your last name.")
    .max(100, "Last name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(150, "Email must be 150 characters or fewer.")
    .pipe(z.email("Enter a valid email address, like name@example.com.")),
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone number.")
    .regex(
      /^\+?[\d ()-]{7,40}$/,
      "Enter a valid phone number, like +1 555 123 4567.",
    ),
  company: optional(100, "Company"),
  addressLine: optional(150, "Address"),
  city: optional(50, "City"),
  subdivision: optional(50, "State or region"),
  postalCode: optional(50, "Postal code"),
  country: optional(60, "Country"),
  quantity: z.coerce
    .number({ error: "Enter how many vehicles you need." })
    .int("Enter a whole number.")
    .min(1, "Request at least 1 vehicle.")
    .max(50, "For more than 50 vehicles, mention it in your message."),
  paymentMethod: z.enum(quotePaymentMethods, {
    error: "Choose how you plan to pay.",
  }),
  timeline: z.enum(quoteTimelines, {
    error: "Choose when you plan to buy.",
  }),
  tradeIn: z.boolean().default(false),
  tradeInDetails: optional(500, "Trade-in details"),
  message: optional(3000, "Message"),
  consent: z.literal(true, {
    error: "Agree to be contacted so the dealership can send your quote.",
  }),
});

function requireTradeInDetails(
  value: { tradeIn: boolean; tradeInDetails: string },
  ctx: z.RefinementCtx,
) {
  if (value.tradeIn && value.tradeInDetails.length < 3)
    ctx.addIssue({
      code: "custom",
      path: ["tradeInDetails"],
      message: "Describe your trade-in: year, make, model and mileage.",
    });
}

/** New requests store an ISO country code; older ones may hold free text, so only input checks it. */
function requireKnownCountry(value: { country: string }, ctx: z.RefinementCtx) {
  if (value.country && !countryCodes.has(value.country))
    ctx.addIssue({
      code: "custom",
      path: ["country"],
      message: "Choose a country from the list.",
    });
}

/** New requests need a billing address for the invoice; older ones may have none, so only input checks it. */
function requireBillingAddress(
  value: { addressLine: string; city: string; country: string },
  ctx: z.RefinementCtx,
) {
  for (const [path, message] of [
    ["addressLine", "Enter your street address."],
    ["country", "Choose your country."],
    ["city", "Enter your city."],
  ] as const)
    if (!value[path]) ctx.addIssue({ code: "custom", path: [path], message });
}

/** What the visitor fills in on the storefront form. */
export const quoteRequestForm = quoteRequestFields
  .superRefine(requireTradeInDetails)
  .superRefine(requireKnownCountry)
  .superRefine(requireBillingAddress);
export type QuoteRequestFormInput = z.input<typeof quoteRequestForm>;
export type QuoteRequestFormValues = z.output<typeof quoteRequestForm>;

/** What the storefront sends to the API. */
export const quoteRequestInput = quoteRequestFields
  .extend({
    vehicleId: z.string().min(1).max(100),
    honeypot: z.string().max(0).default(""),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .superRefine(requireTradeInDetails)
  .superRefine(requireKnownCountry)
  .superRefine(requireBillingAddress);

const emailStatus = z
  .enum(["pending", "queued", "failed", "no-recipient"])
  .default("pending");

export const quoteRequestSchema = quoteRequestFields
  .extend({
    _id: z.string(),
    vehicleId: z.string(),
    vehicleTitle: optional(150, "Vehicle"),
    stockId: optional(40, "Stock ID"),
    dealerId: z.string().default(""),
    currency: optional(3, "Currency"),
    listedPrice: z.number().min(0).default(0),
    quotedPrice: z.number().min(0).nullable().default(null),
    status: z.preprocess(
      (value) => (legacyQuotedStatuses.includes(value as string) ? "quoted" : value),
      z.enum(quoteStatuses).default("new"),
    ),
    notes: optional(3000, "Notes"),
    confirmationEmailStatus: emailStatus,
    ownerEmailStatus: emailStatus,
    /** The requester's Wix contact, once added. */
    contactId: optional(100, "Contact ID"),
    /** The draft Wix Get Paid invoice created from this request. */
    invoiceId: optional(100, "Invoice ID"),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const quoteRequestPatch = z
  .object({
    notes: z.string().max(3000).optional(),
    quotedPrice: z.number().min(0).max(1e12).nullable().optional(),
  })
  .strict();

export const quoteRequesterName = (
  q: Pick<QuoteRequest, "firstName" | "lastName">,
) => `${q.firstName} ${q.lastName}`.trim();

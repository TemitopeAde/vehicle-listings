import { z } from "zod";

export const quoteStatuses = [
  "new",
  "in-progress",
  "quoted",
  "won",
  "lost",
] as const;
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
export const quoteStatusLabels: Record<(typeof quoteStatuses)[number], string> =
  {
    new: "New",
    "in-progress": "In progress",
    quoted: "Quote sent",
    won: "Won",
    lost: "Lost",
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

/** What the visitor fills in on the storefront form. */
export const quoteRequestForm = quoteRequestFields.superRefine(
  requireTradeInDetails,
);
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
  .superRefine(requireTradeInDetails);

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
    status: z.enum(quoteStatuses).default("new"),
    notes: optional(3000, "Notes"),
    confirmationEmailStatus: emailStatus,
    ownerEmailStatus: emailStatus,
    /** The requester's Wix contact, once added. */
    contactId: optional(100, "Contact ID"),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const quoteRequestPatch = z
  .object({
    status: z.enum(quoteStatuses).optional(),
    notes: z.string().max(3000).optional(),
    quotedPrice: z.number().min(0).max(1e12).nullable().optional(),
  })
  .strict();

export const quoteRequesterName = (
  q: Pick<QuoteRequest, "firstName" | "lastName">,
) => `${q.firstName} ${q.lastName}`.trim();

import { z } from "zod";
import type { Context } from "../context";
import { AppError } from "../errors";
import {
  quotePaymentLabels,
  quoteRequestSchema,
  quoteRequesterName,
  quoteTimelineLabels,
  type QuoteRequest,
} from "../../shared/quote-requests";
import { translate, type Language } from "../../shared/i18n";
import { money } from "../../shared/utils";
import {
  brandedEmail,
  emailKey,
  escapeEmailText,
  showroomLanguage,
} from "./inquiry-email-content";
import {
  emailDependencies,
  type InquiryEmailDependencies,
} from "./inquiry-email-service";

const collection = "quote-requests";

export const quoteReplyInput = z
  .object({
    id: z.string().min(1).max(100),
    subject: z.string().trim().min(1).max(150),
    html: z.string().min(1).max(30000),
    idempotencyKey: z.uuid(),
  })
  .strict();

async function loadRequest(
  ctx: Context,
  id: string,
  deps: InquiryEmailDependencies,
) {
  const row = await deps.getRow(ctx, collection, id, true);
  if (!row) throw new AppError("NOT_FOUND", "Quote request not found.", 404);
  return { row, request: quoteRequestSchema.parse(row) };
}

function summary(q: QuoteRequest, language: Language) {
  const e = escapeEmailText;
  const label = (text: string) => translate(language, text);
  const address = [
    q.addressLine,
    q.city,
    q.subdivision,
    q.postalCode,
    q.country,
  ]
    .filter(Boolean)
    .join(", ");
  const rows: [string, string][] = [
    ["Vehicle", q.vehicleTitle],
    ...(q.listedPrice && q.currency
      ? ([["Listed price", money(q.listedPrice, q.currency)]] as [
          string,
          string,
        ][])
      : []),
    ["Quantity", String(q.quantity)],
    ["Payment", label(quotePaymentLabels[q.paymentMethod])],
    ["Timeline", label(quoteTimelineLabels[q.timeline])],
    ["Trade-in", q.tradeIn ? q.tradeInDetails : label("No")],
  ];
  const contact: [string, string][] = [
    ["Name", quoteRequesterName(q)],
    ["Email", q.email],
    ["Phone", q.phone],
    ...(q.company ? ([["Company", q.company]] as [string, string][]) : []),
    ...(address ? ([["Address", address]] as [string, string][]) : []),
  ];
  const list = (items: [string, string][]) =>
    `<ul>${items.map(([k, v]) => `<li><strong>${e(label(k))}:</strong> ${e(v)}</li>`).join("")}</ul>`;
  return { request: list(rows), contact: list(contact) };
}

/** Sends a quote email whose recipient always comes from the stored request. */
export async function deliverQuoteEmail(
  ctx: Context,
  id: string,
  subject: string,
  html: string,
  key: string,
  automatic = false,
  deps: InquiryEmailDependencies = emailDependencies,
  language?: Language,
) {
  if (!automatic && !ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Only site collaborators can email quote requesters.",
      403,
    );
  const { request } = await loadRequest(ctx, id, deps);
  const [branding, resolvedLanguage] = await Promise.all([
    deps.branding(ctx),
    language ? Promise.resolve(language) : showroomLanguage(ctx),
  ]);
  return deps.send(
    {
      ...brandedEmail(branding.siteName, subject, html, resolvedLanguage),
      toRecipients: [
        {
          emailAddress: request.email,
          name: quoteRequesterName(request).slice(0, 50),
        },
      ],
      ...(branding.replyTo
        ? { replyTo: { emailAddress: branding.replyTo } }
        : {}),
      type: "TRANSACTIONAL",
    },
    await emailKey(ctx.siteId, id, key),
  );
}

export async function replyToQuoteRequest(
  ctx: Context,
  raw: unknown,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  const input = quoteReplyInput.parse(raw);
  return deliverQuoteEmail(
    ctx,
    input.id,
    input.subject,
    input.html,
    input.idempotencyKey,
    false,
    deps,
  );
}

async function recordStatus(
  ctx: Context,
  id: string,
  field: "confirmationEmailStatus" | "ownerEmailStatus",
  status: string,
  deps: InquiryEmailDependencies,
) {
  try {
    const latest = await deps.getRow(ctx, collection, id, true);
    // An elevated update: the request may come from a site visitor.
    if (latest)
      await deps.saveRow(
        ctx,
        collection,
        { ...latest, [field]: status },
        false,
        true,
      );
  } catch {
    console.error("Could not record quote request email status");
  }
}

/** The automatic "we received your request" email to the requester. */
export async function confirmQuoteRequest(
  ctx: Context,
  id: string,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  const { row, request } = await loadRequest(ctx, id, deps);
  if (row.confirmationEmailStatus === "queued") return "queued";
  const language = await showroomLanguage(ctx);
  const details = summary(request, language);
  try {
    await deliverQuoteEmail(
      ctx,
      id,
      "We received your quote request",
      `<p>Hello ${escapeEmailText(request.firstName)},</p><p>Thank you for requesting a quote. Our team is preparing it and will reply to this email address. Here is what you sent us:</p>${details.request}<p>Reference: ${escapeEmailText(id)}</p>`,
      "quote-confirmation",
      true,
      deps,
      language,
    );
    await recordStatus(ctx, id, "confirmationEmailStatus", "queued", deps);
    return "queued";
  } catch (error) {
    console.error(
      "Quote request confirmation failed",
      error instanceof Error ? error.name : "unknown",
    );
    await recordStatus(ctx, id, "confirmationEmailStatus", "failed", deps);
    return "failed";
  }
}

/**
 * Tells the site owner, and the listing's dealer when it has an email, about a new
 * request. Replies go straight to the requester.
 */
export async function notifyQuoteOwner(
  ctx: Context,
  id: string,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  const { row, request } = await loadRequest(ctx, id, deps);
  if (row.ownerEmailStatus === "queued") return "queued";
  try {
    const [branding, language] = await Promise.all([
      deps.branding(ctx),
      showroomLanguage(ctx),
    ]);
    const dealer = request.dealerId
      ? await deps.getRow(ctx, "dealers", request.dealerId, true)
      : null;
    const recipients = [
      ...new Set(
        [branding.replyTo, dealer?.email]
          .map((value) => z.email().safeParse(value))
          .filter((parsed) => parsed.success)
          .map((parsed) => parsed.data.toLowerCase()),
      ),
    ];
    if (!recipients.length) {
      await recordStatus(ctx, id, "ownerEmailStatus", "no-recipient", deps);
      return "no-recipient";
    }
    const details = summary(request, language);
    const draft = brandedEmail(
      branding.siteName,
      `New quote request: ${request.vehicleTitle || "vehicle"}`,
      `<p>${escapeEmailText(quoteRequesterName(request))} requested a quote.</p>${details.request}${details.contact}${request.message ? `<blockquote>${escapeEmailText(request.message)}</blockquote>` : ""}<p>Reply to this email to answer the requester, or manage the request under Quote requests in your dashboard.</p>`,
      language,
    );
    await deps.send(
      {
        ...draft,
        toRecipients: recipients.map((emailAddress) => ({
          emailAddress,
          name: branding.siteName.slice(0, 50),
        })),
        replyTo: { emailAddress: request.email },
        type: "TRANSACTIONAL",
      },
      await emailKey(ctx.siteId, id, "quote-owner-notification"),
    );
    await recordStatus(ctx, id, "ownerEmailStatus", "queued", deps);
    return "queued";
  } catch (error) {
    console.error(
      "Quote request owner notification failed",
      error instanceof Error ? error.name : "unknown",
    );
    await recordStatus(ctx, id, "ownerEmailStatus", "failed", deps);
    return "failed";
  }
}

import { auth } from "@wix/essentials";
import { siteProperties } from "@wix/business-tools";
import { emailTransmissions } from "@wix/email-transmissions";
import { z } from "zod";
import type { Context } from "../context";
import { AppError } from "../errors";
import { getRow, saveRow } from "../repositories/repository";
import { inquirySchema } from "../../shared/schemas";
import {
  brandedEmail,
  emailKey,
  escapeEmailText,
} from "./inquiry-email-content";

export const inquiryReplyInput = z
  .object({
    id: z.string().min(1).max(100),
    subject: z.string().trim().min(1).max(150),
    html: z.string().min(1).max(30000),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

async function emailRequest<T>(
  run: () => Promise<T>,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new AppError(
                "EMAIL_TIMEOUT",
                "Wix email request timed out. Try again; retries use the same email key.",
                504,
              ),
            ),
          15000,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(
      "Wix email request failed",
      error instanceof Error ? error.name : "unknown",
    );
    throw new AppError("EMAIL_REQUEST_FAILED", message, 502);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function emailBranding(ctx: Context) {
  if (ctx.demo) return { siteName: "Local demo", enabled: false };
  const { properties } = await emailRequest(
    () => auth.elevate(siteProperties.getSiteProperties)(),
    "Could not read Wix website settings. Check the app's Manage Your App permission and try again.",
  );
  const siteName = properties?.siteDisplayName?.trim();
  if (!siteName)
    throw new AppError(
      "SITE_NAME_REQUIRED",
      "Set your website name in Wix Website Settings before sending emails.",
      409,
    );
  const email = z.string().email().safeParse(properties?.email);
  return {
    siteName,
    enabled: true,
    ...(email.success ? { replyTo: email.data } : {}),
  };
}

export type EmailDraft = {
  emailSubject: string;
  emailHtmlContent: string;
  senderName: string;
  toRecipients: { emailAddress: string; name: string }[];
  replyTo?: { emailAddress: string };
  type: "TRANSACTIONAL";
};
export type EmailResult = { transmissionId: string; status: string };
export type InquiryEmailDependencies = {
  branding: typeof emailBranding;
  getRow: typeof getRow;
  saveRow: typeof saveRow;
  send: (draft: EmailDraft, key: string) => Promise<EmailResult>;
};
export const emailDependencies: InquiryEmailDependencies = {
  branding: emailBranding,
  getRow,
  saveRow,
  async send(draft, key) {
    const response = await emailRequest(
      () =>
        auth.elevate(emailTransmissions.sendEmailTransmission)(draft, {
          idempotencyKey: key,
        }),
      "Email could not be queued. Check Wix email permissions and sending quota, then try again.",
    );
    const transmission = response.emailTransmission;
    if (
      !transmission?._id ||
      !transmission.status ||
      transmission.status === "REJECTED" ||
      transmission.toRecipients?.some(
        (recipient) => recipient.status === "FAILED",
      )
    )
      throw new AppError(
        "EMAIL_REJECTED",
        "Wix could not accept this email. Check email permissions, sending quota and recipient details.",
        502,
      );
    return { transmissionId: transmission._id, status: transmission.status };
  },
};

export async function deliverInquiryEmail(
  ctx: Context,
  inquiryId: string,
  subject: string,
  html: string,
  key: string,
  automatic = false,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  if (!automatic && !ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Only site collaborators can reply to inquiries.",
      403,
    );
  if (ctx.demo)
    throw new AppError(
      "DEMO_EMAIL_DISABLED",
      "Email sending is unavailable in the local demo.",
      409,
    );
  // The recipient comes exclusively from the stored inquiry, never from caller input.
  const row = await deps.getRow(ctx, "inquiries", inquiryId, automatic);
  if (!row) throw new AppError("NOT_FOUND", "Inquiry not found.", 404);
  const inquiry = inquirySchema.parse(row);
  const branding = await deps.branding(ctx);
  return deps.send(
    {
      ...brandedEmail(branding.siteName, subject, html),
      toRecipients: [
        { emailAddress: inquiry.email, name: inquiry.name.slice(0, 50) },
      ],
      ...(branding.replyTo
        ? { replyTo: { emailAddress: branding.replyTo } }
        : {}),
      type: "TRANSACTIONAL",
    },
    emailKey(ctx.siteId, inquiryId, key),
  );
}

export async function replyToInquiry(
  ctx: Context,
  raw: unknown,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  const input = inquiryReplyInput.parse(raw);
  return deliverInquiryEmail(
    ctx,
    input.id,
    input.subject,
    input.html,
    input.idempotencyKey,
    false,
    deps,
  );
}

export async function confirmInquiry(
  ctx: Context,
  id: string,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  const row = await deps.getRow(ctx, "inquiries", id, true);
  if (!row) throw new AppError("NOT_FOUND", "Inquiry not found.", 404);
  if (row.confirmationEmailStatus === "queued") return "queued";
  if (ctx.demo) return "demo";
  const inquiry = inquirySchema.parse(row);
  try {
    const result = await deliverInquiryEmail(
      ctx,
      id,
      "We received your vehicle inquiry",
      `<p>Hello ${escapeEmailText(inquiry.name)},</p><p>Thank you for your ${inquiry.kind === "test-drive" ? "test drive request" : inquiry.kind === "trade-in" ? "trade-in inquiry" : "vehicle inquiry"}. Your request has been received, and our team will follow up using the contact details you provided.</p><p>Reference: ${escapeEmailText(id)}</p>`,
      "confirmation",
      true,
      deps,
    );
    const latest = (await deps.getRow(ctx, "inquiries", id, true)) ?? row;
    await deps.saveRow(
      ctx,
      "inquiries",
      {
        ...latest,
        confirmationEmailStatus: "queued",
        confirmationTransmissionId: result.transmissionId,
      },
      true,
    );
    return "queued";
  } catch (error) {
    console.error(
      "Inquiry confirmation failed",
      error instanceof Error ? error.name : "unknown",
    );
    try {
      const latest = (await deps.getRow(ctx, "inquiries", id, true)) ?? row;
      await deps.saveRow(
        ctx,
        "inquiries",
        { ...latest, confirmationEmailStatus: "failed" },
        true,
      );
    } catch {
      console.error("Could not record inquiry confirmation status");
    }
    return "failed";
  }
}

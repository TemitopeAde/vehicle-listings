import { z } from "zod";
import type { Context } from "../context";
import type { Dealer } from "../../shared/schemas";
import { translate, type Language } from "../../shared/i18n";
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

function applicationDetails(dealer: Dealer, language: Language) {
  const label = (text: string) => translate(language, text);
  const rows: [string, string][] = [
    [label("Business"), dealer.businessName],
    [label("Email"), dealer.email],
    [label("Phone"), dealer.phone],
    [label("Location"), dealer.location],
    [label("Address"), dealer.address],
    [label("Website"), dealer.website],
  ];
  return `<ul>${rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<li><strong>${escapeEmailText(label)}:</strong> ${escapeEmailText(value)}</li>`,
    )
    .join("")}</ul>`;
}

/** Tells the site owner that a dealership applied to sell vehicles. */
export async function notifyOwnerOfDealerApplication(
  ctx: Context,
  dealer: Dealer,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  try {
    const [branding, language] = await Promise.all([
      deps.branding(ctx),
      showroomLanguage(ctx),
    ]);
    const owner = z.email().safeParse(branding.replyTo);
    if (!owner.success) {
      console.error("Dealer application has no site email to notify");
      return "no-recipient";
    }
    const draft = brandedEmail(
      branding.siteName,
      translate(language, "New dealer application: {name}", {
        name: dealer.businessName,
      }),
      `<p>${escapeEmailText(translate(language, "{name} applied to sell vehicles.", { name: dealer.businessName }))}</p>${applicationDetails(dealer, language)}<p>${escapeEmailText(translate(language, "Review the application under Dealers in your dashboard. Reply to this email to contact the applicant."))}</p>`,
      language,
    );
    await deps.send(
      {
        ...draft,
        toRecipients: [
          {
            emailAddress: owner.data,
            name: branding.siteName.slice(0, 50),
          },
        ],
        replyTo: { emailAddress: dealer.email },
        type: "TRANSACTIONAL",
      },
      await emailKey(ctx.siteId, dealer._id, "dealer-application"),
    );
    return "queued";
  } catch (error) {
    console.error(
      "Dealer application email failed",
      error instanceof Error ? error.name : "unknown",
    );
    return "failed";
  }
}

/** Tells the dealership that the site owner approved the application. */
export async function notifyDealerApproved(
  ctx: Context,
  dealer: Dealer,
  deps: InquiryEmailDependencies = emailDependencies,
) {
  const address = z.email().safeParse(dealer.email);
  if (!address.success) return "no-recipient";
  try {
    const [branding, language] = await Promise.all([
      deps.branding(ctx),
      showroomLanguage(ctx),
    ]);
    const draft = brandedEmail(
      branding.siteName,
      translate(language, "Your dealership is approved"),
      `<p>${escapeEmailText(translate(language, "Hello {name},", { name: dealer.businessName }))}</p><p>${escapeEmailText(translate(language, "Your application to sell vehicles has been approved. Log in with this email address and open Add a vehicle to list your inventory."))}</p>`,
      language,
    );
    await deps.send(
      {
        ...draft,
        toRecipients: [
          {
            emailAddress: address.data,
            name: dealer.businessName.slice(0, 50),
          },
        ],
        ...(branding.replyTo
          ? { replyTo: { emailAddress: branding.replyTo } }
          : {}),
        type: "TRANSACTIONAL",
      },
      await emailKey(
        ctx.siteId,
        dealer._id,
        `dealer-approved:${dealer.updatedAt}`,
      ),
    );
    return "queued";
  } catch (error) {
    console.error(
      "Dealer approval email failed",
      error instanceof Error ? error.name : "unknown",
    );
    return "failed";
  }
}

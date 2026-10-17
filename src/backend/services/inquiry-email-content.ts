import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { AppError } from "../errors";

export const escapeEmailText = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );

export function sanitizeEmailBody(html: string) {
  const clean = sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "ol",
      "ul",
      "li",
      "a",
    ],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
  });
  if (
    !sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} })
      .replace(/&nbsp;/g, " ")
      .trim()
  )
    throw new AppError("EMPTY_EMAIL", "Enter an email message.");
  return clean;
}

export function brandedEmail(siteName: string, subject: string, body: string) {
  const name = siteName.trim();
  if (!name)
    throw new AppError(
      "SITE_NAME_REQUIRED",
      "Set your website name in Wix Website Settings before sending emails.",
      409,
    );
  return {
    // Reserve room for the full site name in the body even if the subject must be shortened.
    emailSubject: `${name} — ${subject}`.replace(/[\r\n]/g, " ").slice(0, 200),
    emailHtmlContent: `<div><h2>${escapeEmailText(name)}</h2>${sanitizeEmailBody(body)}<hr><p>Sent by ${escapeEmailText(name)}</p></div>`,
    senderName: name.slice(0, 50),
  };
}

export function emailKey(siteId: string, inquiryId: string, key: string) {
  const hash = createHash("sha256")
    .update(`${siteId}:${inquiryId}:${key}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

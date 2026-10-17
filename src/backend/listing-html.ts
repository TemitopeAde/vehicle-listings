import sanitizeHtml from "sanitize-html";

/** Keeps the formatting the description editor can produce. */
export function cleanDescription(value: string) {
  return sanitizeHtml(value, {
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
  }).trim();
}

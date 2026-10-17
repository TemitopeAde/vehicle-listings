/** Visible text in a description, ignoring Quill markup. */
export function descriptionText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const allowedTags = new Set([
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
]);

/** Browser allowlist for a saved description. Plain text is returned unchanged. */
export function descriptionHtml(value: string) {
  if (typeof DOMParser === "undefined" || !/<\/?[a-z][\s\S]*?>/i.test(value))
    return "";
  const doc = new DOMParser().parseFromString(value, "text/html");
  clean(doc.body);
  return doc.body.innerHTML;
}

function clean(node: Node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const element = child as HTMLElement;
    clean(element);
    const tag = element.tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attr of [...element.attributes]) {
      if (tag === "a" && (attr.name === "href" || attr.name === "title"))
        continue;
      element.removeAttribute(attr.name);
    }
    if (tag === "a") {
      const href = element.getAttribute("href") ?? "";
      if (!/^(https?:|mailto:)/i.test(href)) element.removeAttribute("href");
      element.setAttribute("rel", "noopener noreferrer");
    }
  }
}

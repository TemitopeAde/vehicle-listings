/** Extract the selected family from a CSS font shorthand, excluding fallback families. */
export function fontFamilyName(font: string): string {
  const family = font
    .trim()
    .replace(
      /^.*?(?:\d*\.?\d+(?:px|pt|pc|rem|em|ex|ch|vw|vh|vmin|vmax|cm|mm|in|q|%)|xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)\s*(?:\/\s*(?:normal|\d*\.?\d+(?:[a-z]+|%)?)\s*)?\s+/i,
      "",
    );
  const primary = family.match(
    /^(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^,]+))/,
  );
  return (primary?.[1] ?? primary?.[2] ?? primary?.[3] ?? family)
    .trim()
    .replace(/\\(["'\\])/g, "$1");
}

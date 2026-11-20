export type CustomFormField = { label: string; value: string };

/** Site owners enter one extra field label per line or separate labels with commas. */
export function parseCustomFieldLabels(value?: string | null) {
  if (!value) return [];
  const labels = value
    .split(/[\n,]/)
    .map((label) => label.trim().slice(0, 80))
    .filter(Boolean);
  return [...new Set(labels)].slice(0, 8);
}

export function emptyCustomFields(value?: string | null): CustomFormField[] {
  return parseCustomFieldLabels(value).map((label) => ({ label, value: "" }));
}

import type { CSSProperties } from "react";
import { filterSettings, filterVisibilityKeys } from "./filter-visibility";

export const textSections = [
  ["body", "General text", "14px"],
  ["brand", "Showroom name", "14px"],
  ["heading", "Heading", "30px"],
  ["description", "Description", "14px"],
  ["label", "Filter and form labels", "14px"],
  ["input", "Inputs and dropdowns", "14px"],
  ["vehicle-title", "Vehicle titles", "16px"],
  ["vehicle-meta", "Vehicle specifications", "14px"],
  ["price", "Prices", "20px"],
  ["badge", "Badges", "12px"],
  ["button", "Primary buttons", "14px"],
  ["secondary-button", "Secondary buttons and icons", "14px"],
  ["message", "Status and error messages", "14px"],
] as const;
export const filterTextSections = filterSettings.map(([, label, attribute]) => {
  const key = `filter-${attribute.slice(5)}`;
  return {
    label,
    sections: [
      [`${key}-label`, `${label} label`, "14px", "label"],
      [`${key}-input`, `${label} input`, "14px", "input"],
    ] as const,
  };
});
export const listingTextSections = [
  ["vehicle-mileage", "Mileage", "14px", "vehicle-meta"],
  ["vehicle-transmission", "Transmission", "14px", "vehicle-meta"],
  ["vehicle-fuel", "Fuel", "14px", "vehicle-meta"],
  ["vehicle-location", "Location", "14px", "vehicle-meta"],
  ["view-vehicle", "View vehicle button", "14px", "button"],
  ["compare-toggle", "Compare label", "14px", "label"],
  ["save-vehicle", "Save vehicle icon", "14px", "secondary-button"],
  ["compare-vehicles", "Compare vehicles button", "14px", "secondary-button"],
  ["more-filters", "More filters heading", "14px", "label"],
  ["results-count", "Results count", "14px", "message"],
  ["empty-results", "No results message", "14px", "message"],
  ["previous-page", "Previous page button", "12px", "secondary-button"],
  ["next-page", "Next page button", "12px", "secondary-button"],
  ["page-number", "Page numbers", "12px", "secondary-button"],
  ["load-more", "Load more button", "14px", "secondary-button"],
  ["retry", "Try again button", "12px", "secondary-button"],
  ["back-to-inventory", "Back to inventory button", "14px", "secondary-button"],
] as const;
const fontSections = [
  ...textSections,
  ...filterTextSections.flatMap(({ sections }) => sections),
  ...listingTextSections,
];
export const surfaceSettings = [
  ["background-color", "Widget background", "#ffffff", "--sf-bg"],
  ["text-color", "Default text", "#243b2e", "--sf-fg"],
  ["muted-color", "Secondary text", "#64756b", "--sf-muted"],
  ["accent", "Accent and focus rings", "#196947", "--accent"],
  ["border-color", "Borders", "#dce4de", "--sf-border"],
  ["subtle-color", "Subtle surfaces", "#f3f6f3", "--sf-subtle"],
  ["card-background", "Vehicle card background", "#ffffff", "--sf-card-bg"],
  ["input-background", "Input background", "#ffffff", "--sf-input-bg"],
  ["placeholder-color", "Input placeholder", "#64756b", "--sf-placeholder"],
  [
    "button-background",
    "Primary button background",
    "#196947",
    "--sf-button-bg",
  ],
  [
    "button-hover-background",
    "Primary button hover",
    "#15583c",
    "--sf-button-hover",
  ],
  [
    "secondary-button-background",
    "Secondary button background",
    "#ffffff",
    "--sf-secondary-bg",
  ],
  [
    "secondary-button-hover-background",
    "Secondary button hover",
    "#f3f6f3",
    "--sf-secondary-hover",
  ],
  ["badge-background", "Badge background", "#f3f6f3", "--sf-badge-bg"],
  ["error-color", "Error text and borders", "#8c3327", "--sf-danger"],
] as const;
export type FontValue = { font: string; textDecoration: string };
export type WidgetStyle = Record<string, string>;
export const styleKeys = [
  ...surfaceSettings.map(([key]) => key),
  ...fontSections.flatMap(([key]) => [`${key}-font`, `${key}-color`]),
];
export const panelDefaults: Record<string, string> = {
  "display-name": "Find your next chapter.",
  description:
    "A carefully managed collection of cars. Find the one that feels right.",
  columns: "3",
  radius: "12",
  layout: "grid",
  "item-limit": "12",
  pagination: "pages",
  "featured-only": "false",
  ...Object.fromEntries(filterVisibilityKeys.map((key) => [key, "true"])),
  ...Object.fromEntries(styleKeys.map((key) => [key, ""])),
};
export function readFont(value: string | undefined): FontValue | undefined {
  if (!value) return;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      "font" in parsed &&
      typeof parsed.font === "string"
    ) {
      return {
        font: parsed.font,
        textDecoration:
          "textDecoration" in parsed &&
          typeof parsed.textDecoration === "string"
            ? parsed.textDecoration
            : "",
      };
    }
  } catch {
    /* Older plain CSS font values remain usable. */
  }
  return { font: value, textDecoration: "" };
}
export function selectedFonts(settings: WidgetStyle): string[] {
  return [
    ...new Set(
      fontSections
        .map(([key]) => readFont(settings[`${key}-font`])?.font)
        .filter((font): font is string => Boolean(font)),
    ),
  ];
}
/** CSS variables and font for the `.autohaus` root shared by the storefront widgets. */
export function storefrontRootStyle(
  theme: { accent: string; radius: number; fontFamily: string },
  settings: WidgetStyle,
): CSSProperties & Record<`--${string}`, string | number> {
  const bodyFont = readFont(settings["body-font"]);
  return {
    "--accent": theme.accent,
    "--radius": `${theme.radius}px`,
    ...(bodyFont ? { font: bodyFont.font } : { fontFamily: theme.fontFamily }),
    ...widgetStyleVariables(settings),
  };
}
export function widgetStyleVariables(settings: WidgetStyle): CSSProperties {
  const variables: Record<string, string> = {};
  for (const [key, , , variable] of surfaceSettings) {
    if (settings[key]) variables[variable] = settings[key];
  }
  for (const [key] of textSections) {
    const font = readFont(settings[`${key}-font`]);
    if (font) {
      variables[`--sf-${key}-font`] = font.font;
      variables[`--sf-${key}-decoration`] = font.textDecoration || "none";
    }
    if (settings[`${key}-color`])
      variables[`--sf-${key}-color`] = settings[`${key}-color`];
  }
  return variables as CSSProperties;
}

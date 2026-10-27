import { z } from "zod";
import {
  filterTextSections,
  listingTextSections,
  surfaceSettings,
  textSections,
} from "../storefront/widget-style";
import { filterSettings } from "../storefront/filter-visibility";

/**
 * Widget settings shared by the Editor panels, Wix AI tools and both widget builds (classic custom
 * elements and Harmony components). One record per widget type, so every copy of a widget agrees.
 * Keys are the classic attribute names; `prop` is the Harmony component prop.
 */
export const widgetTypes = [
  "marketplace",
  "details",
  "add-vehicle",
  "dealer-application",
] as const;
export type WidgetType = (typeof widgetTypes)[number];
export type WidgetValues = Record<string, string>;

type Kind = "text" | "long-text" | "color" | "font" | "number" | "boolean" | "choice";
export type WidgetKeyInfo = {
  key: string;
  prop: string;
  label: string;
  kind: Kind;
  min?: number;
  max?: number;
  options?: readonly string[];
};

export const toPropName = (key: string) =>
  key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

const info = (
  key: string,
  label: string,
  kind: Kind,
  extra: Partial<WidgetKeyInfo> = {},
): WidgetKeyInfo => ({ key, prop: toPropName(key), label, kind, ...extra });

const styleInfo: WidgetKeyInfo[] = [
  ...surfaceSettings.map(([key, label]) => info(key, label, "color")),
  ...[
    ...textSections,
    ...filterTextSections.flatMap(({ sections }) => sections),
    ...listingTextSections,
  ].flatMap(([key, label]) => [
    info(`${key}-font`, `${label} font`, "font"),
    info(`${key}-color`, `${label} colour`, "color"),
  ]),
];
const radius = info("radius", "Corner radius", "number", { min: 0, max: 32 });

const keysByType: Record<WidgetType, WidgetKeyInfo[]> = {
  marketplace: [
    info("display-name", "Heading", "text", { prop: "title" }),
    info("description", "Description", "long-text"),
    info("layout", "Layout", "choice", { options: ["grid", "list"] }),
    info("columns", "Columns", "number", { min: 1, max: 4 }),
    radius,
    info("item-limit", "Vehicles per page", "number", { min: 1, max: 100 }),
    info("pagination", "Pagination", "choice", {
      options: ["pages", "infinite"],
    }),
    info("featured-only", "Featured vehicles only", "boolean"),
    ...filterSettings.map(([, label, key]) =>
      info(key, `Show ${label} filter`, "boolean"),
    ),
    ...styleInfo,
  ],
  details: [radius, ...styleInfo],
  "add-vehicle": [info("display-name", "Heading", "text", { prop: "title" })],
  "dealer-application": [
    info("display-name", "Heading", "text", { prop: "title" }),
  ],
};

export const widgetKeyInfo = (type: WidgetType) => keysByType[type];

const cssColor =
  /^(#[0-9a-f]{3,8}|(rgba?|hsla?)\([\d\s.,%/]+\)|var\(--[\w-]+\))$/i;

/** Why a value is invalid, or null. An empty string is always valid: it unsets the key. */
function invalid(key: WidgetKeyInfo, value: string): string | null {
  if (value === "") return null;
  switch (key.kind) {
    case "color":
      // The Editor's picker can return rgba() with opacity, not only hex.
      return value.length <= 100 && cssColor.test(value)
        ? null
        : "Use a colour like #196947 or rgba(25, 105, 71, 0.8).";
    case "font":
      return value.length <= 500 && !/[<;]/.test(value) ? null : "Invalid font.";
    case "number": {
      const n = Number(value);
      return Number.isInteger(n) && n >= key.min! && n <= key.max!
        ? null
        : `Use a whole number from ${key.min} to ${key.max}.`;
    }
    case "boolean":
      return value === "true" || value === "false" ? null : 'Use "true" or "false".';
    case "choice":
      return key.options!.includes(value)
        ? null
        : `Use one of: ${key.options!.join(", ")}.`;
    case "text":
      return value.length <= 200 ? null : "Use 200 characters or fewer.";
    case "long-text":
      return value.length <= 500 ? null : "Use 500 characters or fewer.";
  }
}

/** A patch of settings for one widget type; unknown keys and invalid values are rejected. */
export function widgetSettingsPatch(type: WidgetType) {
  const keys = new Map(keysByType[type].map((k) => [k.key, k]));
  return z.record(z.string(), z.string()).superRefine((patch, ctx) => {
    for (const [name, value] of Object.entries(patch)) {
      const key = keys.get(name);
      const problem = key
        ? invalid(key, value)
        : `"${name}" is not a ${type} widget setting.`;
      if (problem) ctx.addIssue({ code: "custom", path: [name], message: problem });
    }
  });
}

/** Stored values merged with a patch; empty values are dropped so the Editor value shows again. */
export function applyWidgetPatch(stored: WidgetValues, patch: WidgetValues) {
  return Object.fromEntries(
    Object.entries({ ...stored, ...patch }).filter(([, value]) => value !== ""),
  );
}

/**
 * Reads a classic widget setting. In the Editor the element's attribute wins, so the preview matches
 * the panel the owner is using; on the live site the shared record wins.
 */
export function widgetReader(
  values: WidgetValues,
  designMode: boolean,
  attribute: (name: string) => string | null,
) {
  return (name: string): string | null => {
    const own = attribute(name);
    const shared = values[name] || null;
    return designMode ? (own ?? shared) : (shared ?? own);
  };
}

/** Harmony props with the shared record applied; Wix's auto panels can't write to it, so it wins. */
export function withWidgetValues<P extends object>(
  type: WidgetType,
  props: P,
  values: WidgetValues,
): P {
  const overlay: Record<string, unknown> = {};
  for (const key of keysByType[type]) {
    const value = values[key.key];
    if (!value) continue;
    overlay[key.prop] =
      key.kind === "number"
        ? Number(value)
        : key.kind === "boolean"
          ? value === "true"
          : value;
  }
  return { ...props, ...overlay };
}

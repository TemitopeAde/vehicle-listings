import type { Context } from "../context";
import { AppError } from "../errors";
import { getRow, saveRow } from "../repositories/repository";
import {
  applyWidgetPatch,
  widgetSettingsPatch,
  type WidgetType,
  type WidgetValues,
} from "../../shared/widget-settings";
import { audit } from "./audit-service";

const rowId = (type: WidgetType) => `widget-${type}`;

/** Public: every widget on the live site reads its shared settings. */
export async function getWidgetSettings(
  ctx: Context,
  type: WidgetType,
): Promise<WidgetValues> {
  const row = await getRow(ctx, "settings", rowId(type), !ctx.manager);
  const values = row?.values;
  return values && typeof values === "object"
    ? Object.fromEntries(
        Object.entries(values).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};
}

/** Changes only the keys in the patch; an empty value unsets a key. */
export async function updateWidgetSettings(
  ctx: Context,
  type: WidgetType,
  raw: unknown,
) {
  if (!ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Settings management permission is required.",
      403,
    );
  const patch = widgetSettingsPatch(type).parse(raw);
  const old = await getRow(ctx, "settings", rowId(type));
  const values = applyWidgetPatch(await getWidgetSettings(ctx, type), patch);
  await saveRow(
    ctx,
    "settings",
    { _id: rowId(type), title: `${type} widget`, values },
    !old,
  );
  await audit(ctx, "widget-settings", type, "update");
  return values;
}

/** Unsets the given keys, or all of them, so each widget shows its Editor values again. */
export async function resetWidgetSettings(
  ctx: Context,
  type: WidgetType,
  keys?: string[],
) {
  const current = await getWidgetSettings(ctx, type);
  return updateWidgetSettings(
    ctx,
    type,
    Object.fromEntries((keys ?? Object.keys(current)).map((key) => [key, ""])),
  );
}

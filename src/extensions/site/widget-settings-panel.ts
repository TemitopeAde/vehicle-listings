import { widget } from "@wix/editor";
import { api } from "../../shared/client";
import type { WidgetType, WidgetValues } from "../../shared/widget-settings";

/**
 * Panel values with the shared record applied. Changes made elsewhere, such as by Wix AI, are
 * written back to the widget so the Editor preview matches the live site.
 */
export async function withSharedSettings(
  type: WidgetType,
  settings: Record<string, string>,
): Promise<Record<string, string>> {
  const shared = await api<WidgetValues>(`widget-settings?widget=${type}`).catch(
    (error) => {
      console.error("Could not load shared widget settings", error);
      return {} as WidgetValues;
    },
  );
  const changed = Object.entries(shared).filter(
    ([key, value]) => key in settings && settings[key] !== value,
  );
  for (const [key, value] of changed) await widget.setProp(key, value);
  return { ...settings, ...Object.fromEntries(changed) };
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Saves one panel setting to the shared record; typing is batched into one request per pause. */
export function shareSetting(
  type: WidgetType,
  key: string,
  value: string,
  onError: () => void,
) {
  const id = `${type}:${key}`;
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      api("widget-settings", { widget: type, patch: { [key]: value } }, "PATCH").catch(
        (error) => {
          console.error("Could not save shared widget setting", error);
          onError();
        },
      );
    }, 400),
  );
}

export const shareError =
  "This change shows in the Editor but couldn't be saved for the live site and Wix AI. Please try again.";

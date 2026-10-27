import { useEffect, useState } from "react";
import { cacheTtl, cachedApi } from "../shared/client";
import type { WidgetType, WidgetValues } from "../shared/widget-settings";

/** The shared settings for a widget type; a failed read leaves the Editor values in charge. */
export function loadWidgetSettings(type: WidgetType): Promise<WidgetValues> {
  return cachedApi<WidgetValues>(
    `widget-settings?widget=${type}`,
    cacheTtl.settings,
  ).catch(() => ({}));
}

export function useWidgetSettings(type: WidgetType) {
  const [values, setValues] = useState<WidgetValues>({});
  useEffect(() => {
    let active = true;
    void loadWidgetSettings(type).then((loaded) => {
      if (active) setValues(loaded);
    });
    return () => {
      active = false;
    };
  }, [type]);
  return values;
}

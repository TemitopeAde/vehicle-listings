import { createContext, useContext, type CSSProperties } from "react";
import { readFont, type WidgetStyle } from "./widget-style";

export const ElementStyleContext = createContext<WidgetStyle>({});

/** Apply only explicit overrides, preserving shared styles and utility defaults. */
export function useElementStyle() {
  const settings = useContext(ElementStyleContext);
  return (key: string) => {
    const font = readFont(settings[`${key}-font`]);
    const color = settings[`${key}-color`];
    const style: CSSProperties = {
      ...(font
        ? { font: font.font, textDecoration: font.textDecoration || "none" }
        : {}),
      ...(color ? { color } : {}),
    };
    return { "data-sf-element": key, style };
  };
}

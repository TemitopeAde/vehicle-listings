import type { A11y, Direction } from "@wix/editor-react-types";
import type { WidgetAppearanceProps } from "../widget-props";
export type VehicleDetailsProps = WidgetAppearanceProps & {
  id: string;
  className?: string;
  direction?: Direction;
  a11y?: A11y;
  backLabel: string;
  /** @min 0 @max 32 */
  radius: number;
  elementProps?: {
    details?: { className?: string };
  };
};
export const defaultProps = {
  backLabel: "Back",
  radius: 12,
} satisfies Omit<VehicleDetailsProps, "id" | "className">;

import type { A11y, Direction } from "@wix/editor-react-types";
import type {
  WidgetAppearanceProps,
  InventoryFilterProps,
} from "../widget-props";
export type VehicleInventoryProps = WidgetAppearanceProps &
  InventoryFilterProps & {
    id: string;
    className?: string;
    direction?: Direction;
    a11y?: A11y;
    title: string;
    description: string;
    /** @min 1 @max 100 */
    itemLimit: number;
    featuredOnly: boolean;
    pagination: "pages" | "infinite";
    layout: "grid" | "list";
    /** @min 1 @max 4 */
    columns: number;
    /** @min 0 @max 32 */
    radius: number;
    elementProps?: {
      heading?: { className?: string };
      description?: { className?: string };
      inventory?: { className?: string };
    };
  };
export const defaultProps = {
  title: "Find your next chapter.",
  description:
    "Browse our collection, compare vehicles and contact the dealership.",
  itemLimit: 12,
  featuredOnly: false,
  pagination: "pages",
  layout: "grid",
  columns: 3,
  radius: 12,
} satisfies Omit<VehicleInventoryProps, "id" | "className">;

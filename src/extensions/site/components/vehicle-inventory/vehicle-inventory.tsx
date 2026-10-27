import classNames from "classnames";
import { useIsEditMode } from "@wix/react-component-utils";
import type { FC } from "react";
import { Marketplace } from "../../../../storefront/marketplace";
import { vehicleDetailsPath } from "../../../../shared/utils";
import type { VehicleInventoryProps } from "./vehicle-inventory.props";
import styles from "./vehicle-inventory.module.css";
import { withWidgetValues } from "../../../../shared/widget-settings";
import { useWidgetSettings } from "../../../../storefront/widget-settings-client";
import { widgetAppearance, inventoryFilterVisibility } from "../widget-props";
export const VehicleInventory: FC<VehicleInventoryProps> = (editorProps) => {
  // Shared settings from the panels and Wix AI override the Editor props.
  const props = withWidgetValues(
    "marketplace",
    editorProps,
    useWidgetSettings("marketplace"),
  );
  const {
    id,
    className,
    direction,
    title,
    description,
    itemLimit,
    featuredOnly,
    pagination,
    elementProps,
  } = props;
  const designMode = useIsEditMode();
  return (
    <section
      id={id}
      dir={direction}
      className={classNames(
        "vehicle-inventory",
        styles.root,
        styles.fallbackDirection,
        className,
      )}
    >
      <div
        {...elementProps?.inventory}
        className={classNames(
          "vehicle-inventory-inventory",
          styles.inventory,
          elementProps?.inventory?.className,
        )}
      >
        <Marketplace
          // The storefront draws the heading, like the classic widget; the Editor element
          // classes go on it so the heading and description stay selectable.
          title={title}
          description={description}
          headingClassName={classNames(
            "vehicle-inventory-heading",
            elementProps?.heading?.className,
          )}
          descriptionClassName={classNames(
            "vehicle-inventory-description",
            elementProps?.description?.className,
          )}
          limit={itemLimit}
          featuredOnly={featuredOnly}
          pagination={pagination === "infinite" ? "infinite" : "pages"}
          layout={props.layout}
          columns={props.columns}
          radius={props.radius}
          widgetStyle={widgetAppearance(props)}
          filterVisibility={inventoryFilterVisibility(props)}
          designMode={designMode}
          detailsPage={vehicleDetailsPath}
        />
      </div>
    </section>
  );
};
export default VehicleInventory;

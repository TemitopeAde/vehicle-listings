import classNames from "classnames";
import { useIsEditMode } from "@wix/react-component-utils";
import type { FC } from "react";
import { Marketplace } from "../../../../storefront/marketplace";
import { vehicleDetailsPath } from "../../../../shared/utils";
import type { VehicleInventoryProps } from "./vehicle-inventory.props";
import styles from "./vehicle-inventory.module.css";
import { widgetAppearance, inventoryFilterVisibility } from "../widget-props";
export const VehicleInventory: FC<VehicleInventoryProps> = (props) => {
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
      <h2
        {...elementProps?.heading}
        className={classNames(
          "vehicle-inventory-heading",
          styles.heading,
          elementProps?.heading?.className,
        )}
      >
        {title}
      </h2>
      <p
        {...elementProps?.description}
        className={classNames(
          "vehicle-inventory-description",
          styles.description,
          elementProps?.description?.className,
        )}
      >
        {description}
      </p>
      <div
        {...elementProps?.inventory}
        className={classNames(
          "vehicle-inventory-inventory",
          styles.inventory,
          elementProps?.inventory?.className,
        )}
      >
        <Marketplace
          title="Available vehicles"
          description=""
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

import classNames from "classnames";
import { useCurrentUrl, useIsEditMode } from "@wix/react-component-utils";
import type { FC } from "react";
import { VehicleDetailsPage } from "../../../../storefront/vehicle-details-page";
import type { VehicleDetailsProps } from "./vehicle-details.props";
import styles from "./vehicle-details.module.css";
import { widgetAppearance } from "../widget-props";
export const VehicleDetails: FC<VehicleDetailsProps> = (props) => {
  const { id, className, direction, backLabel, elementProps } = props;
  const designMode = useIsEditMode();
  const currentUrl = useCurrentUrl();
  const slug =
    new URL(currentUrl, "https://wix.invalid").searchParams.get("slug") ?? "";
  return (
    <section
      id={id}
      dir={direction}
      className={classNames(
        "vehicle-details",
        styles.root,
        styles.fallbackDirection,
        className,
      )}
    >
      <div
        {...elementProps?.details}
        className={classNames(
          "vehicle-details-details",
          styles.details,
          elementProps?.details?.className,
        )}
      >
        <VehicleDetailsPage
          slug={slug}
          backLabel={backLabel}
          designMode={designMode}
          radius={props.radius}
          widgetStyle={widgetAppearance(props)}
        />
      </div>
    </section>
  );
};
export default VehicleDetails;

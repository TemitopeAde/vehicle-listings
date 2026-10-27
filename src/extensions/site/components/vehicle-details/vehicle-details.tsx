import classNames from "classnames";
import { useCurrentUrl, useIsEditMode } from "@wix/react-component-utils";
import type { FC } from "react";
import { VehicleDetailsPage } from "../../../../storefront/vehicle-details-page";
import type { VehicleDetailsProps } from "./vehicle-details.props";
import styles from "./vehicle-details.module.css";
import { withWidgetValues } from "../../../../shared/widget-settings";
import { useWidgetSettings } from "../../../../storefront/widget-settings-client";
import { widgetAppearance } from "../widget-props";
export const VehicleDetails: FC<VehicleDetailsProps> = (editorProps) => {
  // Shared settings from the panels and Wix AI override the Editor props.
  const props = withWidgetValues(
    "details",
    editorProps,
    useWidgetSettings("details"),
  );
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

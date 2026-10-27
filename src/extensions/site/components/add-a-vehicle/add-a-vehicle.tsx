import classNames from "classnames";
import type { FC } from "react";
import SellPage from "../../../../dealers/sell-page";
import type { AddAVehicleProps } from "./add-a-vehicle.props";
import styles from "./add-a-vehicle.module.css";
import { withWidgetValues } from "../../../../shared/widget-settings";
import { useWidgetSettings } from "../../../../storefront/widget-settings-client";

const AddAVehicle: FC<AddAVehicleProps> = (editorProps) => {
  // Shared settings from the panels and Wix AI override the Editor props.
  const {
    id,
    className,
    direction,
    title,
    elementProps,
  } = withWidgetValues(
    "add-vehicle",
    editorProps,
    useWidgetSettings("add-vehicle"),
  );
  return (
    <section
      id={id}
      dir={direction}
      className={classNames(
        "add-a-vehicle",
        styles.root,
        styles.fallbackDirection,
        className,
      )}
    >
      <div
        {...elementProps?.form}
        className={classNames(
          "add-a-vehicle-form",
          styles.form,
          elementProps?.form?.className,
        )}
      >
        <SellPage title={title} />
      </div>
    </section>
  );
};

export default AddAVehicle;

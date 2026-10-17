import classNames from "classnames";
import type { FC } from "react";
import SellPage from "../../../../dealers/sell-page";
import type { AddAVehicleProps } from "./add-a-vehicle.props";
import styles from "./add-a-vehicle.module.css";

const AddAVehicle: FC<AddAVehicleProps> = ({
  id,
  className,
  direction,
  title,
  elementProps,
}) => {
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

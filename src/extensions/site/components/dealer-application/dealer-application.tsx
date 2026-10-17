import classNames from "classnames";
import type { FC } from "react";
import ApplyPage from "../../../../dealers/apply-page";
import type { DealerApplicationProps } from "./dealer-application.props";
import styles from "./dealer-application.module.css";

const DealerApplication: FC<DealerApplicationProps> = ({
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
        "dealer-application",
        styles.root,
        styles.fallbackDirection,
        className,
      )}
    >
      <div
        {...elementProps?.form}
        className={classNames(
          "dealer-application-form",
          styles.form,
          elementProps?.form?.className,
        )}
      >
        <ApplyPage title={title} />
      </div>
    </section>
  );
};

export default DealerApplication;

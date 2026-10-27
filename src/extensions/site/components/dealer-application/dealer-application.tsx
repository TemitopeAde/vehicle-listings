import classNames from "classnames";
import type { FC } from "react";
import ApplyPage from "../../../../dealers/apply-page";
import type { DealerApplicationProps } from "./dealer-application.props";
import styles from "./dealer-application.module.css";
import { withWidgetValues } from "../../../../shared/widget-settings";
import { useWidgetSettings } from "../../../../storefront/widget-settings-client";

const DealerApplication: FC<DealerApplicationProps> = (editorProps) => {
  // Shared settings from the panels and Wix AI override the Editor props.
  const {
    id,
    className,
    direction,
    title,
    elementProps,
  } = withWidgetValues(
    "dealer-application",
    editorProps,
    useWidgetSettings("dealer-application"),
  );
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

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { window as wixWindow } from "@wix/site-window";
import { widgetReader, type WidgetValues } from "../../../../shared/widget-settings";
import { loadWidgetSettings } from "../../../../storefront/widget-settings-client";
import ApplyPage from "../../../../dealers/apply-page";
import styles from "./dealer-application.module.css";

class DealerApplication extends HTMLElement {
  private root: Root | null = null;
  private designMode = true;
  private shared: WidgetValues = {};
  static get observedAttributes() {
    return ["display-name"];
  }
  async connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    this.root = createRoot(this);
    this.render();
    try {
      this.designMode = (await wixWindow.viewMode()) === "Editor";
    } catch {
      this.designMode = true;
    }
    this.shared = await loadWidgetSettings("dealer-application");
    this.render();
  }
  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const read = widgetReader(this.shared, this.designMode, (name) =>
      this.getAttribute(name),
    );
    this.root?.render(
      <div className={styles.root}>
        <ApplyPage
          title={
            read("display-name") || "Apply to sell vehicles"
          }
        />
      </div>,
    );
  }
}

export default DealerApplication;

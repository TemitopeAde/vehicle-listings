import React from "react";
import { createRoot, type Root } from "react-dom/client";
import ApplyPage from "../../../../dealers/apply-page";
import styles from "./dealer-application.module.css";

class DealerApplication extends HTMLElement {
  private root: Root | null = null;
  static get observedAttributes() {
    return ["display-name"];
  }
  connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    this.root = createRoot(this);
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
    this.root?.render(
      <div className={styles.root}>
        <ApplyPage
          title={
            this.getAttribute("display-name") || "Apply to sell vehicles"
          }
        />
      </div>,
    );
  }
}

export default DealerApplication;

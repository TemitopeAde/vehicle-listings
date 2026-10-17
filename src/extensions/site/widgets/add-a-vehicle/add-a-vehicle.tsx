import React from "react";
import { createRoot, type Root } from "react-dom/client";
import SellPage from "../../../../dealers/sell-page";
import styles from "./add-a-vehicle.module.css";

class AddAVehicle extends HTMLElement {
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
        <SellPage
          title={this.getAttribute("display-name") || "Add a vehicle for sale"}
        />
      </div>,
    );
  }
}

export default AddAVehicle;

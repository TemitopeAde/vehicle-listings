import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { window as wixWindow } from "@wix/site-window";
import { Marketplace } from "../../../../storefront/marketplace";
import { styleKeys } from "../../../../storefront/widget-style";
import {
  filterVisibilityKeys,
  readFilterVisibility,
} from "../../../../storefront/filter-visibility";
import { vehicleDetailsPath } from "../../../../shared/utils";
class VehicleMarketplace extends HTMLElement {
  private root: Root | null = null;
  private designMode = true;
  static get observedAttributes() {
    return [
      "display-name",
      "description",
      ...styleKeys,
      ...filterVisibilityKeys,
      "accent",
      "columns",
      "radius",
      "layout",
      "item-limit",
      "featured-only",
      "pagination",
    ];
  }
  async connectedCallback() {
    this.root = createRoot(this);
    try {
      this.designMode = (await wixWindow.viewMode()) === "Editor";
    } catch {
      this.designMode = true;
    }
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
    const number = (name: string, fallback: number, min: number, max: number) =>
      Math.max(
        min,
        Math.min(
          max,
          this.getAttribute(name) === null ||
            this.getAttribute(name) === "" ||
            !Number.isFinite(Number(this.getAttribute(name)))
            ? fallback
            : Number(this.getAttribute(name)),
        ),
      );
    const accent = this.getAttribute("accent") ?? "";
    this.root?.render(
      <Marketplace
        title={this.getAttribute("display-name") || "Find your next chapter."}
        description={this.getAttribute("description") ?? undefined}
        widgetStyle={Object.fromEntries(
          styleKeys.map((key) => [key, this.getAttribute(key) ?? ""]),
        )}
        designMode={this.designMode}
        filterVisibility={readFilterVisibility((key) => this.getAttribute(key))}
        accent={/^#[a-f\d]{6}$/i.test(accent) ? accent : undefined}
        columns={number("columns", 3, 1, 4)}
        radius={number("radius", 12, 0, 32)}
        limit={number("item-limit", 12, 1, 100)}
        layout={this.getAttribute("layout") === "list" ? "list" : "grid"}
        featuredOnly={this.getAttribute("featured-only") === "true"}
        pagination={
          this.getAttribute("pagination") === "infinite" ? "infinite" : "pages"
        }
        detailsPage={vehicleDetailsPath}
      />,
    );
  }
}
export default VehicleMarketplace;

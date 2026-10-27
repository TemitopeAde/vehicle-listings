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
import { widgetReader, type WidgetValues } from "../../../../shared/widget-settings";
import { loadWidgetSettings } from "../../../../storefront/widget-settings-client";
class VehicleMarketplace extends HTMLElement {
  private root: Root | null = null;
  private designMode = true;
  private shared: WidgetValues = {};
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
    this.shared = await loadWidgetSettings("marketplace");
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
    const number = (name: string, fallback: number, min: number, max: number) =>
      Math.max(
        min,
        Math.min(
          max,
          read(name) === null ||
            read(name) === "" ||
            !Number.isFinite(Number(read(name)))
            ? fallback
            : Number(read(name)),
        ),
      );
    const accent = read("accent") ?? "";
    this.root?.render(
      <Marketplace
        title={read("display-name") || "Find your next chapter."}
        description={read("description") ?? undefined}
        widgetStyle={Object.fromEntries(
          styleKeys.map((key) => [key, read(key) ?? ""]),
        )}
        designMode={this.designMode}
        filterVisibility={readFilterVisibility(read)}
        accent={/^#[a-f\d]{6}$/i.test(accent) ? accent : undefined}
        columns={number("columns", 3, 1, 4)}
        radius={number("radius", 12, 0, 32)}
        limit={number("item-limit", 12, 1, 100)}
        layout={read("layout") === "list" ? "list" : "grid"}
        featuredOnly={read("featured-only") === "true"}
        pagination={
          read("pagination") === "infinite" ? "infinite" : "pages"
        }
        detailsPage={vehicleDetailsPath}
      />,
    );
  }
}
export default VehicleMarketplace;

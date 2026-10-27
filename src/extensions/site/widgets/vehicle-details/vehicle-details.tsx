import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { window as wixWindow } from "@wix/site-window";
import { VehicleDetailsPage } from "../../../../storefront/vehicle-details-page";
import { styleKeys } from "../../../../storefront/widget-style";
import { widgetReader, type WidgetValues } from "../../../../shared/widget-settings";
import { loadWidgetSettings } from "../../../../storefront/widget-settings-client";
class VehicleDetails extends HTMLElement {
  private root: Root | null = null;
  private designMode = true;
  private shared: WidgetValues = {};
  private slug: string | null = null;
  private onNavigate = () => this.render();
  static get observedAttributes() {
    return [...styleKeys, "radius"];
  }
  async connectedCallback() {
    this.root = createRoot(this);
    window.addEventListener("popstate", this.onNavigate);
    try {
      this.designMode = (await wixWindow.viewMode()) === "Editor";
    } catch {
      this.designMode = true;
    }
    try {
      const { location } = await import("@wix/site-location");
      const query = (await location.query()) as { slug?: unknown };
      this.slug = typeof query.slug === "string" ? query.slug : "";
    } catch {
      this.slug = new URLSearchParams(window.location.search).get("slug") ?? "";
    }
    this.render();
    this.shared = await loadWidgetSettings("details");
    this.render();
  }
  disconnectedCallback() {
    window.removeEventListener("popstate", this.onNavigate);
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
    const accent = read("accent") ?? "";
    const radius = Number(read("radius") || NaN);
    this.root?.render(
      <VehicleDetailsPage
        slug={this.slug}
        designMode={this.designMode}
        accent={/^#[a-f\d]{6}$/i.test(accent) ? accent : undefined}
        radius={
          Number.isFinite(radius)
            ? Math.max(0, Math.min(32, radius))
            : undefined
        }
        widgetStyle={Object.fromEntries(
          styleKeys.map((key) => [key, read(key) ?? ""]),
        )}
      />,
    );
  }
}
export default VehicleDetails;

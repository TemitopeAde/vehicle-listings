import { money } from "../../../../shared/utils";
import {
  onSavedCarsChange,
  readSavedCars,
  removeSavedCar,
  clearSavedCars,
  refreshSavedCars,
  savedCarsState,
  watchSavedCars,
  type SavedCar,
} from "../../../../shared/saved-cars";
import { styles } from "./saved-cars.styles";

const config = document.getElementById("autohaus-saved-cars-config");
if (!config) throw new Error("Saved cars config element not found");
const { label, accent } = config.dataset;

const svg = (path: string, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const heart = svg(
  '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor"/>',
);
const close = svg('<path d="M18 6 6 18M6 6l12 12"/>', 16);

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function initSavedCars() {
  const host = document.createElement("div");
  host.id = "autohaus-saved-cars";
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;
  const wrap = el("div", "wrap");
  wrap.style.setProperty(
    "--accent",
    accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#196947",
  );
  const heading = label?.trim() || "Saved cars";

  const panel = el("section", "panel");
  panel.id = "autohaus-saved-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", heading);
  const head = el("div", "head");
  const titles = el("div", "");
  const title = el("h2", "title", heading);
  const sub = el("p", "sub");
  titles.append(title, sub);
  const closeBtn = el("button", "icon-btn");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close saved cars");
  closeBtn.innerHTML = close;
  head.append(titles, closeBtn);
  const list = el("ul", "list");
  const foot = el("div", "foot");
  const clear = el("button", "clear", "Clear all");
  clear.type = "button";
  const retry = el("button", "clear", "Try again");
  retry.type = "button";
  foot.append(clear, retry);
  panel.append(head, list, foot);

  const launcher = el("button", "launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-controls", panel.id);
  launcher.setAttribute("aria-expanded", "false");
  const launcherText = el("span", "", heading);
  const count = el("span", "count");
  launcher.innerHTML = heart;
  launcher.append(launcherText, count);

  wrap.append(panel, launcher);
  root.append(style, wrap);
  document.body.append(host);

  function setOpen(open: boolean) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
  }

  function renderItem(car: SavedCar) {
    const item = el("li", "item");
    const link = el("a", "link");
    link.href = car.href;
    const thumb = el("img", "thumb");
    thumb.alt = "";
    thumb.loading = "lazy";
    if (car.image) thumb.src = car.image;
    const text = el("div", "");
    text.style.minWidth = "0";
    text.append(
      el("p", "name", car.title),
      el("p", "price", money(car.price, car.currency)),
    );
    link.append(thumb, text);
    link.addEventListener("click", () => setOpen(false));
    const remove = el("button", "icon-btn");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${car.title} from saved cars`);
    remove.innerHTML = close;
    remove.disabled = savedCarsState().loading;
    remove.addEventListener("click", () => {
      void removeSavedCar(car.id).catch((error) =>
        console.error("Could not remove account saved car", error),
      );
    });
    item.append(link, remove);
    return item;
  }

  function render() {
    const cars = readSavedCars();
    const state = savedCarsState();
    wrap.hidden = !state.memberId && !state.error;
    if (wrap.hidden) setOpen(false);
    count.textContent = String(cars.length);
    launcher.setAttribute(
      "aria-label",
      `${heading}: ${cars.length} ${cars.length === 1 ? "car" : "cars"}`,
    );
    sub.textContent = state.loading
      ? "Syncing your saved cars…"
      : state.error ||
        `${cars.length} ${cars.length === 1 ? "car" : "cars"} saved to your account`;
    sub.setAttribute("role", state.error ? "alert" : "status");
    retry.hidden = !state.error;
    clear.disabled = state.loading || !cars.length;
    list.replaceChildren(...cars.map(renderItem));
  }

  launcher.addEventListener("click", () => {
    setOpen(panel.hidden === true);
    if (!panel.hidden)
      void refreshSavedCars().catch((error) =>
        console.error("Could not refresh account saved cars", error),
      );
  });
  closeBtn.addEventListener("click", () => {
    setOpen(false);
    launcher.focus();
  });
  clear.addEventListener("click", () => {
    void clearSavedCars().catch((error) =>
      console.error("Could not clear account saved cars", error),
    );
  });
  retry.addEventListener("click", () => {
    void refreshSavedCars().catch((error) =>
      console.error("Could not refresh account saved cars", error),
    );
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      setOpen(false);
      launcher.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !e.composedPath().includes(host)) setOpen(false);
  });
  onSavedCarsChange(render);
  render();
  watchSavedCars();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSavedCars);
} else {
  initSavedCars();
}

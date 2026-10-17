import {
  createAccountSavedCars,
  type AccountSavedCars,
} from "./account-saved-cars";
import { wixSavedCars } from "./wix-saved-cars";
import type { SavedCar } from "./saved-cars-model";
export type { SavedCar } from "./saved-cars-model";

declare global {
  interface Window {
    autohausAccountSavedCars?: AccountSavedCars;
  }
}
function store() {
  return (window.autohausAccountSavedCars ??=
    createAccountSavedCars(wixSavedCars));
}
export function readSavedCars() {
  return typeof window === "undefined" ? [] : store().state().cars;
}
export function savedCarsState() {
  return store().state();
}
export function refreshSavedCars() {
  return store().refresh();
}
export function toggleSavedCar(getCar: () => Promise<SavedCar>) {
  return store().toggle(getCar);
}
export function removeSavedCar(id: string) {
  return store().remove(id);
}
export function clearSavedCars() {
  return store().clear();
}
export function onSavedCarsChange(listener: () => void) {
  return store().subscribe(listener);
}

/** Refresh on return to the site and while visible, so account changes and other devices sync. */
export function watchSavedCars() {
  let active = true;
  const unsubscribe: Array<() => void> = [];
  const refresh = () => {
    if (document.visibilityState !== "hidden")
      void refreshSavedCars().catch((error) =>
        console.error("Could not load account saved cars", error),
      );
  };
  refresh();
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  const timer = window.setInterval(refresh, 30000);
  if (import.meta.env.PUBLIC_CAR_LISTING_DEMO !== "1") {
    void import("@wix/site")
      .then(({ authentication }) => {
        if (!active) return;
        unsubscribe.push(authentication.onLogin(refresh));
        unsubscribe.push(authentication.onLogout(() => store().reset()));
      })
      .catch((error) =>
        console.error("Could not listen for member session changes", error),
      );
  }
  return () => {
    active = false;
    for (const stop of unsubscribe) stop();
    window.clearInterval(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

import { useState } from "react";
import { api } from "../shared/client";
import type { Vehicle } from "../shared/schemas";
import { Button } from "./ui/button";
import { Alert } from "./ui/card";
import { cn } from "./ui/utils";

/** Mirrors the server rule, so the button only appears where checkout would accept it. */
export const purchasable = (v: Vehicle) =>
  v.status === "published" && !v.demo && v.price > 0;

async function siteCart() {
  return (await import("@wix/site-ecom")).ecom;
}

async function showCart() {
  const cart = await siteCart();
  // Pages without the side cart still have the cart page.
  await cart.openSideCart().catch(() => cart.navigateToCartPage());
}

export function AddToCart({
  vehicle,
  preview = false,
  className,
}: {
  vehicle: Vehicle;
  /** Editor preview: show the button without touching the visitor's cart. */
  preview?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "adding" | "added">("idle"),
    [error, setError] = useState("");
  // The editor shows draft sample vehicles; keep the button visible there so it can be placed.
  if (!preview && !purchasable(vehicle)) return null;
  async function add() {
    setState("adding");
    setError("");
    try {
      await api("cart", { vehicleId: vehicle._id });
      setState("added");
      const cart = await siteCart();
      await cart.refreshCart();
      await showCart();
    } catch (e) {
      // A failure after the add (refreshing the cart UI) still leaves the vehicle in the cart.
      setState((s) => (s === "added" ? s : "idle"));
      setError(e instanceof Error ? e.message : "Could not add to cart.");
    }
  }
  return (
    <div className={cn("grid gap-2", className)}>
      {state === "added" ? (
        <Button variant="outline" onClick={() => void showCart().catch(() => {})}>
          In your cart · View cart
        </Button>
      ) : (
        <Button
          onClick={() => void add()}
          disabled={preview || state === "adding"}
          pending={state === "adding"}
        >
          Add to cart
        </Button>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      )}
    </div>
  );
}

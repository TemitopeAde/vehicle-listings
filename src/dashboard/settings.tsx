import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, CarFront } from "lucide-react";
import { api } from "./api";
import { defaultTheme, type Theme } from "../shared/schemas";
import { currencyOptions } from "../shared/currencies";
import { useResource } from "./hooks";
import { SavedCarsSettings } from "./saved-cars-settings";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
export function Settings() {
  const resource = useResource<Theme>("settings");
  const [theme, setTheme] = useState(defaultTheme),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (resource.data) setTheme(resource.data);
  }, [resource.data]);
  async function demos(action: string) {
    setBusy(true);
    try {
      await api("onboarding", { action });
      toast.success(
        action === "seed"
          ? "Sample inventory added as private drafts"
          : "Demo vehicles removed from active inventory",
      );
      setConfirm(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <h2 className="section-heading">Showroom settings</h2>
        <p className="hint mt-1 mb-5">Default showroom currency.</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="default-currency">
              Default currency
            </label>
            <select
              id="default-currency"
              className="field"
              value={theme.currency}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  currency: e.target.value as Theme["currency"],
                })
              }
            >
              {currencyOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          className="mt-5"
          disabled={saving}
          pending={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await api("settings", theme, "PATCH");
              toast.success("Settings saved");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          Save settings
        </Button>
      </section>
      <section className="surface p-6">
        <h3 className="section-heading">Install your storefront</h3>
        <p className="hint mt-2 mb-5">
          Complete these steps on your development site before publishing.
        </p>
        {[
          "Add the Vehicle Marketplace widget in Wix Studio/classic, or Vehicle Inventory in Harmony.",
          "Set the title, layout and colors using the widget’s editing controls.",
          "For per-car SEO URLs, configure a supported CMS dynamic page strategy and verify public metadata. The app server’s /cars routes do not automatically become your site’s routes.",
          "Publish a real vehicle and test its detail view, seller contacts and inquiry form on mobile.",
        ].map((s, i) => (
          <div key={s} className="flex gap-3 text-sm py-3 border-t">
            <span className="text-primary font-semibold">{i + 1}.</span>
            <p>{s}</p>
          </div>
        ))}
      </section>
      <SavedCarsSettings />
      <section className="surface p-6">
        <h3 className="section-heading">Demo inventory</h3>
        <p className="hint mt-2">
          Sample listings are clearly labeled and cannot be published. You can
          remove them in one action.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button
            variant="outline"
            disabled={busy}
            pending={busy && !confirm}
            onClick={() => void demos("seed")}
          >
            <CarFront size={16} />
            Add sample inventory
          </Button>
          <Button variant="outline" onClick={() => setConfirm(true)}>
            <Trash2 size={16} />
            Remove demo listings
          </Button>
        </div>
      </section>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle className="section-heading">
            Remove demo inventory?
          </DialogTitle>
          <DialogDescription className="hint my-4">
            The sample vehicle records will be marked deleted. Your own listings
            are preserved.
          </DialogDescription>
          <Button
            disabled={busy}
            pending={busy}
            variant="destructive"
            onClick={() => void demos("clear")}
          >
            Remove demos
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function Billing() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-heading">Room to grow</h2>
        <p className="hint mt-1">
          Your current installation uses the Free plan. Paid billing is awaiting
          Wix entitlement integration.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            name: "Free",
            price: "$0",
            count: "10 vehicles",
            features: [
              "1 dealer workflow",
              "Inventory & inquiry management",
              "Site marketplace widget",
            ],
            current: true,
          },
          {
            name: "Pro",
            price: "Proposed $9.99 / month",
            count: "100 vehicles",
            features: [
              "Advanced inventory",
              "Import & export",
              "Expanded analytics",
            ],
            current: false,
          },
          {
            name: "Business",
            price: "Proposed $19.99 / month",
            count: "Higher inventory quota",
            features: [
              "Multiple dealerships",
              "Seller self-service",
              "AI writing allowance",
            ],
            current: false,
          },
        ].map((p) => (
          <section key={p.name} className="surface p-7">
            <span className="text-xs uppercase tracking-widest text-primary">
              {p.current ? "Your plan" : "Planned"}
            </span>
            <h3 className="text-2xl font-semibold mt-4">{p.name}</h3>
            <p className="font-semibold mt-3">{p.price}</p>
            <p className="hint mt-1">{p.count}</p>
            <ul className="space-y-4 mt-7">
              {p.features.map((f) => (
                <li key={f} className="flex gap-3 text-sm">
                  <Check size={16} className="text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="hint text-xs mt-7">
              {p.current
                ? "Active · no payment required"
                : "Pricing hypothesis. Not available for purchase yet."}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

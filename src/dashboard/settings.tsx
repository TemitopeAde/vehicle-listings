import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, CarFront } from "lucide-react";
import { api } from "./api";
import { defaultTheme, type Theme } from "../shared/schemas";
import {
  plans,
  planKeys,
  type PlanDefinition,
  type PlanKey,
} from "../shared/plans";
import { currencyOptions } from "../shared/currencies";
import { useI18n } from "../shared/i18n-react";
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
  const { t, language } = useI18n();
  const resource = useResource<Theme>("settings");
  const [theme, setTheme] = useState(defaultTheme),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!resource.data) return;
    setTheme({ ...defaultTheme, ...resource.data });
  }, [resource.data]);
  async function demos(action: string) {
    setBusy(true);
    try {
      await api("onboarding", { action });
      toast.success(
        action === "seed"
          ? t("Sample inventory added as private drafts")
          : t("Demo vehicles removed from active inventory"),
      );
      setConfirm(false);
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <h2 className="section-heading">{t("Showroom settings")}</h2>
        <p className="hint mt-1 mb-5">
          {t("Default currency for new listings.")}
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="default-currency">
              {t("Default currency")}
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
                  {t(label)}
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
              const saved = await api<Theme>(
                "settings",
                { ...theme, language },
                "PATCH",
              );
              setTheme({ ...defaultTheme, ...saved });
              toast.success(t("Settings saved"));
            } catch (e) {
              toast.error(t((e as Error).message));
            } finally {
              setSaving(false);
            }
          }}
        >
          {t("Save settings")}
        </Button>
      </section>
      <section className="surface p-6">
        <h3 className="section-heading">{t("Install your storefront")}</h3>
        <p className="hint mt-2 mb-5">
          {t("Complete these steps on your development site before publishing.")}
        </p>
        {[
          "Add the Vehicle Marketplace widget in Wix Studio/classic, or Vehicle Inventory in Harmony.",
          "Set the title, layout and colors using the widget’s editing controls.",
          "For per-car SEO URLs, configure a supported CMS dynamic page strategy and verify public metadata. The app server’s /cars routes do not automatically become your site’s routes.",
          "Publish a real vehicle and test its detail view, seller contacts and inquiry form on mobile.",
        ].map((s, i) => (
          <div key={s} className="flex gap-3 text-sm py-3 border-t">
            <span className="text-primary font-semibold">{i + 1}.</span>
            <p>{t(s)}</p>
          </div>
        ))}
      </section>
      <SavedCarsSettings />
      <section className="surface p-6">
        <h3 className="section-heading">{t("Demo inventory")}</h3>
        <p className="hint mt-2">
          {t(
            "Sample listings are clearly labeled and cannot be published. You can remove them in one action.",
          )}
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button
            variant="outline"
            disabled={busy}
            pending={busy && !confirm}
            onClick={() => void demos("seed")}
          >
            <CarFront size={16} />
            {t("Add sample inventory")}
          </Button>
          <Button variant="outline" onClick={() => setConfirm(true)}>
            <Trash2 size={16} />
            {t("Remove demo listings")}
          </Button>
        </div>
      </section>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle className="section-heading">
            {t("Remove demo inventory?")}
          </DialogTitle>
          <DialogDescription className="hint my-4">
            {t(
              "The sample vehicle records will be marked deleted. Your own listings are preserved.",
            )}
          </DialogDescription>
          <Button
            disabled={busy}
            pending={busy}
            variant="destructive"
            onClick={() => void demos("clear")}
          >
            {t("Remove demos")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
type PlansResponse = {
  current: PlanKey;
  plans: Array<PlanDefinition & { key: PlanKey }>;
};
export function Billing() {
  const { t } = useI18n();
  const [data, setData] = useState<PlansResponse | null>(null),
    [starting, setStarting] = useState<PlanKey | null>(null);
  useEffect(() => {
    api<PlansResponse>("plans")
      .then(setData)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      );
  }, []);
  async function startTrial(plan: PlanKey) {
    setStarting(plan);
    try {
      const { checkoutUrl } = await api<{ checkoutUrl: string }>(
        "plans",
        { plan },
        "POST",
      );
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setStarting(null);
    }
  }
  const current = data?.current ?? "basic";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-heading">{t("Room to grow")}</h2>
        <p className="hint mt-1">
          {t("Your current installation uses the {plan} plan.", {
            plan: t(plans[current].name),
          })}
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {planKeys.map((key) => {
          const p = plans[key],
            isCurrent = key === current;
          return (
            <section key={key} className="surface p-7">
              <span className="text-xs uppercase tracking-widest text-primary">
                {isCurrent ? t("Your plan") : t("Planned")}
              </span>
              <h3 className="text-2xl font-semibold mt-4">{t(p.name)}</h3>
              <p className="font-semibold mt-3">{t(p.price)}</p>
              <p className="hint mt-1">
                {p.vehicleLimit === null
                  ? t("Unlimited vehicles")
                  : t("{count} vehicles", { count: p.vehicleLimit })}
              </p>
              <ul className="space-y-4 mt-7">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm">
                    <Check size={16} className="text-primary" />
                    {t(f)}
                  </li>
                ))}
              </ul>
              {key !== "basic" && !isCurrent && (
                <Button
                  className="w-full mt-7"
                  disabled={starting !== null || !data}
                  pending={starting === key}
                  onClick={() => void startTrial(key)}
                >
                  {t("Start trial")}
                </Button>
              )}
              <p className="hint text-xs mt-7">
                {isCurrent
                  ? t("Active · no payment required")
                  : t("Trial opens Wix checkout. You are charged when it ends.")}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

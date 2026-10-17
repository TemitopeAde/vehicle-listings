import { useEffect, useState } from "react";
import { Checkbox } from "./components/ui/checkbox";
import { toast } from "sonner";
import { embeddedScripts } from "@wix/app-management";
import { Button } from "./components/ui/button";
// Extension ID from src/extensions/site/embedded-scripts/saved-cars/saved-cars.extension.ts
const componentId = "a98020c4-3999-4b6d-96f1-01fa817d4011";
type Form = { enabled: boolean; label: string; accent: string };
const defaults: Form = {
  enabled: true,
  label: "Saved cars",
  accent: "#196947",
};
export type Scripts = {
  getEmbeddedScript: (options: {
    componentId: string;
  }) => Promise<{ disabled?: boolean; parameters?: Record<string, string> }>;
  embedScript: (
    properties: { disabled: boolean; parameters: Record<string, string> },
    options: { componentId: string },
  ) => Promise<unknown>;
};
export function SavedCarsSettings({
  scripts = embeddedScripts,
}: {
  scripts?: Scripts;
}) {
  const [form, setForm] = useState(defaults),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<"embed" | "settings" | null>(null),
    [embedded, setEmbedded] = useState(false),
    [installedEnabled, setInstalledEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => scripts.getEmbeddedScript({ componentId }))
      .then((script) => {
        if (!active) return;
        setEmbedded(true);
        setInstalledEnabled(!script.disabled);
        setForm({
          enabled: !script.disabled,
          label: script.parameters?.label || defaults.label,
          accent: script.parameters?.accent || defaults.accent,
        });
      })
      // Not embedded on this site yet: keep the defaults.
      .catch((e) => console.error("Could not load saved cars button", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scripts]);
  async function save(embed = false) {
    if (!/^#[0-9a-f]{6}$/i.test(form.accent))
      return toast.error("Use a 6-digit hex color, for example #196947.");
    setBusy(true);
    setPending(embed ? "embed" : "settings");
    try {
      const enabled = embed || form.enabled;
      await scripts.embedScript(
        {
          disabled: !enabled,
          parameters: {
            label: form.label.trim() || defaults.label,
            accent: form.accent,
          },
        },
        { componentId },
      );
      setEmbedded(true);
      setInstalledEnabled(enabled);
      setForm((current) => ({ ...current, enabled }));
      toast.success(
        embed
          ? "Saved cars script embedded"
          : enabled
            ? "Saved cars button is live"
            : "Saved cars button hidden",
      );
    } catch (e) {
      console.error(e);
      toast.error("Could not update the saved cars button.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }
  return (
    <section className="surface p-6">
      <h3 className="section-heading">Saved cars button</h3>
      <p className="hint mt-2 mb-5">
        A floating button in the bottom-left corner of every site page. It lists
        the signed-in member’s saved cars, which they can access on any device.
      </p>
      <p role="status" className="hint mb-5">
        {loading
          ? "Checking script installation…"
          : embedded
            ? installedEnabled
              ? "Script embedded and enabled on your site."
              : "Script embedded and disabled on your site."
            : "Click Embed script to install or refresh the saved cars script on your site."}
      </p>
      <label className="flex items-center gap-2 text-sm mb-5">
        <Checkbox
          checked={form.enabled}
          disabled={loading || busy}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
        />
        Show the saved cars button on my site
      </label>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="saved-label">
            Button label
          </label>
          <input
            id="saved-label"
            className="field"
            maxLength={30}
            value={form.label}
            disabled={loading || busy}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="saved-accent">
            Accent color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Pick accent color"
              className="h-10 w-12 rounded-md border bg-white p-1"
              value={
                /^#[0-9a-f]{6}$/i.test(form.accent)
                  ? form.accent
                  : defaults.accent
              }
              disabled={loading || busy}
              onChange={(e) => setForm({ ...form, accent: e.target.value })}
            />
            <input
              id="saved-accent"
              className="field"
              value={form.accent}
              disabled={loading || busy}
              onChange={(e) => setForm({ ...form, accent: e.target.value })}
            />
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          disabled={loading || busy}
          pending={pending === "embed"}
          onClick={() => void save(true)}
        >
          {embedded ? "Re-embed script" : "Embed script"}
        </Button>
        {embedded && (
          <Button
            variant="outline"
            disabled={loading || busy}
            pending={pending === "settings"}
            onClick={() => void save()}
          >
            Save button settings
          </Button>
        )}
      </div>
    </section>
  );
}

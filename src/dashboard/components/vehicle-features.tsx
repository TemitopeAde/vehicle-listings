import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../../shared/i18n-react";
import type { VehicleForm } from "./vehicle-form-types";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

const STANDARD_FEATURES = [
  "Leather seats",
  "Rear-view camera",
  "Bluetooth",
  "Cruise control",
  "Sunroof",
  "Navigation",
  "Parking sensors",
  "Heated seats",
  "Apple CarPlay",
  "Android Auto",
  "Keyless entry",
  "Alloy wheels",
  "ABS",
  "Airbags",
] as const;

function sameFeature(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export function VehicleFeatures({ form }: { form: VehicleForm }) {
  const { t } = useI18n();
  const { watch, setValue, getValues } = form;
  const features = watch("features") ?? [];
  const [draft, setDraft] = useState("");
  const custom = features.filter(
    (feature) => !STANDARD_FEATURES.some((standard) => sameFeature(standard, feature)),
  );

  function save(next: string[]) {
    setValue("features", next, { shouldDirty: true });
  }

  function removeFeature(feature: string) {
    save((getValues("features") ?? []).filter((item) => item !== feature));
  }

  function addFeatures(raw: string) {
    const parts = raw
      .split(/[\n,]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...(getValues("features") ?? [])];
    for (const part of parts) {
      const standard = STANDARD_FEATURES.find((item) => sameFeature(item, part));
      const value = standard ?? part;
      if (!next.some((item) => sameFeature(item, value))) next.push(value);
    }
    save(next);
    setDraft("");
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        {STANDARD_FEATURES.map((feature) => (
          <label
            key={feature}
            className="flex items-center gap-3 text-sm p-3 rounded-lg border"
          >
            <Checkbox
              checked={features.some((item) => sameFeature(item, feature))}
              onChange={(e) => {
                const current = getValues("features") ?? [];
                save(
                  e.target.checked
                    ? current.some((item) => sameFeature(item, feature))
                      ? current
                      : [...current, feature]
                    : current.filter((item) => !sameFeature(item, feature)),
                );
              }}
            />
            {t(feature)}
          </label>
        ))}
      </div>
      <div className="mt-6">
        <label className="label" htmlFor="custom-features">
          {t("Additional features")}
        </label>
        <div className="field h-auto flex-col items-stretch gap-2 border-solid p-2 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
          {custom.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2" aria-label={t("Additional features")}>
              {custom.map((feature) => (
                <li
                  key={feature}
                  className="inline-flex items-center gap-1 rounded-md border bg-muted py-1 pl-2.5 pr-1 text-sm"
                >
                  {feature}
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-white hover:text-foreground"
                    aria-label={t("Remove {feature}", { feature })}
                    onClick={() => removeFeature(feature)}
                  >
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              id="custom-features"
              className="h-8 min-w-0 flex-1 bg-transparent px-2 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              value={draft}
              placeholder={t("Tow package")}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeatures(draft);
                } else if (
                  e.key === "Backspace" &&
                  draft === "" &&
                  custom.length > 0
                ) {
                  const last = custom[custom.length - 1];
                  removeFeature(last);
                }
              }}
              onBlur={() => addFeatures(draft)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (!/[\n,]/.test(text)) return;
                e.preventDefault();
                addFeatures(`${draft}${text}`);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!draft.trim()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addFeatures(draft)}
            >
              {t("Add")}
            </Button>
          </div>
        </div>
        <p className="hint mt-2">{t("Type a feature and press Enter.")}</p>
      </div>
    </>
  );
}

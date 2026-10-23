import { useState } from "react";
import { useI18n } from "../../shared/i18n-react";
import { selectPlaceholder } from "./vehicle-fields";
import { cn } from "./ui/button";

export function VehicleChoice({
  name,
  label,
  values,
  value,
  onChange,
  error,
  allowCustom = false,
}: {
  name: string;
  label: string;
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  allowCustom?: boolean;
}) {
  const { t } = useI18n();
  const [custom, setCustom] = useState(
    Boolean(value && !values.includes(value)),
  );
  const customSelected =
    allowCustom && (custom || Boolean(value && !values.includes(value)));
  const customLabels: Record<string, string> = {
    "Make *": "Custom make",
    Drivetrain: "Custom drivetrain",
    "Axle configuration": "Custom axle configuration",
    "Exterior color": "Custom exterior color",
    "Interior color": "Custom interior color",
    "Emission class": "Custom emission class",
  };
  const customLabel = customLabels[label] ?? label;
  return (
    <div>
      <label className="label" htmlFor={`v-${name}`}>
        {t(label)}
      </label>
      <select
        id={`v-${name}`}
        className={cn("field", error && "border-red-500")}
        value={customSelected ? "__custom__" : value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `v-${name}-error` : undefined}
        onChange={(event) => {
          const next = event.target.value;
          setCustom(next === "__custom__");
          onChange(next === "__custom__" ? "" : next);
        }}
      >
        <option value="">{t(selectPlaceholder(label))}</option>
        {values.filter(Boolean).map((option) => (
          <option key={option} value={option}>
            {t(option)}
          </option>
        ))}
        {allowCustom && (
          <option value="__custom__">
            {name === "make"
              ? t("Add a new make…")
              : t("Other — enter a value")}
          </option>
        )}
      </select>
      {customSelected && (
        <div className="mt-2">
          <label className="label text-xs" htmlFor={`v-${name}-custom`}>
            {t(customLabel)}
          </label>
          <input
            id={`v-${name}-custom`}
            className="field"
            value={value}
            maxLength={name === "make" ? 60 : 100}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}
      {error && (
        <p id={`v-${name}-error`} className="text-xs text-red-700 mt-1">
          {t(error)}
        </p>
      )}
    </div>
  );
}

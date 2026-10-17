import { useState } from "react";
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
  const [custom, setCustom] = useState(
    Boolean(value && !values.includes(value)),
  );
  const customSelected =
    allowCustom && (custom || Boolean(value && !values.includes(value)));
  return (
    <div>
      <label className="label" htmlFor={`v-${name}`}>
        {label}
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
        <option value="">{selectPlaceholder(label)}</option>
        {values.filter(Boolean).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {allowCustom && (
          <option value="__custom__">
            {name === "make" ? "Add a new make…" : "Other — enter a value"}
          </option>
        )}
      </select>
      {customSelected && (
        <div className="mt-2">
          <label className="label text-xs" htmlFor={`v-${name}-custom`}>
            Custom {label.replace(/ \*$/, "").toLowerCase()}
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
          {error}
        </p>
      )}
    </div>
  );
}

import type { VehicleInput } from "../../shared/schemas";
import { useI18n } from "../../shared/i18n-react";
import type { VehicleForm } from "./vehicle-form-types";
import { cn } from "./ui/button";

export function selectPlaceholder(label: string) {
  const name = label.replace(/\s*\*$/, "").replace(/\?$/, "").trim();
  return `Select ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}
export function VehicleField({
  form,
  name,
  label,
  type = "text",
  required = false,
  step,
}: {
  form: VehicleForm;
  name: keyof VehicleInput;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div>
      <label className="label" htmlFor={`v-${name}`}>
        {t(label)}
        {required ? " *" : ""}
      </label>
      <input
        id={`v-${name}`}
        className={cn("field", errors[name] && "border-red-500")}
        type={type}
        step={step}
        {...register(name, {
          setValueAs:
            type === "number"
              ? (v) => (v === "" ? undefined : Number(v))
              : undefined,
        })}
      />
      {errors[name] && (
        <p className="text-xs text-red-700 mt-1">
          {t(String(errors[name]?.message))}
        </p>
      )}
    </div>
  );
}
export function VehicleSelect({
  form,
  name,
  label,
  values,
  numeric = false,
}: {
  form: VehicleForm;
  name: keyof VehicleInput;
  label: string;
  values: readonly (string | { value: string; label: string })[];
  numeric?: boolean;
}) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div>
      <label className="label" htmlFor={`v-${name}`}>
        {t(label)}
      </label>
      <select
        id={`v-${name}`}
        className={cn("field", errors[name] && "border-red-500")}
        {...register(name, {
          setValueAs: numeric
            ? (value) => (value === "" ? Number.NaN : Number(value))
            : undefined,
          validate: (value) =>
            value === "" ||
            value === undefined ||
            (typeof value === "number" && Number.isNaN(value))
              ? `${selectPlaceholder(label)}.`
              : true,
        })}
      >
        <option value="">{t(selectPlaceholder(label))}</option>
        {values.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return (
            <option key={value} value={value}>
              {t(optionLabel)}
            </option>
          );
        })}
      </select>
      {errors[name] && (
        <p className="text-xs text-red-700 mt-1">
          {t(String(errors[name]?.message))}
        </p>
      )}
    </div>
  );
}

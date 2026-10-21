import { useElementStyle } from "./element-style";
import {
  useId,
  useState,
  type CSSProperties,
  type Dispatch,
  type HTMLAttributes,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox, Input, Label, NativeSelect } from "./ui/input";
import {
  bodyStyles,
  bodyStylesByCategory,
  categoryLabels,
  makeOptions,
  modelYears,
  vehicleCategories,
  type VehicleCategory,
} from "../shared/vehicle-options";
import { conditionLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import { type FilterKey, type FilterVisibility } from "./filter-visibility";
export type ExtraFilters = {
  category: string;
  model: string;
  location: string;
  condition: string;
  minPrice: string;
  maxYear: string;
  minMileage: string;
  maxMileage: string;
  transmission: string;
};
const priceScale = { min: 0, max: 200_000, step: 1_000 };
const mileageScale = { min: 0, max: 500_000, step: 5_000 };
function sliderValue(value: string, fallback: number) {
  if (value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function RangeSlider({
  min,
  max,
  step,
  minValue,
  maxValue,
  showMin,
  showMax,
  minLabel,
  maxLabel,
  minLabelProps,
  maxLabelProps,
  minInputProps,
  maxInputProps,
  format,
  onMin,
  onMax,
}: {
  min: number;
  max: number;
  step: number;
  minValue: string;
  maxValue: string;
  showMin: boolean;
  showMax: boolean;
  minLabel: string;
  maxLabel: string;
  minLabelProps: HTMLAttributes<HTMLSpanElement>;
  maxLabelProps: HTMLAttributes<HTMLSpanElement>;
  minInputProps: HTMLAttributes<HTMLInputElement>;
  maxInputProps: HTMLAttributes<HTMLInputElement>;
  format: (value: number, open: boolean) => string;
  onMin: (value: string) => void;
  onMax: (value: string) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const [active, setActive] = useState<"min" | "max">("max");
  const low = showMin
    ? Math.min(Math.max(sliderValue(minValue, min), min), max)
    : min;
  const high = showMax
    ? Math.min(Math.max(sliderValue(maxValue, max), min), max)
    : max;
  const start = Math.min(low, high);
  const end = Math.max(low, high);
  const span = max - min || 1;
  const left = showMin ? ((start - min) / span) * 100 : 0;
  const right = showMax ? ((end - min) / span) * 100 : 100;
  function thumbStyle(
    which: "min" | "max",
    props: HTMLAttributes<HTMLInputElement>,
  ): CSSProperties {
    return { ...props.style, zIndex: active === which ? 3 : 1 };
  }
  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3 text-sm">
        {showMin && (
          <div>
            <span id={minId} {...minLabelProps}>
              {minLabel}
            </span>
            <span className="mt-0.5 block font-semibold">
              {format(start, start <= min)}
            </span>
          </div>
        )}
        {showMax && (
          <div className="ml-auto text-right">
            <span id={maxId} {...maxLabelProps}>
              {maxLabel}
            </span>
            <span className="mt-0.5 block font-semibold">
              {format(end, end >= max)}
            </span>
          </div>
        )}
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${left}%`, width: `${Math.max(right - left, 0)}%` }}
        />
        {showMin && (
          <input
            {...minInputProps}
            type="range"
            className="sf-range"
            min={min}
            max={max}
            step={step}
            value={start}
            aria-labelledby={minId}
            aria-valuetext={format(start, start <= min)}
            style={thumbStyle("min", minInputProps)}
            onPointerDown={() => setActive("min")}
            onChange={(e) => {
              const next = Math.min(Number(e.target.value), end);
              onMin(next <= min ? "" : String(next));
            }}
          />
        )}
        {showMax && (
          <input
            {...maxInputProps}
            type="range"
            className="sf-range"
            min={min}
            max={max}
            step={step}
            value={end}
            aria-labelledby={maxId}
            aria-valuetext={format(end, end >= max)}
            style={thumbStyle("max", maxInputProps)}
            onPointerDown={() => setActive("max")}
            onChange={(e) => {
              const next = Math.max(Number(e.target.value), start);
              onMax(next >= max ? "" : String(next));
            }}
          />
        )}
      </div>
    </div>
  );
}
/** Longer lists, such as every make or model year, stay in a dropdown. */
const checkboxOptionLimit = 12;
function FilterSection({
  title,
  active = false,
  children,
}: {
  title: ReactNode;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{title}</span>
        {active && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
        )}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="grid gap-3 pb-4">{children}</div>
    </details>
  );
}
function OptionChecks({
  label,
  inputProps,
  value,
  options,
  onChange,
}: {
  label: string;
  inputProps: HTMLAttributes<HTMLDivElement>;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-2"
      {...inputProps}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 font-normal"
        >
          <Checkbox
            checked={value === option.value}
            onChange={() =>
              onChange(value === option.value ? "" : option.value)
            }
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
export function SearchFilters({
  visibility = {},
  availableMakes = [],
  makesError = "",
  search,
  make,
  minYear,
  maxPrice,
  fuel,
  body,
  setSearch,
  setMake,
  setMinYear,
  setMaxPrice,
  setFuel,
  setBody,
  extraFilters,
  setExtraFilters,
}: {
  visibility?: FilterVisibility;
  availableMakes?: string[];
  makesError?: string;
  search: string;
  make: string;
  minYear: string;
  maxPrice: string;
  fuel: string;
  body: string;
  setSearch: Dispatch<SetStateAction<string>>;
  setMake: Dispatch<SetStateAction<string>>;
  setMinYear: Dispatch<SetStateAction<string>>;
  setMaxPrice: Dispatch<SetStateAction<string>>;
  setFuel: Dispatch<SetStateAction<string>>;
  setBody: Dispatch<SetStateAction<string>>;
  extraFilters: ExtraFilters;
  setExtraFilters: Dispatch<SetStateAction<ExtraFilters>>;
}) {
  const { t, money, number } = useI18n();
  const elementStyle = useElementStyle();
  const sidebarId = useId();
  // Narrow widgets keep search visible and tuck the rest behind a toggle.
  const [open, setOpen] = useState(false);
  const update =
    (set: Dispatch<SetStateAction<string>>) =>
    (e: { target: { value: string } }) =>
      set(e.target.value);
  const updateExtra =
    (key: keyof ExtraFilters) => (e: { target: { value: string } }) =>
      setExtraFilters((f) => ({ ...f, [key]: e.target.value }));
  const visible = (key: FilterKey) => visibility[key] !== false;
  const category = extraFilters.category as VehicleCategory | "";
  const bodies = category ? bodyStylesByCategory[category] : bodyStyles;
  const years = modelYears();
  const activeCount = [
    search,
    make,
    minYear,
    maxPrice,
    fuel,
    body,
    ...Object.values(extraFilters),
  ].filter(Boolean).length;
  function clear() {
    setSearch("");
    setMake("");
    setMinYear("");
    setMaxPrice("");
    setFuel("");
    setBody("");
    setExtraFilters({
      category: "",
      model: "",
      location: "",
      condition: "",
      minPrice: "",
      maxYear: "",
      minMileage: "",
      maxMileage: "",
      transmission: "",
    });
  }
  const price = (visible("minPrice") || visible("maxPrice")) && (
    <FilterSection
      title={t("Price")}
      active={Boolean(extraFilters.minPrice || maxPrice)}
    >
      <RangeSlider
        {...priceScale}
        showMin={visible("minPrice")}
        showMax={visible("maxPrice")}
        minValue={extraFilters.minPrice}
        maxValue={maxPrice}
        minLabel={t("Min. price")}
        maxLabel={t("Max. price")}
        minLabelProps={elementStyle("filter-min-price-label")}
        maxLabelProps={elementStyle("filter-max-price-label")}
        minInputProps={elementStyle("filter-min-price-input")}
        maxInputProps={elementStyle("filter-max-price-input")}
        format={(value, open) =>
          open && value >= priceScale.max ? `${money(value)}+` : money(value)
        }
        onMin={(next) => setExtraFilters((f) => ({ ...f, minPrice: next }))}
        onMax={setMaxPrice}
      />
    </FilterSection>
  );
  const mileage = visible("maxMileage") && (
    <FilterSection
      title={t("Mileage")}
      active={Boolean(extraFilters.minMileage || extraFilters.maxMileage)}
    >
      <RangeSlider
        {...mileageScale}
        showMin
        showMax
        minValue={extraFilters.minMileage}
        maxValue={extraFilters.maxMileage}
        minLabel={t("Min. mileage")}
        maxLabel={t("Max. mileage")}
        minLabelProps={{}}
        maxLabelProps={elementStyle("filter-max-mileage-label")}
        minInputProps={{}}
        maxInputProps={elementStyle("filter-max-mileage-input")}
        format={(value, open) =>
          `${number(value)}${open && value >= mileageScale.max ? "+" : ""}`
        }
        onMin={(next) => setExtraFilters((f) => ({ ...f, minMileage: next }))}
        onMax={(next) => setExtraFilters((f) => ({ ...f, maxMileage: next }))}
      />
    </FilterSection>
  );
  const condition = visible("condition") && (
    <FilterSection
      title={
        <span {...elementStyle("filter-condition-label")}>{t("New / Used")}</span>
      }
      active={Boolean(extraFilters.condition)}
    >
      <OptionChecks
        label={t("Condition")}
        inputProps={elementStyle("filter-condition-input")}
        value={extraFilters.condition}
        onChange={(next) =>
          setExtraFilters((f) => ({ ...f, condition: next }))
        }
        options={[
          { value: "used", label: t(conditionLabel.used) },
          { value: "new", label: t(conditionLabel.new) },
          { value: "certified", label: t(conditionLabel.certified) },
        ]}
      />
    </FilterSection>
  );
  const year = (visible("minYear") || visible("maxYear")) && (
    <FilterSection
      title={t("Year")}
      active={Boolean(minYear || extraFilters.maxYear)}
    >
      {visible("minYear") && (
        <Label>
          <span {...elementStyle("filter-min-year-label")}>{t("Min. year")}</span>
          <NativeSelect
            {...elementStyle("filter-min-year-input")}
            value={minYear}
            onChange={update(setMinYear)}
          >
            <option value="">{t("Any year")}</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </NativeSelect>
        </Label>
      )}
      {visible("maxYear") && (
        <Label>
          <span {...elementStyle("filter-max-year-label")}>{t("Max. year")}</span>
          <NativeSelect
            {...elementStyle("filter-max-year-input")}
            value={extraFilters.maxYear}
            onChange={updateExtra("maxYear")}
          >
            <option value="">{t("Any year")}</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </NativeSelect>
        </Label>
      )}
    </FilterSection>
  );
  const makeField = visible("make") && (
    <FilterSection
      title={<span {...elementStyle("filter-make-label")}>{t("Make")}</span>}
      active={Boolean(make)}
    >
      <Label>
        <NativeSelect
          {...elementStyle("filter-make-input")}
          aria-label={t("Make")}
          value={make}
          onChange={update(setMake)}
        >
          <option value="">{t("All makes")}</option>
          {makeOptions([...availableMakes, make], category).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </NativeSelect>
        {makesError && (
          <span role="alert" className="text-xs font-normal">
            {t(makesError)}
          </span>
        )}
      </Label>
    </FilterSection>
  );
  const model = visible("model") && (
    <FilterSection title={t("Model")} active={Boolean(extraFilters.model)}>
      <Label>
        <span {...elementStyle("filter-model-label")}>{t("Model")}</span>
        <Input
          {...elementStyle("filter-model-input")}
          value={extraFilters.model}
          placeholder={t("Any model")}
          onChange={updateExtra("model")}
        />
      </Label>
    </FilterSection>
  );
  const categoryField = visible("category") && (
    <FilterSection
      title={
        <span {...elementStyle("filter-category-label")}>{t("Category")}</span>
      }
      active={Boolean(category)}
    >
      <OptionChecks
        label={t("Category")}
        inputProps={elementStyle("filter-category-input")}
        value={category}
        onChange={(next) => {
          setExtraFilters((f) => ({ ...f, category: next }));
          setBody("");
        }}
        options={vehicleCategories.map((c) => ({
          value: c,
          label: t(categoryLabels[c]),
        }))}
      />
    </FilterSection>
  );
  const bodyChoices = bodies.map((style) => ({
    value: style,
    label: t(style),
  }));
  const bodyField = visible("bodyStyle") && (
    <FilterSection
      title={<span {...elementStyle("filter-body-label")}>{t("Body")}</span>}
      active={Boolean(body)}
    >
      {bodyChoices.length <= checkboxOptionLimit ? (
        <OptionChecks
          label={t("Body")}
          inputProps={elementStyle("filter-body-input")}
          value={body}
          onChange={setBody}
          options={bodyChoices}
        />
      ) : (
        <Label>
          <NativeSelect
            {...elementStyle("filter-body-input")}
            aria-label={t("Body")}
            value={body}
            onChange={update(setBody)}
          >
            <option value="">{t("All body types")}</option>
            {bodies.map((m) => (
              <option key={m} value={m}>
                {t(m)}
              </option>
            ))}
          </NativeSelect>
        </Label>
      )}
    </FilterSection>
  );
  const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric", "CNG"].map(
    (fuelName) => ({ value: fuelName, label: t(fuelName) }),
  );
  const fuelField = visible("fuel") && (
    <FilterSection
      title={<span {...elementStyle("filter-fuel-label")}>{t("Fuel")}</span>}
      active={Boolean(fuel)}
    >
      <OptionChecks
        label={t("Fuel")}
        inputProps={elementStyle("filter-fuel-input")}
        value={fuel}
        onChange={setFuel}
        options={fuelOptions}
      />
    </FilterSection>
  );
  const transmission = visible("transmission") && (
    <FilterSection
      title={
        <span {...elementStyle("filter-transmission-label")}>
          {t("Transmission")}
        </span>
      }
      active={Boolean(extraFilters.transmission)}
    >
      <OptionChecks
        label={t("Transmission")}
        inputProps={elementStyle("filter-transmission-input")}
        value={extraFilters.transmission}
        onChange={(next) =>
          setExtraFilters((f) => ({ ...f, transmission: next }))
        }
        options={["Automatic", "Manual", "Automated manual"].map((name) => ({
          value: name,
          label: t(name),
        }))}
      />
    </FilterSection>
  );
  const location = visible("location") && (
    <FilterSection
      title={t("Location")}
      active={Boolean(extraFilters.location)}
    >
      <Label>
        <span {...elementStyle("filter-location-label")}>{t("Location")}</span>
        <Input
          {...elementStyle("filter-location-input")}
          value={extraFilters.location}
          placeholder={t("City or region")}
          onChange={updateExtra("location")}
        />
      </Label>
    </FilterSection>
  );
  const basics = [price, mileage, condition].filter(Boolean);
  const details = [
    year,
    makeField,
    model,
    categoryField,
    bodyField,
    fuelField,
    transmission,
    location,
  ].filter(Boolean);
  const hasSearch = visible("search");
  if (!hasSearch && basics.length === 0 && details.length === 0) return null;
  return (
    <div className="grid content-start gap-3" data-filters-open={open}>
      {hasSearch && (
        <Label>
          <span {...elementStyle("filter-search-label")}>{t("Search")}</span>
          <Input
            {...elementStyle("filter-search-input")}
            value={search}
            placeholder={t("Make, model or keyword")}
            onChange={update(setSearch)}
          />
        </Label>
      )}
      {(basics.length > 0 || details.length > 0) && (
        <>
          <Button
            type="button"
            variant="outline"
            className="sf-show-sm"
            aria-expanded={open}
            aria-controls={sidebarId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("Hide filters") : t("Filters")}
            {activeCount > 0 ? ` (${number(activeCount)})` : ""}
          </Button>
          <aside id={sidebarId} className="sf-sidebar sf-collapsible">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2
                {...elementStyle("more-filters")}
                className="text-base font-semibold"
              >
                {t("Filters")}
              </h2>
              {activeCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={clear}
                >
                  {t("Clear")}
                </Button>
              )}
            </div>
            {basics.length > 0 && (
              <Group title={t("Basics")}>{basics}</Group>
            )}
            {details.length > 0 && (
              <Group title={t("Vehicle details")}>{details}</Group>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

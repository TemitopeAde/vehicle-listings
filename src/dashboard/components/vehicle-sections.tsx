import type { VehicleForm } from "./vehicle-form-types";
import { currencyOptions } from "../../shared/currencies";
import { Checkbox } from "./ui/checkbox";
import type { Vehicle, VehicleInput, Dealer } from "../../shared/schemas";
import { Button, cn } from "./ui/button";
import { transitions, vehicleDetailsUrl } from "../../shared/utils";
import {
  bodyStylesByCategory,
  categoryLabels,
  isCommercial,
  isTrailer,
  makeOptions,
  modelYears,
  vehicleCategories,
  type VehicleCategory,
} from "../../shared/vehicle-options";
import { VehicleFeatures } from "./vehicle-features";
import { VehicleMedia } from "./vehicle-media";
import type { VehicleUploads } from "../use-vehicle-uploads";
import { selectPlaceholder, VehicleField, VehicleSelect } from "./vehicle-fields";
import { useResource } from "../hooks";
import { VehicleChoice } from "./vehicle-choice";
import { DescriptionEditor } from "./description-editor";
export function VehicleSections({
  section,
  form,
  saved,
  dealers,
  setConfirm,
  uploads,
  client,
  lockDealer = false,
  showFeatured = true,
}: {
  section: number;
  form: VehicleForm;
  saved: Vehicle | null;
  dealers: { data: { items: Dealer[] } | null; error: string };
  setConfirm: (value: string) => void;
  uploads: VehicleUploads;
  client?: <T>(route: string, body?: unknown, method?: string) => Promise<T>;
  lockDealer?: boolean;
  showFeatured?: boolean;
}) {
  const makes = useResource<{ makes: string[] }>(
    "vehicles?makes=1",
    client,
  );
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const field = (
    name: keyof VehicleInput,
    label: string,
    type = "text",
    required = false,
    step?: string,
  ) => (
    <VehicleField
      form={form}
      name={name}
      label={label}
      type={type}
      required={required}
      step={step}
    />
  );
  const rawCategory = watch("category");
  const category: VehicleCategory =
    rawCategory && rawCategory in bodyStylesByCategory ? rawCategory : "car";
  // Switching category drops a body type the new category does not offer.
  function changeCategory(next: string) {
    if (!(vehicleCategories as readonly string[]).includes(next)) {
      setValue("category", "" as VehicleCategory, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }
    const chosen = next as VehicleCategory;
    const opts = { shouldDirty: true, shouldValidate: true };
    setValue("category", chosen, opts);
    const styles: readonly string[] = bodyStylesByCategory[chosen];
    const body = watch("bodyStyle") ?? "";
    if (body && !styles.includes(body)) setValue("bodyStyle", "", opts);
    if (isTrailer(chosen)) {
      setValue("fuel", "None", opts);
      setValue("transmission", "None", opts);
      setValue("doors", 0, opts);
      setValue("seats", 0, opts);
      return;
    }
    const lorry = chosen === "lorry";
    if (watch("fuel") === "None") setValue("fuel", "", opts);
    if (
      watch("transmission") === "None" ||
      (!lorry && watch("transmission") === "Automated manual")
    )
      setValue("transmission", "", opts);
    if (watch("doors") === 0) setValue("doors", lorry ? 2 : 4, opts);
    if (watch("seats") === 0) setValue("seats", lorry ? 2 : 5, opts);
  }
  const select = (
    name: keyof VehicleInput,
    label: string,
    values: string[],
    numeric = false,
  ) => (
    <VehicleSelect
      form={form}
      name={name}
      label={label}
      values={values}
      numeric={numeric}
    />
  );
  function choice(
    name:
      | "make"
      | "drivetrain"
      | "exteriorColor"
      | "interiorColor"
      | "emissionClass",
    label: string,
    values: readonly string[],
  ) {
    return (
      <VehicleChoice
        key={name}
        name={name}
        label={label}
        values={values}
        value={watch(name) ?? ""}
        allowCustom
        error={errors[name]?.message}
        onChange={(value) =>
          setValue(name, value, { shouldDirty: true, shouldValidate: true })
        }
      />
    );
  }
  const colors = [
    "Black",
    "White",
    "Silver",
    "Grey",
    "Blue",
    "Red",
    "Green",
    "Brown",
    "Beige",
    "Gold",
    "Orange",
    "Yellow",
    "Purple",
  ];
  return (
    <>
      {" "}
      {section === 0 && (
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            {field("title", "Listing title", "text", true)}
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="v-category">
              Vehicle category
            </label>
            <select
              id="v-category"
              className={cn("field", errors.category && "border-red-500")}
              value={rawCategory && rawCategory in bodyStylesByCategory ? rawCategory : ""}
              aria-invalid={Boolean(errors.category)}
              onChange={(e) => changeCategory(e.target.value)}
            >
              <option value="">{selectPlaceholder("Vehicle category")}</option>
              {vehicleCategories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-red-700 mt-1">
                {String(errors.category.message)}
              </p>
            )}
          </div>
          {field("vin", "VIN (optional)")}
          {choice(
            "make",
            "Make *",
            makeOptions(
              makes.data?.makes,
              rawCategory && rawCategory in bodyStylesByCategory
                ? rawCategory
                : "",
            ),
          )}
          {field("model", "Model", "text", true)}
          {field("trim", "Trim")}
          <div>
            <label className="label" htmlFor="v-year">
              Model year *
            </label>
            <select
              id="v-year"
              className={cn("field", errors.year && "border-red-500")}
              {...register("year", {
                setValueAs: (v) => (v === "" ? Number.NaN : Number(v)),
              })}
            >
              <option value="">{selectPlaceholder("Model year")}</option>
              {[...new Set([...modelYears(), watch("year")])]
                .filter((y) => Number.isFinite(y) && y > 0)
                .sort((a, b) => b - a)
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
            {errors.year && (
              <p className="text-xs text-red-700 mt-1">
                {String(errors.year.message)}
              </p>
            )}
          </div>
          {select("condition", "Condition", ["used", "new", "certified"])}
          {field("firstRegistration", "First registration", "date")}
          {field("mileage", "Mileage", "number")}
          {select("mileageUnit", "Mileage unit", ["km", "mi"])}
        </div>
      )}
      {section === 1 && (
        <div className="grid sm:grid-cols-2 gap-5">
          {field("price", "Asking price", "number", true)}
          <VehicleSelect
            form={form}
            name="currency"
            label="Currency"
            values={currencyOptions}
          />
          {field("originalPrice", "Original price (optional)", "number")}
          <label className="flex items-center gap-2">
            <Checkbox {...register("negotiable")} />
            Price is negotiable
          </label>
          <div className="sm:col-span-2">
            {field("taxDisclaimer", "Tax / pricing disclaimer")}
          </div>
        </div>
      )}
      {section === 2 && (
        <div className="grid sm:grid-cols-2 gap-5">
          {select(
            "bodyStyle",
            category === "car" ? "Body style" : "Body type",
            [...bodyStylesByCategory[category]],
          )}
          {!isTrailer(category) && (
            <>
              {select(
                "transmission",
                "Transmission",
                category === "lorry"
                  ? ["Manual", "Automated manual", "Automatic"]
                  : ["Automatic", "Manual"],
              )}
              {select(
                "fuel",
                "Fuel",
                category === "lorry"
                  ? ["Diesel", "CNG", "Electric", "Hybrid", "Petrol"]
                  : ["Petrol", "Diesel", "Electric", "Hybrid"],
              )}
              {choice(
                "drivetrain",
                category === "lorry" ? "Axle configuration" : "Drivetrain",
                category === "lorry"
                  ? ["4x2", "4x4", "6x2", "6x4", "6x6", "8x4"]
                  : ["FWD", "RWD", "AWD", "4WD"],
              )}
              {field("engineSize", "Engine size")}
              {field("horsepower", "Horsepower", "number")}
              {select(
                "doors",
                "Doors",
                Array.from({ length: 8 }, (_, i) => String(i + 1)),
                true,
              )}
              {select(
                "seats",
                "Seats",
                Array.from({ length: 20 }, (_, i) => String(i + 1)),
                true,
              )}
            </>
          )}
          {isCommercial(category) && (
            <>
              {select(
                "axles",
                "Axles",
                Array.from({ length: 12 }, (_, i) => String(i + 1)),
                true,
              )}
              {field("grossWeight", "Gross vehicle weight (kg)", "number")}
              {field("payload", "Payload (kg)", "number")}
              {field("bodyLength", "Body length (m)", "number", false, "0.1")}
            </>
          )}
          {choice("exteriorColor", "Exterior color", colors)}
          {!isTrailer(category) &&
            choice("interiorColor", "Interior color", colors)}
          {choice("emissionClass", "Emission class", [
            "Euro 1",
            "Euro 2",
            "Euro 3",
            "Euro 4",
            "Euro 5",
            "Euro 6",
            "Euro 6d",
            "Zero emissions",
          ])}
        </div>
      )}
      {section === 3 && <VehicleFeatures form={form} />}
      {section === 4 && <VehicleMedia form={form} uploads={uploads} />}
      {section === 5 && (
        <div className="grid sm:grid-cols-2 gap-5">
          {lockDealer ? (
            <input type="hidden" {...register("dealerId")} />
          ) : (
            <div>
              <label className="label" htmlFor="dealer-id">
                Dealership
              </label>
              <select
                id="dealer-id"
                className="field"
                {...register("dealerId")}
              >
                <option value="">{selectPlaceholder("Dealership")}</option>
                {dealers.data?.items.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.businessName} ({d.approvalState})
                  </option>
                ))}
              </select>
              {dealers.error && (
                <p role="alert" className="text-sm text-red-700 mt-2">
                  {dealers.error}
                </p>
              )}
            </div>
          )}
          {field("location", "Vehicle location")}
        </div>
      )}
      {section === 6 && (
        <div className="space-y-5">
          <DescriptionEditor
            value={watch("description") ?? ""}
            onChange={(html, source) => {
              setValue("description", html, {
                shouldDirty: source === "user",
                shouldValidate: source === "user",
              });
            }}
          />
          {field("seoTitle", "SEO title (up to 70 characters)")}
          {field("seoDescription", "SEO description (up to 170 characters)")}
          <p className="hint">
            The URL stays stable after a title change:{" "}
            {saved
              ? vehicleDetailsUrl(saved.slug)
              : "Assigned when you first save"}
          </p>
        </div>
      )}
      {section === 7 && (
        <div className="space-y-5">
          <p className="hint">
            Publishing needs an approved dealership, a photo, a price, and a
            description.
          </p>
          {showFeatured && (
            <label className="flex items-center gap-3">
              <Checkbox {...register("featured")} />
              Feature this vehicle
            </label>
          )}
          {saved && (
            <div className="flex flex-wrap gap-3">
              {transitions[saved.status]
                .filter((s) => s !== "published")
                .map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={s === "deleted" ? "destructive" : "outline"}
                    onClick={() => setConfirm(s)}
                  >
                    {s === "draft" ? "Restore as draft" : `Mark ${s}`}
                  </Button>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

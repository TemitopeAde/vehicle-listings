import { useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Save, Globe } from "lucide-react";
import {
  vehicleInput,
  type Vehicle,
  type VehicleInput,
  type Dealer,
} from "../shared/schemas";
import { api } from "./api";
type Client = <T>(
  route: string,
  body?: unknown,
  method?: string,
) => Promise<T>;
import { VehicleSections } from "./components/vehicle-sections";
import { useResource } from "./hooks";
import { Button, cn } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { Badge } from "./components/common";
import { useVehicleUploads } from "./use-vehicle-uploads";
import type { UploadDependencies } from "./media-upload";
import { isCommercial, isTrailer } from "../shared/vehicle-options";
import { statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import { createTestVehicle } from "./vehicle-test-data";
const sections = [
  "Basics",
  "Pricing",
  "Specifications",
  "Features",
  "Media",
  "Seller",
  "Description & SEO",
  "Publishing",
];
type FormInput = z.input<typeof vehicleInput>;
const basicsFields = [
  "title",
  "category",
  "make",
  "model",
  "year",
  "condition",
  "mileageUnit",
] as const satisfies readonly (keyof VehicleInput)[];
const pricingFields = ["price", "currency"] as const satisfies readonly (keyof VehicleInput)[];
function specificationFields(category: string): (keyof VehicleInput)[] {
  const fields: (keyof VehicleInput)[] = ["bodyStyle"];
  if (!isTrailer(category)) fields.push("transmission", "fuel", "doors", "seats");
  if (isCommercial(category)) fields.push("axles");
  return fields;
}
function requiredFields(step: number, category: string): (keyof VehicleInput)[] {
  if (step === 0) return [...basicsFields];
  if (step === 1) return [...pricingFields];
  if (step === 2) return specificationFields(category);
  return [];
}
function blankField(value: unknown) {
  return (
    value === "" ||
    value === undefined ||
    value === null ||
    (typeof value === "number" && Number.isNaN(value))
  );
}
function requiredMessage(name: keyof VehicleInput, category: string) {
  switch (name) {
    case "title":
      return "Enter a listing title.";
    case "category":
      return "Select vehicle category.";
    case "make":
      return "Select make.";
    case "model":
      return "Enter the model.";
    case "year":
      return "Select model year.";
    case "condition":
      return "Select condition.";
    case "mileageUnit":
      return "Select mileage unit.";
    case "price":
      return "Enter the asking price.";
    case "currency":
      return "Select currency.";
    case "bodyStyle":
      return category === "car" ? "Select body style." : "Select body type.";
    case "transmission":
      return "Select transmission.";
    case "fuel":
      return "Select fuel.";
    case "doors":
      return "Select doors.";
    case "seats":
      return "Select seats.";
    case "axles":
      return "Select axles.";
    default:
      return "Complete this field.";
  }
}
function acceptAuto(
  current: string,
  generated: string,
  state: { last: string | null; stop: boolean },
) {
  if (state.stop || !generated || current === generated) {
    if (current === generated) state.last = generated;
    return false;
  }
  if ((state.last === null && current) || (state.last !== null && current !== state.last)) {
    state.stop = true;
    return false;
  }
  state.last = generated;
  return true;
}
function stepForField(name: string) {
  if (
    (
      [
        "title",
        "category",
        "vin",
        "make",
        "model",
        "trim",
        "year",
        "condition",
        "firstRegistration",
        "mileage",
        "mileageUnit",
      ] as string[]
    ).includes(name)
  )
    return 0;
  if (
    (["price", "currency", "originalPrice", "negotiable", "taxDisclaimer"] as string[]).includes(
      name,
    )
  )
    return 1;
  if (
    (
      [
        "bodyStyle",
        "transmission",
        "fuel",
        "drivetrain",
        "engineSize",
        "horsepower",
        "doors",
        "seats",
        "axles",
        "grossWeight",
        "payload",
        "bodyLength",
        "exteriorColor",
        "interiorColor",
        "emissionClass",
      ] as string[]
    ).includes(name)
  )
    return 2;
  if (name === "features") return 3;
  if (name === "media" || name === "videos") return 4;
  if (name === "dealerId" || name === "location") return 5;
  if (name === "description" || name === "seoTitle" || name === "seoDescription")
    return 6;
  return 7;
}
export function VehicleEditor({
  vehicle,
  onBack,
  leaveRequest,
  lockedDealer,
  client = api,
  backLabel = "Back to inventory",
  submitDisabled = false,
  uploadDependencies,
  showFeatured = false,
}: {
  vehicle: Vehicle | null;
  /** Receives the page to open next, so the workspace can leave the editor on that page. */
  onBack?: (target?: string) => void;
  /** Set by the workspace when a sidebar link is clicked, so unsaved changes are still confirmed. */
  leaveRequest?: { page: string } | null;
  lockedDealer?: Pick<Dealer, "_id" | "businessName" | "approvalState" | "location">;
  client?: Client;
  backLabel?: string;
  /** The form stays usable, but saving and publishing stay off. */
  submitDisabled?: boolean;
  /** Replaces how a photo or video reaches the Media Manager. */
  uploadDependencies?: Partial<UploadDependencies>;
  showFeatured?: boolean;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState(0),
    [saved, setSaved] = useState(vehicle),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(""),
    [leaveTarget, setLeaveTarget] = useState<string | undefined>();
  const createKey = useRef("");
  const testDataButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = testDataButton.current;
    const bounds = button?.getBoundingClientRect();
    console.info("[Vehicle test data] Editor state (debug v3)", {
      development: import.meta.env.DEV,
      editingExistingVehicle: Boolean(vehicle),
      hasSavedVehicle: Boolean(saved),
      buttonExpected: !saved,
      buttonMounted: Boolean(button),
      buttonDisabled: button?.disabled,
      buttonDisplay: button ? window.getComputedStyle(button).display : null,
      buttonVisibility: button ? window.getComputedStyle(button).visibility : null,
      buttonBounds: bounds?.toJSON(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      submitDisabled,
      dealerLocked: Boolean(lockedDealer),
    });
  }, [vehicle, saved, submitDisabled, lockedDealer]);
  const dealerList = useResource<{ items: Dealer[] }>(
    lockedDealer || submitDisabled ? null : "dealers",
    client,
  );
  const dealers = lockedDealer
    ? {
        data: {
          items: [
            {
              _id: lockedDealer._id,
              businessName: lockedDealer.businessName,
              approvalState: lockedDealer.approvalState,
              location: lockedDealer.location,
            } as Dealer,
          ],
        },
        error: "",
      }
    : dealerList;
  const [defaultValues] = useState<DefaultValues<FormInput>>(() =>
    vehicle
      ? vehicleInput.parse(
          Object.fromEntries(
            Object.keys(vehicleInput.shape).map((k) => [
              k,
              vehicle[k as keyof Vehicle],
            ]),
          ),
        )
      : {
          title: "",
          make: "",
          model: "",
          currency: "USD",
          condition: "" as FormInput["condition"],
          mileageUnit: "" as FormInput["mileageUnit"],
          category: "" as FormInput["category"],
          bodyStyle: "" as FormInput["bodyStyle"],
          transmission: "" as FormInput["transmission"],
          fuel: "" as FormInput["fuel"],
          doors: Number.NaN,
          seats: Number.NaN,
          features: [],
          media: [],
          videos: [],
          description: "",
          dealerId: lockedDealer?._id ?? "",
          location: lockedDealer?.location ?? "",
        },
  );
  const form = useForm<FormInput, unknown, VehicleInput>({
    resolver: zodResolver(vehicleInput),
    defaultValues,
  });
  const uploads = useVehicleUploads(form, uploadDependencies);
  const {
    formState: { isDirty },
  } = form;
  const showroom = useResource<{ currency: VehicleInput["currency"] }>(
    vehicle ? null : "settings",
    client,
  );
  const titleAuto = useRef({ last: null as string | null, stop: false });
  const seoAuto = useRef({ last: null as string | null, stop: false });
  const locationAuto = useRef({ last: null as string | null, stop: false });
  const currencyAuto = useRef("USD");
  const year = form.watch("year");
  const make = form.watch("make");
  const model = form.watch("model");
  const trim = form.watch("trim");
  const listingTitle = form.watch("title");
  const dealerId = form.watch("dealerId");
  useEffect(() => {
    if (vehicle) return;
    const yearText =
      typeof year === "number" && Number.isFinite(year) && year > 0
        ? String(year)
        : "";
    const generated = [yearText, make, model, trim]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean)
      .join(" ");
    const current = (form.getValues("title") ?? "").trim();
    if (!acceptAuto(current, generated, titleAuto.current)) return;
    form.setValue("title", generated, {
      shouldDirty: true,
      shouldValidate: generated.length >= 3,
    });
  }, [vehicle, year, make, model, trim, form]);
  useEffect(() => {
    if (vehicle) return;
    const generated = (listingTitle ?? "").trim().slice(0, 70);
    const current = (form.getValues("seoTitle") ?? "").trim();
    if (!acceptAuto(current, generated, seoAuto.current)) return;
    form.setValue("seoTitle", generated, { shouldDirty: true });
  }, [vehicle, listingTitle, form]);
  useEffect(() => {
    if (vehicle || lockedDealer) return;
    const choices = (dealers.data?.items ?? []).filter(
      (item) => item.approvalState === "approved",
    );
    if (choices.length !== 1) return;
    if (form.getValues("dealerId")) return;
    form.setValue("dealerId", choices[0]._id, { shouldValidate: true });
  }, [vehicle, lockedDealer, dealers.data, form]);
  useEffect(() => {
    if (vehicle) return;
    const dealer = dealers.data?.items.find((item) => item._id === dealerId);
    const generated = dealer?.location?.trim() ?? "";
    const current = (form.getValues("location") ?? "").trim();
    if (!acceptAuto(current, generated, locationAuto.current)) return;
    form.setValue("location", generated, { shouldDirty: true });
  }, [vehicle, dealerId, dealers.data, form]);
  useEffect(() => {
    if (vehicle) return;
    const next = showroom.data?.currency;
    if (!next) return;
    const current = form.getValues("currency");
    if (current !== currencyAuto.current) return;
    currencyAuto.current = next;
    if (current !== next) form.setValue("currency", next);
  }, [vehicle, showroom.data, form]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (isDirty || uploads.busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [isDirty, uploads.busy]);
  function revealInvalid(errors: FieldErrors<FormInput>) {
    const steps = Object.keys(errors).map(stepForField);
    if (steps.length) setSection(Math.min(...steps));
  }
  function fillTestData() {
    console.info("[Vehicle test data] Fill button clicked");
    try {
      const current = form.getValues();
      const sample = createTestVehicle({
        dealerId: lockedDealer?._id ?? current.dealerId ?? "",
        location: lockedDealer?.location ?? current.location ?? "",
        currency: current.currency ?? showroom.data?.currency ?? "USD",
        media: current.media ?? [],
        videos: current.videos ?? [],
      });
      titleAuto.current = { last: sample.title, stop: false };
      seoAuto.current = { last: sample.seoTitle, stop: false };
      locationAuto.current = { last: sample.location, stop: false };
      form.reset(sample, { keepDefaultValues: true });
      setSection(0);
      console.info("[Vehicle test data] Form filled", {
        titleMatches: form.getValues("title") === sample.title,
        category: form.getValues("category"),
        photoCount: form.getValues("media")?.length ?? 0,
        dealerSelected: Boolean(form.getValues("dealerId")),
      });
      toast.success(t("Test data filled. Review before saving or publishing."));
    } catch (error) {
      console.error("[Vehicle test data] Failed to fill form", error);
      toast.error(t("Could not fill test data. Check the browser console."));
    }
  }
  async function stepReady(step: number) {
    const category = String(form.getValues("category") ?? "");
    const names = requiredFields(step, category);
    if (!names.length) return true;
    form.clearErrors(names);
    const formatOk = await form.trigger(names, { shouldFocus: step === section });
    let blanks = false;
    for (const name of names) {
      if (!blankField(form.getValues(name))) continue;
      form.setError(name, { type: "required", message: requiredMessage(name, category) });
      blanks = true;
    }
    return formatOk && !blanks;
  }
  async function goToSection(next: number) {
    if (next === section) return;
    if (next < section) {
      setSection(next);
      return;
    }
    for (let step = section; step < next; step++) {
      if (await stepReady(step)) continue;
      setSection(step);
      return;
    }
    setSection(next);
  }
  function back(target?: string) {
    if (!onBack) return;
    if (isDirty || uploads.busy) {
      setLeaveTarget(target);
      setConfirm("leave");
    } else onBack(target);
  }
  useEffect(() => {
    if (leaveRequest) back(leaveRequest.page);
    // Runs once per click; `back` reads the latest form state on each render.
  }, [leaveRequest]);
  async function save(input: VehicleInput, publish = false) {
    if (uploads.busy) {
      toast.error(t("Wait for media uploads to finish before saving."));
      return;
    }
    setBusy(true);
    try {
      if (!createKey.current) createKey.current = crypto.randomUUID();
      let result = await client<Vehicle>(
        "vehicles",
        saved
          ? {
              action: "update",
              id: saved._id,
              payload: input,
              version: saved.version,
            }
          : {
              action: "create",
              payload: input,
              idempotencyKey: createKey.current,
            },
      );
      setSaved(result);
      form.reset(
        vehicleInput.parse(
          Object.fromEntries(
            Object.keys(vehicleInput.shape).map((k) => [
              k,
              result[k as keyof Vehicle],
            ]),
          ),
        ),
      );
      if (publish) {
        result = await client<Vehicle>("vehicles", {
          action: "status",
          id: result._id,
          status: "published",
        });
        setSaved(result);
      }
      toast.success(
        publish ? t("Vehicle published") : t("Vehicle saved"),
      );
      setConfirm("");
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function statusAction(status: string) {
    if (!saved) return;
    setBusy(true);
    try {
      const result = await client<Vehicle>("vehicles", {
        action: "status",
        id: saved._id,
        status,
      });
      setSaved(result);
      toast.success(
        t("Vehicle {status}", { status: t(statusLabel[status] ?? status) }),
      );
      setConfirm("");
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="flex justify-between flex-wrap items-center gap-3 mb-6">
        {onBack ? (
          <Button variant="ghost" onClick={() => back()}>
            <ArrowLeft size={16} />
            {t(backLabel)}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2 items-center">
          {!saved && (
            <Button
              ref={testDataButton}
              type="button"
              variant="outline"
              onClick={fillTestData}
              disabled={busy || uploads.busy}
            >
              {t("Fill test data")}
            </Button>
          )}
          <Badge status={saved?.status}>
            {saved?.demo
              ? t("Demo vehicle")
              : t(
                  saved
                    ? (statusLabel[saved.status] ?? saved.status)
                    : "New draft",
                )}
          </Badge>
          <Button
            variant="outline"
            onClick={() => void form.handleSubmit((i) => save(i), revealInvalid)()}
            disabled={busy || uploads.busy || submitDisabled}
            pending={busy}
          >
            <Save size={16} />
            {t("Save changes")}
          </Button>
          <Button
            onClick={() => setConfirm("published")}
            disabled={
              busy ||
              uploads.busy ||
              submitDisabled ||
              saved?.demo ||
              saved?.status === "published"
            }
          >
            <Globe size={16} />
            {t("Publish")}
          </Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[210px_1fr] gap-6">
        <nav
          aria-label={t("Vehicle editor sections")}
          className="surface p-3 h-fit flex lg:flex-col flex-wrap gap-1"
        >
          {sections.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => void goToSection(i)}
              className={cn(
                "px-3 py-3 rounded-lg text-sm text-start flex gap-3 items-center cursor-pointer",
                section === i
                  ? "bg-green-50 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-current={section === i ? "step" : undefined}
            >
              <span className="text-xs opacity-60">
                {String(i + 1).padStart(2, "0")}
              </span>
              {t(s)}
            </button>
          ))}
        </nav>
        <form
          className="surface p-6 lg:p-8"
          onSubmit={(event) => {
            if (submitDisabled) {
              event.preventDefault();
              return;
            }
            void form.handleSubmit((i) => save(i), revealInvalid)(event);
          }}
        >
          <h2 className="text-xl font-semibold">
            {t(sections[section] ?? "")}
          </h2>
          <p className="hint mt-1 mb-7">
            {section === 0
              ? t("Start with the facts that make this vehicle easy to find.")
              : t("Keep details accurate so buyers know what to expect.")}
          </p>
          <VehicleSections
            section={section}
            form={form}
            saved={saved}
            dealers={dealers}
            setConfirm={setConfirm}
            uploads={uploads}
            client={client}
            lockDealer={Boolean(lockedDealer)}
            showFeatured={showFeatured}
          />
          <div className="border-t mt-8 pt-5 flex justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={section === 0}
              onClick={() => setSection((s) => s - 1)}
            >
              {t("Previous")}
            </Button>
            {section < sections.length - 1 ? (
              <Button type="button" onClick={() => void goToSection(section + 1)}>
                {t("Continue")}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={busy || uploads.busy || submitDisabled}
                pending={busy}
              >
                {t("Save changes")}
              </Button>
            )}
          </div>
        </form>
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm("");
        }}
      >
        <DialogContent>
          <DialogTitle className="section-heading">
            {confirm === "leave"
              ? t("Discard unsaved changes?")
              : confirm === "published"
                ? t("Publish this vehicle?")
                : t("Mark this vehicle {status}?", {
                    status: t(statusLabel[confirm] ?? confirm),
                  })}
          </DialogTitle>
          <DialogDescription className="hint my-4">
            {confirm === "leave"
              ? t(
                  "Changes since your last save will be lost and pending uploads will be cancelled.",
                )
              : confirm === "published"
                ? t(
                    "Your changes will be saved and this listing will become visible to site visitors.",
                  )
                : t(
                    "This changes the availability of this listing on your storefront.",
                  )}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm("")}>
              {t("Cancel")}
            </Button>
            <Button
              disabled={busy}
              pending={busy}
              onClick={() =>
                confirm === "leave"
                  ? onBack?.(leaveTarget)
                  : confirm === "published"
                    ? void form.handleSubmit((i) => save(i, true), (errors) => {
                        setConfirm("");
                        revealInvalid(errors);
                      })()
                    : void statusAction(confirm)
              }
            >
              {t("Confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

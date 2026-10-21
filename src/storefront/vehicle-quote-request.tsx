import { useId, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../shared/client";
import type { Vehicle } from "../shared/schemas";
import {
  quotePaymentLabels,
  quotePaymentMethods,
  quoteRequestForm,
  quoteTimelineLabels,
  quoteTimelines,
  type QuoteRequestFormInput,
  type QuoteRequestFormValues,
} from "../shared/quote-requests";
import { useI18n } from "../shared/i18n-react";
import { Button } from "./ui/button";
import { Alert } from "./ui/card";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "./ui/input";

type SubmitResult = { confirmationEmailStatus: string };

/** A label, its control and the control's zod error, linked for screen readers. */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <Label htmlFor={id}>
      {label}
      {children({
        id,
        "aria-invalid": Boolean(error),
        ...(error ? { "aria-describedby": errorId } : {}),
      })}
      {error && (
        <span id={errorId} className="text-xs font-normal text-destructive">
          {error}
        </span>
      )}
    </Label>
  );
}

export function VehicleQuoteRequest({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useI18n();
  const [result, setResult] = useState<SubmitResult | null>(null),
    [formError, setFormError] = useState("");
  const key = useRef("");
  const consentErrorId = useId();
  const honeypot = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<QuoteRequestFormInput, unknown, QuoteRequestFormValues>({
    resolver: zodResolver(quoteRequestForm),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      addressLine: "",
      city: "",
      subdivision: "",
      postalCode: "",
      country: "",
      quantity: 1,
      paymentMethod: "" as QuoteRequestFormInput["paymentMethod"],
      timeline: "" as QuoteRequestFormInput["timeline"],
      tradeIn: false,
      tradeInDetails: "",
      message: "",
      consent: false as unknown as true,
    },
  });
  const tradeIn = watch("tradeIn");
  async function submit(values: QuoteRequestFormValues) {
    // One key per request, so a retry after a network error isn't recorded twice.
    if (!key.current) key.current = crypto.randomUUID();
    setFormError("");
    try {
      setResult(
        await api<SubmitResult>("quote-requests", {
          ...values,
          tradeInDetails: values.tradeIn ? values.tradeInDetails : "",
          vehicleId: vehicle._id,
          honeypot: honeypot.current?.value ?? "",
          idempotencyKey: key.current,
        }),
      );
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
  if (result)
    return (
      <Alert role="status">
        {t("Thank you. Your quote request for {title} has been received.", {
          title: vehicle.title,
        })}{" "}
        {result.confirmationEmailStatus === "queued"
          ? t("A confirmation is on its way to {email}.", {
              email: getValues("email"),
            })
          : t("The dealership will reply using your contact details.")}
      </Alert>
    );
  const message = (name: keyof QuoteRequestFormInput) => {
    const text = errors[name]?.message as string | undefined;
    return text ? t(text) : undefined;
  };
  return (
    // Validation is done by the zod schema the API also uses, not the browser.
    <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
      <h4 className="font-semibold">{t("Request a quote")}</h4>
      <p className="text-xs text-muted-foreground">
        {t("Fields marked * are required.")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("First name *")} error={message("firstName")}>
          {(a) => (
            <Input
              {...a}
              {...register("firstName")}
              autoComplete="given-name"
            />
          )}
        </Field>
        <Field label={t("Last name *")} error={message("lastName")}>
          {(a) => (
            <Input
              {...a}
              {...register("lastName")}
              autoComplete="family-name"
            />
          )}
        </Field>
      </div>
      <Field label={t("Email *")} error={message("email")}>
        {(a) => (
          <Input
            {...a}
            {...register("email")}
            inputMode="email"
            autoComplete="email"
          />
        )}
      </Field>
      <Field label={t("Phone *")} error={message("phone")}>
        {(a) => (
          <Input
            {...a}
            {...register("phone")}
            inputMode="tel"
            autoComplete="tel"
          />
        )}
      </Field>
      <Field label={t("Company")} error={message("company")}>
        {(a) => (
          <Input {...a} {...register("company")} autoComplete="organization" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Quantity *")} error={message("quantity")}>
          {(a) => (
            <Input
              {...a}
              {...register("quantity")}
              inputMode="numeric"
              autoComplete="off"
            />
          )}
        </Field>
        <Field label={t("Payment *")} error={message("paymentMethod")}>
          {(a) => (
            <NativeSelect {...a} {...register("paymentMethod")}>
              <option value="">{t("Select payment")}</option>
              {quotePaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {t(quotePaymentLabels[method])}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>
      <Field
        label={t("When do you plan to buy? *")}
        error={message("timeline")}
      >
        {(a) => (
          <NativeSelect {...a} {...register("timeline")}>
            <option value="">{t("Select when you plan to buy")}</option>
            {quoteTimelines.map((timeline) => (
              <option key={timeline} value={timeline}>
                {t(quoteTimelineLabels[timeline])}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <details className="grid gap-4">
        <summary className="cursor-pointer text-sm font-medium">
          {t("Billing address (optional)")}
        </summary>
        <div className="mt-3 grid gap-4">
          <Field label={t("Street address")} error={message("addressLine")}>
            {(a) => (
              <Input
                {...a}
                {...register("addressLine")}
                autoComplete="street-address"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("City")} error={message("city")}>
              {(a) => (
                <Input
                  {...a}
                  {...register("city")}
                  autoComplete="address-level2"
                />
              )}
            </Field>
            <Field label={t("State or region")} error={message("subdivision")}>
              {(a) => (
                <Input
                  {...a}
                  {...register("subdivision")}
                  autoComplete="address-level1"
                />
              )}
            </Field>
            <Field label={t("Postal code")} error={message("postalCode")}>
              {(a) => (
                <Input
                  {...a}
                  {...register("postalCode")}
                  autoComplete="postal-code"
                />
              )}
            </Field>
            <Field label={t("Country")} error={message("country")}>
              {(a) => (
                <Input
                  {...a}
                  {...register("country")}
                  autoComplete="country-name"
                />
              )}
            </Field>
          </div>
        </div>
      </details>
      <label className="flex items-center gap-2.5 text-sm">
        <Checkbox {...register("tradeIn")} />
        {t("I have a vehicle to trade in")}
      </label>
      {tradeIn && (
        <Field
          label={t("Trade-in details *")}
          error={message("tradeInDetails")}
        >
          {(a) => (
            <Textarea
              {...a}
              {...register("tradeInDetails")}
              rows={2}
              placeholder={t("Year, make, model and mileage")}
            />
          )}
        </Field>
      )}
      <Field label={t("Message")} error={message("message")}>
        {(a) => (
          <Textarea
            {...a}
            {...register("message")}
            rows={3}
            placeholder={t(
              "Options, delivery or anything else the quote should cover",
            )}
          />
        )}
      </Field>
      <input
        ref={honeypot}
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />
      <div className="grid gap-1.5">
        <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <Checkbox
            {...register("consent")}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? consentErrorId : undefined}
          />
          {t(
            "I agree that the dealership may store my details and contact me about this quote. *",
          )}
        </label>
        {errors.consent?.message && (
          <span id={consentErrorId} className="text-xs text-destructive">
            {t(errors.consent.message)}
          </span>
        )}
      </div>
      {formError && (
        <Alert variant="destructive" role="alert">
          {t(formError)}
        </Alert>
      )}
      <Button disabled={isSubmitting} pending={isSubmitting}>
        {t("Request quote")}
      </Button>
    </form>
  );
}

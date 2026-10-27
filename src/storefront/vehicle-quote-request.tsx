import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, cacheTtl, cachedApi } from "../shared/client";
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
import {
  countryOptions,
  internationalPhone,
  visitorCountry,
} from "../shared/countries";
import { localeFor } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import { readLoginEmail } from "../shared/wix-member";
import { Button } from "./ui/button";
import { Alert } from "./ui/card";
import { Checkbox, Input, NativeSelect, Textarea } from "./ui/input";
import { FormField as Field } from "./ui/form-field";

type SubmitResult = { confirmationEmailStatus: string };
type State = { code: string; name: string };

/** States or cities from the locations API; `failed` means the field falls back to free text. */
function usePlaces<T>(route: string | null) {
  const [result, setResult] = useState<{
    route: string;
    data?: T;
    failed?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!route) return;
    let active = true;
    cachedApi<T>(route, cacheTtl.places).then(
      (data) => active && setResult({ route, data }),
      () => active && setResult({ route, failed: true }),
    );
    return () => {
      active = false;
    };
  }, [route]);
  const current = result?.route === route ? result : null;
  return {
    data: current?.data,
    failed: Boolean(current?.failed),
    loading: Boolean(route) && !current,
  };
}

export function VehicleQuoteRequest({ vehicle }: { vehicle: Vehicle }) {
  const { t, language } = useI18n();
  const countries = useMemo(
    () => countryOptions(localeFor(language)),
    [language],
  );
  // The dial code follows the billing country until the visitor picks one themselves.
  const [phoneCountry, setPhoneCountry] = useState(""),
    [phoneCountryChosen, setPhoneCountryChosen] = useState(false),
    [localPhone, setLocalPhone] = useState("");
  // The browser language is only known after hydration, so the default is picked then.
  useEffect(() => setPhoneCountry((code) => code || visitorCountry()), []);
  const dialFor = (code: string) =>
    countries.find((c) => c.code === code)?.dial ?? "";
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
    setValue,
    formState: { errors, isSubmitting, isSubmitted, touchedFields },
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
  useEffect(() => {
    let active = true;
    // Visitors who aren't logged in, or pages outside a live site, just keep an empty field.
    readLoginEmail()
      .then((email) => {
        if (active && email && !getValues("email"))
          setValue("email", email, { shouldValidate: true });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [getValues, setValue]);
  const tradeIn = watch("tradeIn");
  function updatePhone(code: string, local: string, touch = false) {
    setValue("phone", internationalPhone(dialFor(code), local), {
      shouldDirty: true,
      shouldTouch: touch,
      shouldValidate: touch || isSubmitted || Boolean(touchedFields.phone),
    });
  }
  const country = watch("country") ?? "";
  const subdivision = watch("subdivision") ?? "";
  const states = usePlaces<State[]>(
    country ? `locations?country=${country}` : null,
  );
  // Without a list of states (lookup failed or none known), both fields are typed in.
  const pickState = !!states.data?.length;
  const cities = usePlaces<string[]>(
    pickState && states.data!.some((s) => s.code === subdivision)
      ? `locations?country=${country}&state=${encodeURIComponent(subdivision)}`
      : null,
  );
  const pickCity =
    pickState && (!subdivision || cities.loading || !!cities.data?.length);
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
          <div className="flex gap-2">
            <NativeSelect
              aria-label={t("Country code")}
              className="w-32 shrink-0"
              autoComplete="tel-country-code"
              value={phoneCountry}
              onChange={(e) => {
                setPhoneCountry(e.target.value);
                setPhoneCountryChosen(true);
                updatePhone(e.target.value, localPhone);
              }}
            >
              <option value="">{t("Code")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} +{c.dial} {c.name}
                </option>
              ))}
            </NativeSelect>
            <Input
              {...a}
              className="min-w-0 flex-1"
              value={localPhone}
              onChange={(e) => {
                setLocalPhone(e.target.value);
                updatePhone(phoneCountry, e.target.value);
              }}
              onBlur={() => updatePhone(phoneCountry, localPhone, true)}
              inputMode="tel"
              autoComplete="tel-national"
            />
            <input type="hidden" {...register("phone")} />
          </div>
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
      <fieldset className="grid gap-4">
        <legend className="text-sm font-medium">{t("Billing address")}</legend>
        <div className="mt-3 grid gap-4">
          <Field label={t("Street address *")} error={message("addressLine")}>
            {(a) => (
              <Input
                {...a}
                {...register("addressLine")}
                autoComplete="street-address"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Country *")} error={message("country")}>
              {(a) => (
                <NativeSelect
                  {...a}
                  {...register("country", {
                    onChange: (e) => {
                      setValue("subdivision", "");
                      setValue("city", "");
                      if (!phoneCountryChosen && e.target.value) {
                        setPhoneCountry(e.target.value);
                        updatePhone(e.target.value, localPhone);
                      }
                    },
                  })}
                  autoComplete="country"
                >
                  <option value="">{t("Select country")}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field label={t("State or region")} error={message("subdivision")}>
              {(a) =>
                !country || states.loading || pickState ? (
                  <NativeSelect
                    {...a}
                    {...register("subdivision", {
                      onChange: () => setValue("city", ""),
                    })}
                    disabled={!pickState}
                    autoComplete="address-level1"
                  >
                    <option value="">
                      {!country
                        ? t("Select a country first")
                        : states.loading
                          ? t("Loading…")
                          : t("Select state or region")}
                    </option>
                    {states.data?.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    {...a}
                    {...register("subdivision")}
                    autoComplete="address-level1"
                  />
                )
              }
            </Field>
            <Field label={t("City *")} error={message("city")}>
              {(a) =>
                !country || states.loading || pickCity ? (
                  <NativeSelect
                    {...a}
                    {...register("city")}
                    disabled={!cities.data?.length}
                    autoComplete="address-level2"
                  >
                    <option value="">
                      {!country
                        ? t("Select a country first")
                        : states.loading || cities.loading
                          ? t("Loading…")
                          : !subdivision
                            ? t("Select a state or region first")
                            : t("Select city")}
                    </option>
                    {cities.data?.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    {...a}
                    {...register("city")}
                    autoComplete="address-level2"
                  />
                )
              }
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
          </div>
        </div>
      </fieldset>
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

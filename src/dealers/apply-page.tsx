import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { toast, Toaster } from "sonner";
import { phoneCodes } from "../shared/phone-codes";
import {
  applicationPhone,
  dealerApplicationForm,
  dealerApplicationInput,
  type DealerApplicationFormInput,
} from "../shared/schemas";
import { api } from "../shared/client";
import { localeFor, localizeDefault, type Vars } from "../shared/i18n";
import { LocaleProvider, localeProps, useI18n } from "../shared/i18n-react";
import { Button } from "../dashboard/components/ui/button";
import { readLoginEmail } from "../shared/wix-member";
import "../dashboard/styles.css";

function FieldError({ message }: { message?: string }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {t(message)}
    </p>
  );
}

function firstError(errors: FieldErrors<DealerApplicationFormInput>) {
  for (const error of Object.values(errors)) {
    if (error && "message" in error && typeof error.message === "string")
      return error.message;
  }
  return "Check the application.";
}

export default function ApplyPage({
  title = "Apply to sell vehicles",
}: {
  title?: string;
}) {
  return (
    <LocaleProvider>
      <ApplyPageInner title={title} />
    </LocaleProvider>
  );
}

function ApplyPageInner({
  title = "Apply to sell vehicles",
}: {
  title?: string;
}) {
  const { t, language } = useI18n();
  const heading = localizeDefault(language, title, "Apply to sell vehicles");
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [application, setApplication] = useState<ExistingApplication | null | undefined>(
    undefined,
  );
  const honeypot = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DealerApplicationFormInput>({
    resolver: zodResolver(dealerApplicationForm),
    defaultValues: {
      businessName: "",
      email: "",
      phoneCode: "",
      phoneNumber: "",
      location: "",
      address: "",
      website: "",
    },
  });
  useEffect(() => {
    let active = true;
    readLoginEmail()
      .then((value) => {
        if (!active) return;
        setEmail(value);
        if (value) setValue("email", value);
      })
      .catch((error) => {
        console.error("Could not read the logged-in member", error);
        if (active)
          setSessionError(
            "Could not check your account. Refresh the page and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [setValue]);
  const signedIn = Boolean(email);
  useEffect(() => {
    if (!signedIn) {
      setApplication(null);
      return;
    }
    let active = true;
    setApplication(undefined);
    api<ExistingApplication | null>("dealers?session=1")
      .then((next) => {
        if (active) setApplication(next);
      })
      .catch((error) => {
        console.error("Could not check an existing application", error);
        if (active) setApplication(null);
      });
    return () => {
      active = false;
    };
  }, [signedIn, email]);
  async function login() {
    setLoggingIn(true);
    try {
      const { authentication } = await import("@wix/site-members");
      await authentication.promptLogin({ mode: "login", modal: true });
      const value = await readLoginEmail();
      if (!value) {
        toast.error(t("Log in before applying to sell vehicles."));
        return;
      }
      setEmail(value);
      setValue("email", value);
      setSessionError("");
    } catch (error) {
      console.error("Member login was not completed", error);
      toast.error(t("Log in before applying to sell vehicles."));
    } finally {
      setLoggingIn(false);
    }
  }
  async function submit(values: DealerApplicationFormInput) {
    if (!email) {
      toast.error(t("Log in before applying to sell vehicles."));
      return;
    }
    const parsed = dealerApplicationInput.safeParse({
      businessName: values.businessName,
      email,
      phone: applicationPhone(values.phoneCode, values.phoneNumber),
      location: values.location,
      address: values.address,
      website: values.website,
    });
    if (!parsed.success) {
      toast.error(t(parsed.error.issues[0]?.message ?? "Check the application."));
      return;
    }
    setSending(true);
    try {
      const result = await api<{
        businessName: string;
        approvalState: string;
      }>("dealers", {
        action: "apply",
        payload: parsed.data,
        honeypot: honeypot.current?.value ?? "",
      });
      setName(result.businessName);
      setSubmitted(true);
    } catch (error) {
      toast.error(t((error as Error).message));
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="mx-auto max-w-xl px-5 py-12" {...localeProps(language)}>
      <Toaster richColors position="bottom-right" />
      <p className="text-xs uppercase tracking-[.15em] text-muted-foreground">
        {t("Dealership application")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{heading}</h1>
      {submitted ? (
        <section className="surface mt-8 p-6">
          <h2 className="section-heading">{t("Application received")}</h2>
          <p className="hint mt-3">
            {t(
              "{name} is pending approval. After the site owner approves it, open Add a vehicle while logged in with this account.",
              { name },
            )}
          </p>
        </section>
      ) : email === null && !sessionError ? (
        <div className="mt-8 flex justify-center" role="status">
          <LoaderCircle
            className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">{t("Checking your account")}</span>
        </div>
      ) : signedIn && application === undefined ? (
        <div className="mt-8 flex justify-center" role="status">
          <LoaderCircle
            className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">{t("Checking your application")}</span>
        </div>
      ) : application ? (
        <section className="surface mt-8 p-6">
          <h2 className="section-heading">{t("Application already received")}</h2>
          <p className="hint mt-3">
            {alreadyApplied(application.createdAt, t, language)}
          </p>
        </section>
      ) : !signedIn ? (
        <section className="surface mt-8 space-y-4 p-6">
          <h2 className="section-heading">{t("Log in to apply")}</h2>
          <p className="hint">
            {sessionError
              ? t(sessionError)
              : t(
                  "A site member account is required. After you log in, your email is filled in and cannot be changed.",
                )}
          </p>
          <Button
            type="button"
            disabled={loggingIn}
            pending={loggingIn}
            onClick={() => void login()}
          >
            {t("Log in")}
          </Button>
        </section>
      ) : (
        <form
          className="surface mt-8 space-y-4 p-6"
          noValidate
          onSubmit={handleSubmit(submit, (formErrors) => {
            toast.error(t(firstError(formErrors)));
          })}
        >
          <div>
            <label className="label" htmlFor="businessName">
              {t("Business name *")}
            </label>
            <input
              id="businessName"
              className="field"
              type="text"
              autoComplete="organization"
              aria-invalid={Boolean(errors.businessName)}
              {...register("businessName")}
            />
            <FieldError message={errors.businessName?.message} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              {t("Email *")}
            </label>
            <input
              id="email"
              className="field"
              type="text"
              inputMode="email"
              autoComplete="email"
              readOnly
              aria-readonly
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <label className="label" htmlFor="phoneNumber">
              {t("Phone")}
            </label>
            <div className="flex gap-2">
              <select
                id="phoneCode"
                className="field w-40 shrink-0"
                aria-label={t("Country code")}
                autoComplete="tel-country-code"
                aria-invalid={Boolean(errors.phoneCode)}
                {...register("phoneCode")}
              >
                <option value="">{t("Select code")}</option>
                {phoneCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.dial} {code.name}
                  </option>
                ))}
              </select>
              <input
                id="phoneNumber"
                className="field"
                type="text"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t("Phone number")}
                aria-invalid={Boolean(errors.phoneNumber)}
                {...register("phoneNumber")}
              />
            </div>
            <FieldError
              message={errors.phoneCode?.message ?? errors.phoneNumber?.message}
            />
          </div>
          <TextField
            id="location"
            label="Location"
            autoComplete="address-level2"
            error={errors.location?.message}
            registration={register("location")}
          />
          <TextField
            id="address"
            label="Address"
            autoComplete="street-address"
            error={errors.address?.message}
            registration={register("address")}
          />
          <TextField
            id="website"
            label="Website"
            inputMode="url"
            autoComplete="url"
            placeholder="https://"
            error={errors.website?.message}
            registration={register("website")}
          />
          <input
            ref={honeypot}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            name="company"
          />
          <Button disabled={sending} pending={sending}>
            {t("Submit application")}
          </Button>
        </form>
      )}
    </div>
  );
}

type ExistingApplication = {
  businessName: string;
  approvalState: "pending" | "approved" | "suspended" | "rejected";
  createdAt: string;
};

function alreadyApplied(
  createdAt: string,
  t: (key: string, vars?: Vars) => string,
  language: ReturnType<typeof useI18n>["language"],
) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return t("You already applied.");
  const formatted = new Intl.DateTimeFormat(localeFor(language), {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return t("You already applied on {date}.", { date: formatted });
}

function TextField({
  id,
  label,
  error,
  registration,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "autoComplete" | "inputMode" | "placeholder"
>) {
  const { t } = useI18n();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {t(label)}
      </label>
      <input
        id={id}
        className="field"
        type="text"
        aria-invalid={Boolean(error)}
        {...input}
        {...registration}
      />
      <FieldError message={error} />
    </div>
  );
}

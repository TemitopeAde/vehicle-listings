import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../shared/client";
import {
  inquiryForm,
  type InquiryFormInput,
  type InquiryFormValues,
} from "../shared/inquiries";
import { useI18n } from "../shared/i18n-react";
import type { Vehicle } from "../shared/schemas";
import { Button } from "./ui/button";
import { Alert } from "./ui/card";
import { FormField } from "./ui/form-field";
import { Checkbox, Input, NativeSelect, Textarea } from "./ui/input";

export function VehicleInquiryForm({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const key = useRef("");
  const honeypot = useRef<HTMLInputElement>(null);
  const consentErrorId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormInput, unknown, InquiryFormValues>({
    resolver: zodResolver(inquiryForm),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      kind: "",
      preferredDate: "",
      message: t("I’m interested in {title}. Please share more details.", {
        title: vehicle.title,
      }),
      consent: false,
    },
  });
  async function submit(values: InquiryFormValues) {
    if (!key.current) key.current = crypto.randomUUID();
    setFormError("");
    try {
      await api("inquiries", {
        ...values,
        vehicleId: vehicle._id,
        honeypot: honeypot.current?.value ?? "",
        idempotencyKey: key.current,
      });
      setSent(true);
    } catch (error) {
      setFormError((error as Error).message);
    }
  }
  if (sent)
    return (
      <Alert role="status">
        {t(
          "Your request has been received. The dealership can follow up using your contact details.",
        )}
      </Alert>
    );
  const error = (name: keyof InquiryFormInput) => {
    const message = errors[name]?.message;
    return message ? t(message) : undefined;
  };
  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
      <h4 className="font-semibold">{t("Ask about this vehicle")}</h4>
      <FormField label={t("Name")} error={error("name")}>
        {(props) => (
          <Input
            {...props}
            {...register("name")}
            autoComplete="name"
            aria-required
          />
        )}
      </FormField>
      <FormField label={t("Email")} error={error("email")}>
        {(props) => (
          <Input
            {...props}
            {...register("email")}
            type="email"
            autoComplete="email"
            aria-required
          />
        )}
      </FormField>
      <FormField label={t("Phone (optional)")} error={error("phone")}>
        {(props) => (
          <Input
            {...props}
            {...register("phone")}
            type="tel"
            autoComplete="tel"
          />
        )}
      </FormField>
      <FormField label={t("Request type")} error={error("kind")}>
        {(props) => (
          <NativeSelect {...props} {...register("kind")} aria-required>
            <option value="">{t("Select request type")}</option>
            <option value="inquiry">{t("General inquiry")}</option>
            <option value="test-drive">{t("Test drive")}</option>
            <option value="trade-in">{t("Trade-in")}</option>
          </NativeSelect>
        )}
      </FormField>
      <FormField
        label={t("Preferred date (optional)")}
        error={error("preferredDate")}
      >
        {(props) => (
          <Input {...props} {...register("preferredDate")} type="date" />
        )}
      </FormField>
      <FormField label={t("Message")} error={error("message")}>
        {(props) => (
          <Textarea
            {...props}
            {...register("message")}
            rows={4}
            aria-required
          />
        )}
      </FormField>
      <input
        ref={honeypot}
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />
      <div className="grid gap-1.5">
        <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <Checkbox
            {...register("consent")}
            aria-required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? consentErrorId : undefined}
          />
          {t(
            "I agree that the dealership may store my contact details and contact me about this vehicle.",
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
      <Button type="submit" disabled={isSubmitting} pending={isSubmitting}>
        {t("Send request")}
      </Button>
    </form>
  );
}

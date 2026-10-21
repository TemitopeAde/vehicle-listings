import { z } from "zod";
import { inquiryInput } from "./schemas";

export const inquiryForm = inquiryInput
  .omit({ vehicleId: true, honeypot: true, idempotencyKey: true })
  .extend({
    consent: z.boolean().pipe(inquiryInput.shape.consent),
    kind: z.string().pipe(inquiryInput.shape.kind.removeDefault()),
  });

export type InquiryFormInput = z.input<typeof inquiryForm>;
export type InquiryFormValues = z.output<typeof inquiryForm>;

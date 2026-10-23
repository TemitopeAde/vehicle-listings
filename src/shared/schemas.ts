import { z } from "zod";
import { currencySchema } from "./currencies";
import { languageSchema } from "./languages";
import { isWixMediaUrl, mediaLimits } from "./media";
import { isSamplePhotoPath } from "./sample-photos";
import { phoneCodes, phoneDial } from "./phone-codes";
import { bodyStyles, vehicleCategories } from "./vehicle-options";
export const statuses = [
  "draft",
  "published",
  "reserved",
  "sold",
  "archived",
  "deleted",
] as const;
export const statusSchema = z.enum(statuses);
export const mediaSchema = z
  .object({
    url: z
      .string()
      .refine(
        (v) =>
          isWixMediaUrl(v, "image") ||
          isSamplePhotoPath(v) ||
          v === "/media/demo-car.svg",
        "Choose a photo from this form.",
      ),
    alt: z.string().max(200).default(""),
    caption: z.string().max(200).default(""),
    fileId: z.string().min(1).max(1000).optional(),
    /** Attribution required by a sample photo's licence. */
    credit: z.string().max(200).optional(),
    creditUrl: z
      .string()
      .url()
      .refine(
        (v) => v.startsWith("https://commons.wikimedia.org/"),
        "Credit links must point to Wikimedia Commons",
      )
      .optional(),
  })
  .strict();
export const videoSchema = z
  .object({
    url: z
      .string()
      .refine(
        (v) => isWixMediaUrl(v, "video"),
        "Choose a video from this form.",
      ),
    fileId: z.string().min(1).max(1000).optional(),
    title: z.string().max(200).default(""),
    poster: z
      .string()
      .refine((v) => isWixMediaUrl(v, "image"), "Choose a photo from this form.")
      .optional(),
  })
  .strict();
const text = (max = 100) => z.string().trim().max(max).default("");
export const vehicleInput = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Enter a listing title.")
      .max(150),
    stockId: z.string().trim().max(40).default(""),
    vin: text(17).refine(
      (v) => !v || /^[A-HJ-NPR-Z0-9]{17}$/i.test(v),
      "VIN must contain 17 letters and digits, excluding I, O and Q",
    ),
    make: z.string().trim().min(1, "Select make.").max(60),
    model: z.string().trim().min(1, "Enter the model.").max(60),
    trim: text(),
    year: z
      .number()
      .int()
      .min(1886)
      // Read the clock per parse: Cloudflare Workers report 1970 while a module loads.
      .refine((year) => year <= new Date().getUTCFullYear() + 2, {
        message: "Select model year.",
      }),
    condition: z.enum(["used", "new", "certified"]).default("used"),
    mileage: z.number().min(0).max(10000000).default(0),
    mileageUnit: z.enum(["km", "mi"]).default("mi"),
    price: z.number().min(0).max(1e12),
    originalPrice: z.number().min(0).optional(),
    currency: currencySchema.default("USD"),
    negotiable: z.boolean().default(false),
    category: z.enum(vehicleCategories).default("car"),
    bodyStyle: z.enum(bodyStyles).default("Sedan"),
    // "None" is for trailers, which have no engine or gearbox.
    transmission: z
      .enum(["Automatic", "Manual", "Automated manual", "None"])
      .default("Automatic"),
    fuel: z
      .enum(["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "None"])
      .default("Petrol"),
    drivetrain: text(),
    engineSize: text(),
    horsepower: z.number().min(0).max(3000).default(0),
    doors: z.number().int().min(0).max(8).default(4),
    seats: z.number().int().min(0).max(20).default(5),
    /** Lorries and trailers: axle count, gross vehicle weight and payload in kg, length in metres. */
    axles: z.number().int().min(0).max(12).default(0),
    grossWeight: z.number().min(0).max(250000).default(0),
    payload: z.number().min(0).max(250000).default(0),
    bodyLength: z.number().min(0).max(40).default(0),
    exteriorColor: text(),
    interiorColor: text(),
    emissionClass: text(),
    firstRegistration: text(10),
    dealerId: z.string().trim().max(100).default(""),
    location: text(),
    description: text(12000),
    features: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    highlights: z.array(z.string().max(200)).max(12).default([]),
    badges: z.array(z.string().max(40)).max(6).default([]),
    media: z.array(mediaSchema).max(mediaLimits.image).default([]),
    videos: z.array(videoSchema).max(mediaLimits.video).default([]),
    featured: z.boolean().default(false),
    seoTitle: text(70),
    seoDescription: text(170),
    expiresAt: z.string().datetime().nullable().default(null),
    taxDisclaimer: text(300),
  })
  .strict();
export const vehicleSchema = vehicleInput
  .extend({
    _id: z.string(),
    slug: z.string(),
    status: statusSchema,
    demo: z.boolean().default(false),
    createdAt: z.string(),
    updatedAt: z.string(),
    publishedAt: z.string().nullable().default(null),
    version: z.number().int().default(1),
  })
  .strip();
export type Vehicle = z.infer<typeof vehicleSchema>;
export type VehicleInput = z.infer<typeof vehicleInput>;
export const dealerInput = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    email: z.union([z.string().email(), z.literal("")]).default(""),
    phone: z
      .string()
      .max(40)
      .refine(
        (v) => !v || /^\+?[\d ()-]{7,40}$/.test(v),
        "Enter a valid phone number",
      )
      .default(""),
    whatsapp: z
      .string()
      .max(30)
      .refine(
        (v) => !v || /^\+?\d{7,15}$/.test(v),
        "Use an international phone number",
      )
      .default(""),
    address: text(250),
    location: text(),
    website: z
      .union([
        z
          .string()
          .url()
          .refine((v) => v.startsWith("https://"), "Use an HTTPS address"),
        z.literal(""),
      ])
      .default(""),
    description: text(3000),
    hours: text(500),
    approvalState: z
      .enum(["pending", "approved", "suspended", "rejected"])
      .default("pending"),
  })
  .strict();
export const dealerApplicationInput = dealerInput
  .omit({ approvalState: true })
  .extend({
    email: z.string().trim().email().max(150),
  })
  .strict();

const applicationText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

/** Fields on the dealership application form, before they are sent to the API. */
export const dealerApplicationForm = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, "Enter the business name.")
      .max(120, "Business name must be 120 characters or fewer."),
    email: z
      .string()
      .trim()
      .min(1, "Enter an email address.")
      .max(150, "Email must be 150 characters or fewer.")
      .pipe(z.email("Enter a valid email address.")),
    phoneCode: z.string(),
    phoneNumber: z
      .string()
      .trim()
      .max(20, "Phone number must be 20 characters or fewer."),
    location: applicationText(100, "Location"),
    address: applicationText(250, "Address"),
    website: z
      .string()
      .trim()
      .max(300, "Website must be 300 characters or fewer.")
      .refine(
        (value) => !value || /^https:\/\/\S+$/.test(value),
        "Use an HTTPS address, like https://example.com.",
      ),
  })
  .superRefine((value, ctx) => {
    if (!value.phoneNumber) return;
    if (!phoneCodes.some((code) => code.id === value.phoneCode))
      ctx.addIssue({
        code: "custom",
        path: ["phoneCode"],
        message: "Choose a country code.",
      });
    const digits = value.phoneNumber.replace(/\D/g, "");
    if (!/^[\d ()-]+$/.test(value.phoneNumber) || digits.length < 6 || digits.length > 15)
      ctx.addIssue({
        code: "custom",
        path: ["phoneNumber"],
        message: "Enter a valid phone number.",
      });
  });
export type DealerApplicationFormInput = z.input<typeof dealerApplicationForm>;

/** International number stored on the dealer, built from the code and the local number. */
export function applicationPhone(code: string, number: string) {
  const local = number.trim();
  if (!local) return "";
  return `${phoneDial(code)} ${local}`;
}
export const dealerSchema = dealerInput
  .extend({
    _id: z.string(),
    /** Private key for the dealer's own listing page. */
    accessToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .or(z.literal(""))
      .default(""),
    /** Site member who applied. Empty on dealerships created before account matching. */
    memberId: z.string().default(""),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type Dealer = z.infer<typeof dealerSchema>;
export const inquiryInput = z
  .object({
    vehicleId: z.string().min(1),
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(150),
    phone: text(40),
    message: z.string().trim().min(10).max(3000),
    consent: z.literal(true),
    kind: z.enum(["inquiry", "test-drive", "trade-in"]).default("inquiry"),
    preferredDate: text(40),
    honeypot: z.string().max(0).default(""),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export const inquirySchema = inquiryInput
  .omit({ honeypot: true, idempotencyKey: true })
  .extend({
    _id: z.string(),
    dealerId: z.string(),
    status: z.enum(["new", "contacted", "qualified", "closed"]).default("new"),
    notes: text(3000),
    confirmationEmailStatus: z.enum(["pending", "queued", "failed"]).default("pending"),
    confirmationTransmissionId: text(100),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type Inquiry = z.infer<typeof inquirySchema>;
export const filtersSchema = z
  .object({
    search: text(120),
    status: z.union([statusSchema, z.literal("")]).default(""),
    make: text(60),
    model: text(60),
    condition: text(20),
    location: text(100),
    category: z.union([z.enum(vehicleCategories), z.literal("")]).default(""),
    bodyStyle: text(30),
    fuel: text(30),
    transmission: text(30),
    dealerId: text(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minYear: z.coerce.number().int().optional(),
    maxYear: z.coerce.number().int().optional(),
    minMileage: z.coerce.number().min(0).optional(),
    maxMileage: z.coerce.number().min(0).optional(),
    featured: z
      .preprocess(
        (v) => (typeof v === "string" ? v === "true" : v),
        z.boolean(),
      )
      .optional(),
    sort: z
      .enum(["recent", "price-asc", "price-desc", "year-desc"])
      .default("recent"),
    cursor: z.coerce.number().int().min(0).max(100000).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type Filters = z.infer<typeof filtersSchema>;
export const themeSchema = z
  .object({
    brandName: z.string().min(1).max(100),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    radius: z.number().min(0).max(32),
    columns: z.number().int().min(1).max(4),
    fontFamily: z.enum(["system-ui", "Georgia", "Trebuchet MS"]),
    detailBasePath: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/),
    currency: currencySchema,
    language: languageSchema,
  })
  .strict();
export type Theme = z.infer<typeof themeSchema>;
export const defaultTheme: Theme = {
  brandName: "Autohaus",
  accent: "#196947",
  radius: 12,
  columns: 3,
  fontFamily: "system-ui",
  detailBasePath: "/cars",
  currency: "USD",
  language: "en",
};

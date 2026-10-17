import { z } from "zod";

export const currencyOptions = [
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "NGN", label: "NGN — Nigerian naira" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "INR", label: "INR — Indian rupee" },
  { value: "ZAR", label: "ZAR — South African rand" },
  { value: "GHS", label: "GHS — Ghanaian cedi" },
  { value: "KES", label: "KES — Kenyan shilling" },
  { value: "AED", label: "AED — UAE dirham" },
  { value: "JPY", label: "JPY — Japanese yen" },
  { value: "CNY", label: "CNY — Chinese yuan" },
  { value: "CHF", label: "CHF — Swiss franc" },
  { value: "SAR", label: "SAR — Saudi riyal" },
] as const;

export const currencySchema = z.enum(currencyOptions.map(({ value }) => value));

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import "../storefront.css";
export const cn = (...values: ClassValue[]) => twMerge(clsx(values));

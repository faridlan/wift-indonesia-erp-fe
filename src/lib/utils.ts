import { clsx, type ClassValue } from "clsx";
import { format } from "path";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: string) {
  if (!value) return "";
  const numberString = value.replace(/[^,\d]/g, ""); // Remove non-digits
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Add dots
}

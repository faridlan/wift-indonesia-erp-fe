import { clsx, type ClassValue } from "clsx";
import { format } from "path";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: string) {
  if (!value) return "";
  const numberString = value.replace(/[^,\d]/g, "");
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Compact rupiah: 1500000 → "1,5jt", 500000 → "500rb", 1500 → "1.500" */
export function compactRupiah(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (num >= 1_000) return `${(num / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return num.toLocaleString("id-ID");
}

/** Short status label for desktop */
export function shortStatus(status: string | null): string {
  switch (status) {
    case "completed": return "DONE";
    case "processing": return "PROC";
    case "pending": return "PEND";
    default: return (status || "-").toUpperCase().slice(0, 4);
  }
}

/** Format date to dd/MM */
export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

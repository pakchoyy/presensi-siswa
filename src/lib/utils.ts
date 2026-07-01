import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function formatTanggalPendek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

export function formatTanggalPanjang(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function inisial(nama: string): string {
  return nama
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function timestamp(): number {
  return Date.now();
}

export function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getMonthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function getMonthsInRange(start: string, end: string): string[] {
  const months: string[] = [];
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= endDate) {
    months.push(
      current.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    );
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

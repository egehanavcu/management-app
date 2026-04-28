import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDueDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function getInitials(name?: string | null): string {
  if (!name?.trim()) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length >= 2
      ? (parts[0][0] + parts[0][1]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

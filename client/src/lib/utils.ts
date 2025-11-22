import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null): string {
  if (!amount) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatFrequency(days: number | null): string {
  if (!days) return "N/A";
  if (days === 1) return "Daily";
  if (days === 7) return "Weekly";
  if (days === 14) return "Bi-weekly";
  if (days === 30) return "Monthly";
  return `Every ${days} days`;
}

export function getLoyaltyScoreColor(score: number): "low" | "medium" | "high" {
  if (score < 4) return "low";
  if (score < 7) return "medium";
  return "high";
}

export function getLoyaltyScoreWidth(score: number): number {
  return Math.min(Math.max(score * 10, 5), 100);
}

export function generateInitials(name: string): string {
  if (!name) return "";

  return name
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0))
    .slice(0, 1) // Take only the first initial
    .join("")
    .toUpperCase();
}

export function getAvatarGradient(name: string): string {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-green-400 to-green-600",
    "from-red-400 to-red-600",
    "from-yellow-400 to-yellow-600",
    "from-pink-400 to-pink-600",
    "from-indigo-400 to-indigo-600",
    "from-orange-400 to-orange-600",
  ];

  const index = name.charCodeAt(0) % colors.length;
  return `bg-gradient-to-br ${colors[index]}`;
}

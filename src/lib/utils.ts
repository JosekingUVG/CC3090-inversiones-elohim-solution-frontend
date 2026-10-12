import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isDarkBg(bgColor: string): boolean {
  if (!bgColor) return false;
  if (bgColor === "transparent") return false;
  if (bgColor.startsWith("#")) {
    const hex = bgColor.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 128;
    }
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 128;
    }
  }
  return false;
}

export function safeHexColor(val?: unknown, fallback = "#FFFFFF"): string {
  if (typeof val !== "string" || !val) return fallback;
  const trimmed = val.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return fallback;
}

export function safeBackgroundImage(url?: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("url(") ||
    trimmed.startsWith("linear-gradient(") ||
    trimmed.startsWith("radial-gradient(")
  ) {
    return trimmed;
  }
  const clean = trimmed.replace(/"/g, "%22");
  return `url("${clean}")`;
}
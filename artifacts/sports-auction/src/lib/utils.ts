import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auction_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Converts any Google Drive sharing/view URL to a direct embeddable thumbnail URL.
 * Handles all common formats:
 *   drive.google.com/file/d/ID/view  →  lh3.googleusercontent.com/d/ID
 *   drive.google.com/open?id=ID      →  lh3.googleusercontent.com/d/ID
 *   drive.google.com/uc?id=ID        →  lh3.googleusercontent.com/d/ID
 * Non-Drive URLs are returned unchanged.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname !== 'drive.google.com') return url;

    let fileId: string | null = null;

    const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (pathMatch) {
      fileId = pathMatch[1];
    } else {
      fileId = u.searchParams.get('id');
    }

    if (!fileId) return url;
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  } catch {
    return url;
  }
}

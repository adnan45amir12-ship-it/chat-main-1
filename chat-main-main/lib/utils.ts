import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentTimestamp(): number {
  return Date.now();
}

export function formatTime(timestamp?: number, createdAt?: number): string {
  const ts = timestamp || createdAt || 0;
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(timestamp?: number, createdAt?: number): string {
  const ts = timestamp || createdAt || 0;
  if (!ts) return '';
  return new Date(ts).toLocaleString();
}

/**
 * Safe localStorage reader with corrupt-JSON fallback & automatic single-key recovery
 */
export function getSafeLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Corrupted localStorage key "${key}", safely resetting:`, err);
    try {
      localStorage.removeItem(key);
    } catch {}
    return fallback;
  }
}

/**
 * Safe localStorage writer
 */
export function setSafeLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed writing to localStorage key "${key}":`, err);
  }
}

/**
 * Safe localStorage remover
 */
export function removeSafeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (err) {}
}

/**
 * Generates a unique client message ID for deduplication
 */
export function generateClientMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

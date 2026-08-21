import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Standard RFC4122 v4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function normalizePlayerNameKey(nombre?: string, apellidos?: string): string {
  const cleanStr = (str?: string) =>
    (str || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, ' ');

  const n = cleanStr(nombre);
  let a = cleanStr(apellidos);
  if (a === 'marta pulido' || a === 'marta pulido ') a = 'pulido';

  const combined = `${n} ${a}`.trim();
  const words = combined.split(' ').filter(Boolean);
  const uniqueWords = words.filter((w, idx) => words.indexOf(w) === idx);
  return uniqueWords.join(' ');
}

export function isPlayerMatch(
  p1?: { id?: string | null; nombre?: string | null; apellidos?: string | null } | null,
  p2?: { id?: string | null; nombre?: string | null; apellidos?: string | null } | null
): boolean {
  if (!p1 || !p2) return false;
  if (p1.id && p2.id && p1.id === p2.id) return true;
  const k1 = normalizePlayerNameKey(p1.nombre || '', p1.apellidos || '');
  const k2 = normalizePlayerNameKey(p2.nombre || '', p2.apellidos || '');
  if (k1 && k2 && k1 === k2) return true;
  return false;
}

export function isDummyUnsplashPhoto(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('images.unsplash.com/photo-') && (
    url.includes('1534528741775') ||
    url.includes('1517841905240') ||
    url.includes('1524504388940') ||
    url.includes('1544005313') ||
    url.includes('1494790108377') ||
    url.includes('1508214751196') ||
    url.includes('1529626455594') ||
    url.includes('1531746020798')
  );
}

export function cleanPhotoUrl(url?: string | null): string {
  if (!url) return '';
  if (isDummyUnsplashPhoto(url)) return '';
  return url.trim();
}


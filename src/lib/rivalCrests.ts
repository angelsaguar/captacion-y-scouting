import React from 'react';
import { saveSessionFile, getSessionFile, deleteSessionFile } from './fileStorage';

export interface RivalCrest {
  id: string;
  nombre: string;
  nombreNormalizado: string;
  escudoUrl: string;
  updatedAt: number;
}

const META_STORAGE_KEY = 'ud_lapoveda_rival_crests_meta';
const PREFIX_IDB = 'rival_crest_';

// Normalize team name for flexible case-insensitive and accent-insensitive matching
export function normalizeRivalKey(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .replace(/[^a-z0-9]/g, ''); // keep only alphanumeric
}

// Generate team initials (e.g. "A.D. Arganda" -> "ADA", "COSLADA" -> "COS")
export function getRivalInitials(name: string): string {
  if (!name) return 'RIV';
  const clean = name.trim().replace(/[._-]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  }
  return clean.substring(0, 3).toUpperCase();
}

// In-memory memory cache
const memoryCache = new Map<string, string>();
let isInitialized = false;

// Default initial crests for well-known rivals in the league (clean SVG data URLs)
export const DEFAULT_RIVAL_CRESTS: Record<string, { color: string; initials: string; svg: string }> = {
  coslada: {
    color: '#dc2626',
    initials: 'CD C',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23ef4444"/><stop offset="100%" stop-color="%23991b1b"/></linearGradient></defs><path d="M50 5 L88 22 C88 65 50 95 50 95 C50 95 12 65 12 22 Z" fill="url(%23g)" stroke="%23ffffff" stroke-width="4"/><path d="M50 12 L80 25 C80 60 50 85 50 85 C50 85 20 60 20 25 Z" fill="none" stroke="%23fef08a" stroke-width="2"/><circle cx="50" cy="46" r="18" fill="%23ffffff"/><path d="M50 34 L53 43 L62 43 L55 49 L58 58 L50 52 L42 58 L45 49 L38 43 L47 43 Z" fill="%23dc2626"/><text x="50" y="74" font-family="sans-serif" font-weight="900" font-size="11" fill="%23ffffff" text-anchor="middle" letter-spacing="0.5">COSLADA</text></svg>`
  },
  adarganda: {
    color: '#2563eb',
    initials: 'ADA',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%23dc2626"/><stop offset="50%" stop-color="%23ffffff"/><stop offset="100%" stop-color="%232563eb"/></linearGradient></defs><path d="M50 5 L88 22 C88 65 50 95 50 95 C50 95 12 65 12 22 Z" fill="url(%23g2)" stroke="%23ffffff" stroke-width="4"/><text x="50" y="44" font-family="sans-serif" font-weight="900" font-size="16" fill="%230f172a" text-anchor="middle">A.D.</text><text x="50" y="66" font-family="sans-serif" font-weight="900" font-size="13" fill="%23ffffff" text-anchor="middle">ARGANDA</text></svg>`
  },
  fcrivasvaciamadrid: {
    color: '#16a34a',
    initials: 'RIV',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2316a34a"/><stop offset="100%" stop-color="%2314532d"/></linearGradient></defs><path d="M50 5 L88 22 C88 65 50 95 50 95 C50 95 12 65 12 22 Z" fill="url(%23g3)" stroke="%23facc15" stroke-width="4"/><circle cx="50" cy="42" r="16" fill="%23ffffff"/><text x="50" y="48" font-family="sans-serif" font-weight="900" font-size="14" fill="%2315803d" text-anchor="middle">RIVAS</text><text x="50" y="74" font-family="sans-serif" font-weight="900" font-size="10" fill="%23facc15" text-anchor="middle">VACIAMADRID</text></svg>`
  }
};

// Reads metadata list from localStorage
function getStoredMetaList(): RivalCrest[] {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Writes metadata list to localStorage
function saveStoredMetaList(list: RivalCrest[]): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save rival crests meta list to localStorage:', e);
  }
}

// Synchronously query cache
export function getRivalCrestSync(rivalName: string): string | null {
  if (!rivalName) return null;
  const key = normalizeRivalKey(rivalName);
  if (!key) return null;

  // 1. Check in-memory map
  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null;
  }

  // 2. Check meta list in localStorage
  const list = getStoredMetaList();
  const match = list.find(item => item.nombreNormalizado === key || key.includes(item.nombreNormalizado) || item.nombreNormalizado.includes(key));
  if (match && match.escudoUrl) {
    memoryCache.set(key, match.escudoUrl);
    return match.escudoUrl;
  }

  // 3. Fallback to default SVGs
  const defaultEntry = DEFAULT_RIVAL_CRESTS[key];
  if (defaultEntry) {
    memoryCache.set(key, defaultEntry.svg);
    return defaultEntry.svg;
  }

  return null;
}

// Asynchronously load all rival crests, hydrating from IndexedDB
export async function getAllRivalCrests(): Promise<RivalCrest[]> {
  const metaList = getStoredMetaList();
  
  // Hydrate with full image data from IndexedDB
  const hydrated = await Promise.all(
    metaList.map(async (item) => {
      if (item.escudoUrl && item.escudoUrl.length > 50) {
        memoryCache.set(item.nombreNormalizado, item.escudoUrl);
        return item;
      }
      const stored = await getSessionFile(PREFIX_IDB + item.id);
      if (stored && stored.dataUrl) {
        memoryCache.set(item.nombreNormalizado, stored.dataUrl);
        return {
          ...item,
          escudoUrl: stored.dataUrl
        };
      }
      return item;
    })
  );

  return hydrated;
}

// Retrieve single crest asynchronously
export async function getRivalCrest(rivalName: string): Promise<string | null> {
  const syncVal = getRivalCrestSync(rivalName);
  if (syncVal) return syncVal;

  const key = normalizeRivalKey(rivalName);
  const list = getStoredMetaList();
  const found = list.find(item => item.nombreNormalizado === key || key.includes(item.nombreNormalizado) || item.nombreNormalizado.includes(key));
  
  if (found) {
    const stored = await getSessionFile(PREFIX_IDB + found.id);
    if (stored?.dataUrl) {
      memoryCache.set(key, stored.dataUrl);
      return stored.dataUrl;
    }
  }

  return null;
}

// Save or update a rival crest
export async function saveRivalCrest(nombre: string, escudoUrl: string): Promise<RivalCrest> {
  const cleanNombre = nombre.trim();
  const key = normalizeRivalKey(cleanNombre);
  if (!cleanNombre || !key) {
    throw new Error('El nombre del equipo rival no es válido.');
  }

  const list = getStoredMetaList();
  const existingIndex = list.findIndex(item => item.nombreNormalizado === key);
  const id = existingIndex >= 0 ? list[existingIndex].id : 'rc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const newRecord: RivalCrest = {
    id,
    nombre: cleanNombre,
    nombreNormalizado: key,
    escudoUrl,
    updatedAt: Date.now()
  };

  // 1. Save heavy base64 to IndexedDB
  await saveSessionFile({
    id: PREFIX_IDB + id,
    nombre: `Escudo_${cleanNombre}`,
    tamano: `${Math.round(escudoUrl.length / 1024)} KB`,
    tipo: escudoUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png',
    dataUrl: escudoUrl
  });

  // 2. Update memory cache
  memoryCache.set(key, escudoUrl);

  // 3. Update localStorage metadata (keep dataUrl for small images or when space permits)
  if (existingIndex >= 0) {
    list[existingIndex] = newRecord;
  } else {
    list.unshift(newRecord);
  }

  try {
    saveStoredMetaList(list);
  } catch (e) {
    // If localStorage quota is reached, strip dataUrl from localStorage list
    const lightweightList = list.map(item => ({
      ...item,
      escudoUrl: item.id === id ? escudoUrl : ''
    }));
    saveStoredMetaList(lightweightList);
  }

  // Notify listeners across the application
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ud_lapoveda_rival_crests_updated', {
      detail: { rival: cleanNombre, key, escudoUrl }
    }));
  }

  return newRecord;
}

// Delete a rival crest
export async function deleteRivalCrest(idOrName: string): Promise<void> {
  const key = normalizeRivalKey(idOrName);
  const list = getStoredMetaList();
  const target = list.find(item => item.id === idOrName || item.nombreNormalizado === key);

  if (target) {
    await deleteSessionFile(PREFIX_IDB + target.id);
    memoryCache.delete(target.nombreNormalizado);
    const updated = list.filter(item => item.id !== target.id);
    saveStoredMetaList(updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ud_lapoveda_rival_crests_updated', {
        detail: { rival: target.nombre, key: target.nombreNormalizado, escudoUrl: null }
      }));
    }
  }
}

// Custom React hook for auto-updating rival crests in components
export function useRivalCrests() {
  const [crests, setCrests] = React.useState<RivalCrest[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadCrests = React.useCallback(async () => {
    try {
      const data = await getAllRivalCrests();
      setCrests(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCrests();

    const handleUpdate = () => {
      loadCrests();
    };

    window.addEventListener('ud_lapoveda_rival_crests_updated', handleUpdate);
    return () => {
      window.removeEventListener('ud_lapoveda_rival_crests_updated', handleUpdate);
    };
  }, [loadCrests]);

  return {
    crests,
    loading,
    refresh: loadCrests,
    saveCrest: saveRivalCrest,
    deleteCrest: deleteRivalCrest
  };
}

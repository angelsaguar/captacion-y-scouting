import { supabase } from './supabase';
import { Observer } from '@/types';
import { generateUUID } from './utils';

const LOCAL_STORAGE_KEY = 'ud_lapoveda_observers_backup';

function normalizeName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Default built-in observers to ensure the list is never completely empty
const DEFAULT_OBSERVERS: Observer[] = [
  { id: 'def-1', nombre: 'Ángel Saguar', created_at: new Date().toISOString() },
  { id: 'def-2', nombre: 'Alejandro Saguar', created_at: new Date().toISOString() },
  { id: 'def-3', nombre: 'Javier Asensio', created_at: new Date().toISOString() },
  { id: 'def-4', nombre: 'Scout UD La Poveda', created_at: new Date().toISOString() }
];

export async function getObservers(): Promise<Observer[]> {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let localList: Observer[] = [];
  if (cached) {
    try {
      localList = JSON.parse(cached);
    } catch {
      localList = [...DEFAULT_OBSERVERS];
    }
  } else {
    localList = [...DEFAULT_OBSERVERS];
  }

  let dbItems: Observer[] = [];
  try {
    const { data, error } = await supabase
      .from('observers')
      .select('*')
      .order('nombre');

    if (!error && data && data.length > 0) {
      dbItems = data;
    }
  } catch (error) {
    console.warn('Could not fetch observers from Supabase:', error);
  }

  // Combine DB items and local items
  const combined = [...dbItems];

  // Add local items if they aren't in DB yet
  for (const loc of localList) {
    const normLoc = normalizeName(loc.nombre);
    if (!combined.some(item => normalizeName(item.nombre) === normLoc || item.id === loc.id)) {
      combined.push(loc);
    }
  }

  // Ensure defaults are present if not found
  for (const defObs of DEFAULT_OBSERVERS) {
    const normDef = normalizeName(defObs.nombre);
    if (!combined.some(item => normalizeName(item.nombre) === normDef)) {
      combined.push(defObs);
    }
  }

  // Deduplicate by normalized name keeping the best/most complete entry
  const seenMap = new Map<string, Observer>();
  for (const item of combined) {
    const norm = normalizeName(item.nombre);
    if (!seenMap.has(norm)) {
      seenMap.set(norm, item);
    } else {
      const existing = seenMap.get(norm)!;
      // Prefer items with foto_url, proper accents (Ángel vs Angel), or full names
      if (!existing.foto_url && item.foto_url) {
        seenMap.set(norm, item);
      } else if (!existing.nombre.includes('Á') && item.nombre.includes('Á')) {
        seenMap.set(norm, item);
      }
    }
  }

  const finalDeduplicated = Array.from(seenMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Save clean deduplicated list to local storage
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalDeduplicated));

  return finalDeduplicated;
}

export async function addObserver(nombre: string, foto_url?: string): Promise<Observer> {
  const trimmedName = nombre.trim();
  if (!trimmedName) throw new Error('El nombre del observador no puede estar vacío');

  const norm = normalizeName(trimmedName);
  const existingList = await getObservers();
  if (existingList.some(o => normalizeName(o.nombre) === norm)) {
    throw new Error('Ya existe un observador con este nombre');
  }

  const newId = generateUUID();
  const newObserver: Observer = {
    id: newId,
    nombre: trimmedName,
    foto_url,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('observers')
      .insert([{ id: newId, nombre: trimmedName, foto_url: foto_url || null }])
      .select()
      .single();

    if (!error && data) {
      await getObservers();
      return data;
    }
  } catch (error) {
    console.warn('Exception inserting observer into Supabase:', error);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Observer[] = [];
  if (cached) {
    try { list = JSON.parse(cached); } catch {}
  }
  list.push(newObserver);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  await getObservers();
  return newObserver;
}

export async function deleteObserver(id: string): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let localList: Observer[] = [];
  if (cached) {
    try { localList = JSON.parse(cached); } catch {}
  }
  
  const target = localList.find(o => o.id === id);
  const targetNorm = target ? normalizeName(target.nombre) : null;

  try {
    // Delete from Supabase by ID if UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      await supabase.from('observers').delete().eq('id', id);
    }

    // Delete any DB rows matching this target name or normalized name to clean up duplicates
    const { data: dbItems } = await supabase.from('observers').select('id, nombre');
    if (dbItems && dbItems.length > 0) {
      const idsToDelete = dbItems
        .filter(item => item.id === id || (targetNorm && normalizeName(item.nombre) === targetNorm))
        .map(item => item.id);
        
      if (idsToDelete.length > 0) {
        await supabase.from('observers').delete().in('id', idsToDelete);
      }
    }
  } catch (err) {
    console.warn('Error deleting observer from Supabase:', err);
  }

  // Delete from local cache
  localList = localList.filter(o => {
    if (o.id === id) return false;
    if (targetNorm && normalizeName(o.nombre) === targetNorm) return false;
    return true;
  });

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  return true;
}

export async function updateObserver(id: string, nombre: string, foto_url?: string): Promise<Observer> {
  const trimmedName = nombre.trim();
  if (!trimmedName) throw new Error('El nombre del observador no puede estar vacío');

  try {
    const updatePayload: any = { nombre: trimmedName };
    if (foto_url !== undefined) {
      updatePayload.foto_url = foto_url || null;
    }

    const { data, error } = await supabase
      .from('observers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      await getObservers();
      return data;
    }
  } catch (error) {
    console.error('Exception updating observer in Supabase:', error);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Observer[] = [];
  if (cached) {
    try { list = JSON.parse(cached); } catch { list = DEFAULT_OBSERVERS; }
  }

  const index = list.findIndex(o => o.id === id);
  if (index === -1) {
    throw new Error('No se encontró el scouter para editar');
  }

  const updatedObj = { ...list[index], nombre: trimmedName };
  if (foto_url !== undefined) {
    updatedObj.foto_url = foto_url || undefined;
  }
  
  list[index] = updatedObj;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  await getObservers();
  return list[index];
}

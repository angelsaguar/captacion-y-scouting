import { supabase } from './supabase';
import { Need } from '@/types';
import { generateUUID } from './utils';

const LOCAL_STORAGE_KEY = 'ud_lapoveda_needs_backup';

const DEFAULT_NEEDS: Need[] = [
  {
    id: 'need-1',
    equipo: 'Aficionado A',
    posicion: 'DELANTERO',
    solicitante: 'Ángel Saguar',
    observaciones: 'Buscamos un nueve de área de referencia físico y con buen juego de espaldas.',
    created_at: new Date().toISOString()
  },
  {
    id: 'need-2',
    equipo: 'Juvenil A',
    posicion: 'EXTREMO',
    solicitante: 'Entrenador Juvenil A',
    observaciones: 'Extremo potente por banda derecha para encarar y jugar a pie cambiado.',
    created_at: new Date().toISOString()
  }
];

export async function getNeeds(): Promise<Need[]> {
  try {
    const { data, error } = await supabase
      .from('needs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Preserve local entries that might have failed to insert into Supabase
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      let localNeeds: Need[] = [];
      if (cached) {
        try {
          localNeeds = JSON.parse(cached);
        } catch {}
      }
      
      const remoteIds = new Set(data.map(n => n.id));
      const unsynced = localNeeds.filter(n => !remoteIds.has(n.id));
      
      const merged = [...data, ...unsynced];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } else {
      console.warn('Supabase returned error or empty for needs:', error);
    }
  } catch (error) {
    console.warn('Could not fetch needs from Supabase, falling back to localStorage:', error);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return DEFAULT_NEEDS;
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_NEEDS));
  return DEFAULT_NEEDS;
}

export async function addNeed(
  equipo: string,
  posicion: string,
  solicitante: string,
  observaciones?: string,
  created_by?: string
): Promise<Need> {
  const trimmedEquipo = equipo.trim();
  const trimmedSolicitante = solicitante.trim();
  if (!trimmedEquipo) throw new Error('El equipo solicitante es obligatorio');
  if (!posicion) throw new Error('La posición solicitada es obligatoria');
  if (!trimmedSolicitante) throw new Error('La persona solicitante es obligatoria');

  const newId = generateUUID();

  const newNeed: Need = {
    id: newId,
    equipo: trimmedEquipo,
    posicion,
    solicitante: trimmedSolicitante,
    observaciones: observaciones?.trim() || '',
    created_by,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('needs')
      .insert([newNeed])
      .select()
      .single();

    if (!error && data) {
      await getNeeds();
      return data;
    }
    
    // Fallback if foreign key violation
    if (error) {
      console.warn('Supabase insert need failed. Error info:', error);
      
      const isFkViolation = error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('violates foreign key');
      if (isFkViolation) {
        console.warn('Retrying need insert without created_by field...');
        const retryNeed: any = { ...newNeed };
        delete retryNeed.created_by;
        
        const { data: retryData, error: retryError } = await supabase
          .from('needs')
          .insert([retryNeed])
          .select()
          .single();
          
        if (!retryError && retryData) {
          await getNeeds();
          return {
            ...newNeed,
            ...retryData
          };
        }
      }
    }
  } catch (err) {
    console.warn('Exception inserting need to Supabase:', err);
  }

  // Local fallback insert
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Need[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      list = DEFAULT_NEEDS;
    }
  } else {
    list = DEFAULT_NEEDS;
  }

  const updated = [newNeed, ...list];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return newNeed;
}

export async function updateNeed(
  id: string,
  equipo: string,
  posicion: string,
  solicitante: string,
  observaciones?: string
): Promise<Need> {
  const trimmedEquipo = equipo.trim();
  const trimmedSolicitante = solicitante.trim();
  if (!trimmedEquipo) throw new Error('El equipo solicitante es obligatorio');
  if (!posicion) throw new Error('La posición es obligatoria');
  if (!trimmedSolicitante) throw new Error('La persona solicitante es obligatoria');

  const updatePayload = {
    equipo: trimmedEquipo,
    posicion,
    solicitante: trimmedSolicitante,
    observaciones: observaciones?.trim() || ''
  };

  try {
    const { data, error } = await supabase
      .from('needs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      await getNeeds();
      return data;
    }
    if (error) {
      console.warn('Supabase update need failed, using fallback:', error);
    }
  } catch (err) {
    console.warn('Exception updating need in Supabase:', err);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Need[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      list = DEFAULT_NEEDS;
    }
  } else {
    list = DEFAULT_NEEDS;
  }

  const index = list.findIndex(n => n.id === id);
  if (index === -1) {
    throw new Error('No se encontró la necesidad para actualizar');
  }

  const updatedNeed = {
    ...list[index],
    ...updatePayload
  };

  list[index] = updatedNeed;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return updatedNeed;
}

export async function deleteNeed(id: string): Promise<boolean> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    try {
      const { error } = await supabase
        .from('needs')
        .delete()
        .eq('id', id);

      if (!error) {
        await getNeeds().catch(() => {});
      } else {
        console.warn('Supabase error while deleting need:', error);
      }
    } catch (err) {
      console.warn('Failed deleting need from Supabase:', err);
    }
  } else {
    console.info('Skipping Supabase delete because ID is not a valid UUID:', id);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const list: Need[] = JSON.parse(cached);
      const filtered = list.filter(n => n.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

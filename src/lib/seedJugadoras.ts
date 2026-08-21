import { supabase } from '@/lib/supabase';
import { JUGADORAS_ADJUNTAS } from '@/data/jugadorasData';
import { CLUB_TEAMS } from '@/types';
import { cleanPhotoUrl, isDummyUnsplashPhoto } from '@/lib/utils';

export async function syncJugadorasToDatabaseAndLocalStorage() {
  try {
    // 1. Purge legacy dummy unsplash avatar photos from local storage
    try {
      const localScoutingSaved = localStorage.getItem('scouting_local_players');
      if (localScoutingSaved) {
        const scList: any[] = JSON.parse(localScoutingSaved);
        let scChanged = false;
        const cleanedScList = scList.map(p => {
          if (p.foto_url && isDummyUnsplashPhoto(p.foto_url)) {
            scChanged = true;
            return { ...p, foto_url: '' };
          }
          return p;
        });
        if (scChanged) {
          localStorage.setItem('scouting_local_players', JSON.stringify(cleanedScList));
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('team_roster_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list: any[] = JSON.parse(raw);
            let rosterChanged = false;
            const cleanedRoster = list.map(p => {
              if (p.foto_url && isDummyUnsplashPhoto(p.foto_url)) {
                rosterChanged = true;
                return { ...p, foto_url: '' };
              }
              return p;
            });
            if (rosterChanged) {
              localStorage.setItem(k, JSON.stringify(cleanedRoster));
            }
          }
        }
      }
    } catch (cleanErr) {
      console.warn('Error during legacy photo purge:', cleanErr);
    }

    // 2. Clear any dummy unsplash photos in remote Supabase
    try {
      const { data: dbPlayersWithUnsplash } = await supabase
        .from('players')
        .select('id, foto_url')
        .ilike('foto_url', '%unsplash%');

      if (dbPlayersWithUnsplash && dbPlayersWithUnsplash.length > 0) {
        for (const p of dbPlayersWithUnsplash) {
          if (isDummyUnsplashPhoto(p.foto_url)) {
            await supabase
              .from('players')
              .update({ foto_url: null })
              .eq('id', p.id);
          }
        }
      }
    } catch (remoteCleanErr) {
      console.warn('Could not clean remote unsplash placeholders:', remoteCleanErr);
    }

    const isAlreadySeeded = localStorage.getItem('app_seeded_jugadoras_init_v2');
    if (isAlreadySeeded) {
      return;
    }

    console.log('Iniciando inicialización de las 15 jugadoras...');

    const officialRoster = JUGADORAS_ADJUNTAS.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      apellidos: j.apellidos,
      dorsal: j.dorsal,
      posicion: j.posicion,
      foto_url: '',
      anio_nacimiento: j.anio_nacimiento,
      fecha_nacimiento: j.fecha_nacimiento,
      lateralidad: j.lateralidad || 'Derecho',
      estado_fisico: 'Disponible',
      email: `${j.nombre.toLowerCase().replace(/\s+/g, '')}@povedafemenino.es`
    }));

    // Team keys to sync in localStorage
    const teamsToPopulate = Array.from(new Set([
      'SENIOR FEMENINO',
      'Sénior Femenino',
      'Femenino A',
      'Femenino B',
      CLUB_TEAMS[0]
    ]));

    for (const team of teamsToPopulate) {
      const rosterKey = `team_roster_${team}`;
      const existing = localStorage.getItem(rosterKey);
      if (!existing || JSON.parse(existing).length === 0) {
        localStorage.setItem(rosterKey, JSON.stringify(officialRoster));
      }
    }

    // 2. Sync initial records to Supabase `players` table only if empty
    try {
      const { data: existingDbPlayers } = await supabase
        .from('players')
        .select('id')
        .limit(1);

      if (!existingDbPlayers || existingDbPlayers.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();

        const payloads = JUGADORAS_ADJUNTAS.map((j) => ({
          id: j.id,
          nombre: j.nombre,
          apellidos: j.apellidos,
          posicion: j.posicion,
          dorsal: j.dorsal,
          lateralidad: j.lateralidad || 'Derecho',
          anio_nacimiento: j.anio_nacimiento,
          fecha_nacimiento: j.fecha_nacimiento,
          foto_url: null,
          estado: 'Fichado',
          potencial: j.potencial,
          equipo_actual: j.equipo_actual || 'UD La Poveda',
          equipo_asignado: 'SENIOR FEMENINO',
          created_by: user?.id || undefined,
          observaciones: `Posición principal: ${j.posicion_detalle}. Fecha nacimiento: ${j.fecha_nacimiento}`
        }));

        for (const payload of payloads) {
          try {
            const { error } = await supabase.from('players').upsert(payload);
            if (error) {
              const { fecha_nacimiento, equipo_asignado, ...fallback } = payload;
              await supabase.from('players').upsert(fallback);
            }
          } catch (err) {
            console.warn('Error seeding player to Supabase:', payload.nombre, err);
          }
        }
      }
    } catch (e) {
      console.warn('Supabase initial seed check failover:', e);
    }

    localStorage.setItem('app_seeded_jugadoras_init_v2', 'true');
    console.log('Inicialización completada con éxito.');
  } catch (err) {
    console.error('Error durante la inicialización de jugadoras:', err);
  }
}



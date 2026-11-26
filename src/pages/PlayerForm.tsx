import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { 
  Player, 
  POSITION_ATTRIBUTES, 
  PlayerStatus, 
  ContactType, 
  Lateralidad,
  Observer,
  CLUB_TEAMS,
  POSITION_STRUCTURED_ATTRIBUTES,
  COMMON_ATTRIBUTES,
  getPositionAttributes,
  getPositionStructuredAttributes
} from '@/types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Loader2,
  Calendar as CalendarIcon,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, normalizePlayerNameKey, cleanPhotoUrl, isPlayerMatch } from '@/lib/utils';
import { getObservers, addObserver } from '@/lib/observers';
import { JUGADORAS_ADJUNTAS } from '@/data/jugadorasData';
import { syncAllClubDataWithFirestore } from '@/lib/clubAccessAndSync';

const playerSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().nullable().optional(),
  apodo: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  contacto_tipo: z.string().nullable().optional(),
  equipo_actual: z.string().nullable().optional(),
  equipo_asignado: z.string().nullable().optional(),
  dorsal: z.string().nullable().optional(),
  posicion: z.string().min(1, 'Posición requerida'),
  posicion_secundaria: z.string().nullable().optional(),
  lateralidad: z.string().nullable().optional(),
  anio_nacimiento: z.union([z.number(), z.string()]).nullable().optional(),
  fecha_nacimiento: z.string().nullable().optional(),
  foto_url: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  motivos_rechazo: z.string().nullable().optional(),
  fecha_seguimiento: z.string().nullable().optional(),
  potencial: z.union([z.number(), z.string()]).nullable().optional(),
  estado: z.string().nullable().optional(),
  observador: z.string().nullable().optional(),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

function getRatingLabel(val: number): string {
  switch (val) {
    case 0: return 'Muy deficiente';
    case 1: return 'Deficiente';
    case 2: return 'Mejorable';
    case 3: return 'Correcto';
    case 4: return 'Bueno';
    case 5: return 'Excelente';
    default: return 'Sin valorar';
  }
}

export default function PlayerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [attributes, setAttributes] = useState<Record<string, number>>({});
  const [photo, setPhoto] = useState<File | null>(null);

  // States for dynamic Observers list and mini form
  const [observers, setObservers] = useState<Observer[]>([]);
  const [isAddingObs, setIsAddingObs] = useState(false);
  const [newObsName, setNewObsName] = useState('');
  const [loadingObs, setLoadingObs] = useState(false);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      apodo: '',
      posicion: 'CENTRAL',
      potencial: 3,
      estado: 'Observado',
      contacto_tipo: 'Padre',
      lateralidad: 'Derecho',
      anio_nacimiento: new Date().getFullYear() - 15,
      observador: '',
      equipo_asignado: '',
      email: '',
    },
  });

  const selectedPosition = form.watch('posicion');

  useEffect(() => {
    if (id && user && user.role !== 'admin' && user.role !== 'scout') {
      toast.error('No tienes permisos para editar jugadores.');
      navigate('/players');
    }
  }, [id, user, navigate]);

  useEffect(() => {
    async function loadObserversList() {
      try {
        const list = await getObservers();
        setObservers(list);
      } catch (err) {
        console.error('Failed to load observers list:', err);
      }
    }
    loadObserversList();
  }, []);

  useEffect(() => {
    if (id) {
      async function fetchPlayer() {
        try {
          let loadedPlayer: any = null;
          let dbAttributes: any[] = [];

          try {
            const { data: player } = await supabase
              .from('players')
              .select('*, attributes:player_attributes(*)')
              .eq('id', id)
              .maybeSingle();

            if (player) {
              loadedPlayer = player;
              if (Array.isArray(player.attributes)) {
                dbAttributes = [...player.attributes];
              }
            }
          } catch (e) {
            console.warn('Could not fetch player from remote Supabase:', e);
          }

          // Check local scouting players for latest edits
          const localScoutingSaved = localStorage.getItem('scouting_local_players');
          let localPlayerRecord: any = null;
          if (localScoutingSaved) {
            try {
              const list = JSON.parse(localScoutingSaved);
              const loadedKey = loadedPlayer ? normalizePlayerNameKey(loadedPlayer.nombre, loadedPlayer.apellidos) : '';
              localPlayerRecord = list.find((p: any) => 
                p.id === id || 
                (p.id && id && String(p.id).toLowerCase() === String(id).toLowerCase()) ||
                (loadedKey && normalizePlayerNameKey(p.nombre, p.apellidos) === loadedKey) ||
                normalizePlayerNameKey(p.nombre, p.apellidos) === normalizePlayerNameKey(id, '')
              );
            } catch {}
          }

          if (localPlayerRecord) {
            const mergedAttrs =
              Array.isArray(localPlayerRecord.attributes) && localPlayerRecord.attributes.length > 0
                ? localPlayerRecord.attributes
                : dbAttributes;
            loadedPlayer = loadedPlayer
              ? { ...loadedPlayer, ...localPlayerRecord, attributes: mergedAttrs }
              : { ...localPlayerRecord, attributes: mergedAttrs };
          }

          // Check team rosters if not found yet or to recover attributes
          let rosterMatchRecord: any = null;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('team_roster_')) {
              try {
                const r = JSON.parse(localStorage.getItem(k) || '[]');
                const loadedKey = loadedPlayer ? normalizePlayerNameKey(loadedPlayer.nombre, loadedPlayer.apellidos) : '';
                const match = r.find((p: any) => 
                  p.id === id || 
                  (loadedKey && normalizePlayerNameKey(p.nombre, p.apellidos) === loadedKey) ||
                  normalizePlayerNameKey(p.nombre, p.apellidos) === normalizePlayerNameKey(id, '')
                );
                if (match) {
                  rosterMatchRecord = match;
                  if (!loadedPlayer) {
                    loadedPlayer = { ...match, estado: 'Fichado' };
                  }
                  break;
                }
              } catch {}
            }
          }

          if (!loadedPlayer) {
            const official = JUGADORAS_ADJUNTAS.find(j => j.id === id);
            if (official) {
              loadedPlayer = {
                ...official,
                estado: 'Fichado',
                equipo_asignado: 'SENIOR FEMENINO'
              };
            }
          }

          if (loadedPlayer) {
            // Collect attributes from all available persistence layers
            const candidateIds = new Set<string>([String(id)]);
            if (loadedPlayer.id) candidateIds.add(String(loadedPlayer.id));
            if (localPlayerRecord?.id) candidateIds.add(String(localPlayerRecord.id));
            if (rosterMatchRecord?.id) candidateIds.add(String(rosterMatchRecord.id));

            let remoteTableAttrRows: any[] = [];
            try {
              const { data: directAttrs } = await supabase
                .from('player_attributes')
                .select('*')
                .eq('player_id', id);
              if (Array.isArray(directAttrs) && directAttrs.length > 0) {
                remoteTableAttrRows = [...directAttrs];
              }
            } catch {}

            let localTableAttrRows: any[] = [];
            try {
              const rawLocalAttrTable = localStorage.getItem('ud_lapoveda_table_player_attributes');
              if (rawLocalAttrTable) {
                const parsedAttrTable = JSON.parse(rawLocalAttrTable);
                if (Array.isArray(parsedAttrTable)) {
                  localTableAttrRows = parsedAttrTable.filter(
                    (a: any) => a && candidateIds.has(String(a.player_id ?? ''))
                  );
                }
              }
            } catch {}

            const pos = loadedPlayer.posicion || 'CENTRAL';
            const posAttributes = getPositionAttributes(pos);
            const attrs: Record<string, number> = {};
            posAttributes.forEach((attrName) => {
              attrs[attrName] = 0;
            });

            const applyAttrArray = (arr?: any[], allowZeroOverwrite = true) => {
              if (!Array.isArray(arr)) return;
              arr.forEach((a: any) => {
                if (a && a.atributo && !String(a.atributo).includes(':')) {
                  const numVal = typeof a.valor === 'number' ? a.valor : Number(a.valor);
                  if (!Number.isNaN(numVal)) {
                    if (allowZeroOverwrite || numVal > 0 || !(attrs[a.atributo] > 0)) {
                      attrs[a.atributo] = numVal;
                    }
                  }
                }
              });
            };

            // Remote Supabase layers first, then local storage layers with highest priority
            applyAttrArray(dbAttributes, false);
            applyAttrArray(remoteTableAttrRows, false);
            applyAttrArray(rosterMatchRecord?.attributes, true);
            applyAttrArray(localPlayerRecord?.attributes, true);
            applyAttrArray(localTableAttrRows, true);

            const sanitizedFotoUrl = cleanPhotoUrl(loadedPlayer.foto_url);
            form.reset({
              nombre: loadedPlayer.nombre,
              apellidos: loadedPlayer.apellidos || '',
              apodo: loadedPlayer.apodo || '',
              telefono: loadedPlayer.telefono || '',
              email: loadedPlayer.email || '',
              contacto_tipo: loadedPlayer.contacto_tipo as any || 'Tutor',
              equipo_actual: loadedPlayer.equipo_actual || '',
              equipo_asignado: loadedPlayer.equipo_asignado || '',
              dorsal: loadedPlayer.dorsal || '',
              posicion: pos,
              posicion_secundaria: loadedPlayer.posicion_secundaria || '',
              lateralidad: loadedPlayer.lateralidad as any || 'Derecho',
              anio_nacimiento: loadedPlayer.anio_nacimiento,
              fecha_nacimiento: loadedPlayer.fecha_nacimiento || '',
              foto_url: sanitizedFotoUrl,
              observaciones: loadedPlayer.observaciones || '',
              fecha_seguimiento: loadedPlayer.fecha_seguimiento || '',
              potencial: loadedPlayer.potencial || 3,
              estado: loadedPlayer.estado as any || 'Observado',
              observador: loadedPlayer.observador || '',
            });

            setAttributes(attrs);
            form.setValue('motivos_rechazo', loadedPlayer.motivos_rechazo || '');
          } else {
            toast.error('Jugador no encontrado');
          }
        } catch (error) {
          toast.error('Error al cargar jugador');
        } finally {
          setFetching(false);
        }
      }
      fetchPlayer();
    }
  }, [id]);

  useEffect(() => {
    // Ensure attributes for the selected position exist without overwriting already loaded values
    const currentAttrs = getPositionAttributes(selectedPosition);
    setAttributes((prev) => {
      const next = { ...prev };
      currentAttrs.forEach((attr) => {
        if (next[attr] === undefined) {
          next[attr] = 0;
        }
      });
      return next;
    });
  }, [selectedPosition]);

  useEffect(() => {
    const currentAttrs = getPositionAttributes(selectedPosition);
    const ratedVals = currentAttrs
      .map(attr => attributes[attr])
      .filter(val => val !== undefined && val !== null && val > 0);
    
    if (ratedVals.length > 0) {
      const sum = ratedVals.reduce((acc, v) => acc + v, 0);
      const average = sum / ratedVals.length;
      const roundedPotential = Math.max(1, Math.min(5, Math.round(average)));
      form.setValue('potencial', roundedPotential);
    } else {
      form.setValue('potencial', 3);
    }
  }, [attributes, selectedPosition]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 350;
          const MAX_HEIGHT = 350;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
              form.setValue('foto_url', dataUrl);
            } catch (err) {
              console.error('Canvas processing error', err);
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: PlayerFormValues) => {
    if (id && user?.role !== 'admin' && user?.role !== 'scout') {
      toast.error('No tienes permisos para editar jugadores.');
      return;
    }
    setLoading(true);
    try {
      let finalFotoUrl: string | null = null;

      if (photo) {
        toast.info('Subiendo imagen...');
        const fileExt = photo.name.split('.').pop() || 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `player-photos/${fileName}`;

        // Attempt upload to 'avatars' bucket
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, photo, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.warn('Storage Upload Error, using Base64 local fallback:', uploadError);
          finalFotoUrl = values.foto_url?.trim() || null;
          toast.success('Imagen guardada en formato optimizado local');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          
          finalFotoUrl = publicUrl;
          toast.success('Imagen subida al servidor correctamente');
        }
      } else {
        finalFotoUrl = values.foto_url?.trim() ? values.foto_url.trim() : null;
      }

      const activePosition = values.posicion || selectedPosition || 'CENTRAL';
      const currentAttrs = Array.from(
        new Set([
          ...getPositionAttributes(activePosition),
          ...COMMON_ATTRIBUTES.flatMap((g) => g.items),
          ...Object.keys(attributes),
        ])
      );
      const ratedVals = currentAttrs
        .map((attr) => (typeof attributes[attr] === 'number' ? attributes[attr] : Number(attributes[attr]) || 0))
        .filter((val) => val > 0);
      const calculatedPotential =
        ratedVals.length > 0
          ? Math.max(1, Math.min(5, Math.round(ratedVals.reduce((acc, v) => acc + v, 0) / ratedVals.length)))
          : Number(values.potencial) || 3;

      const playerPayload = {
        ...values,
        apellidos: (values.apellidos || '').trim(),
        posicion: activePosition,
        potencial: calculatedPotential,
        apodo: values.apodo?.trim() || null,
        posicion_secundaria: values.posicion_secundaria?.trim() || null,
        foto_url: finalFotoUrl,
        fecha_seguimiento: values.fecha_seguimiento || null,
        telefono: values.telefono?.trim() || null,
        email: values.email?.trim() || null,
        equipo_actual: values.equipo_actual?.trim() || null,
        dorsal: values.dorsal?.trim() || null,
        observaciones: values.observaciones || null,
        motivos_rechazo: values.motivos_rechazo || null,
        anio_nacimiento: values.anio_nacimiento ? Number(values.anio_nacimiento) || null : null,
        fecha_nacimiento: values.fecha_nacimiento?.trim() || null,
        observador: values.observador?.trim() || null,
        es_plantilla: false,
        origen: 'scouting',
      };

      let playerId = id;

      try {
        const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        const targetDbId = isUuid ? id : (playerId || crypto.randomUUID());

        const payloadToUpsert = {
          id: targetDbId,
          ...playerPayload
        };

        const { error } = await supabase
          .from('players')
          .upsert(payloadToUpsert);

        if (error) throw error;
        playerId = targetDbId;
      } catch (dbError: any) {
        console.warn('Database insert/update error in PlayerForm, using fallback strategy:', dbError);
        
        const { 
          fecha_nacimiento, 
          apodo, 
          equipo_asignado, 
          observador, 
          email, 
          contacto_tipo, 
          fecha_seguimiento, 
          motivos_rechazo, 
          ...fallbackPayload 
        } = playerPayload;
        
        try {
          const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
          const targetDbId = isUuid ? id : (playerId || crypto.randomUUID());
          const { error: retryError } = await supabase
            .from('players')
            .upsert({ id: targetDbId, ...fallbackPayload });
          if (retryError) throw retryError;
          playerId = targetDbId;
        } catch (secondaryError) {
          console.warn('Secondary DB failover failed, saving to local scouting storage:', secondaryError);
          playerId = playerId || id || crypto.randomUUID();
        }
      }

      const targetId = id || playerId || crypto.randomUUID();
      const effectiveDbPlayerId = playerId || targetId;

      const attributePayloads = currentAttrs.map((attr) => ({
        id: `attr_${targetId}_${attr}`,
        player_id: targetId,
        atributo: attr,
        valor: typeof attributes[attr] === 'number' ? attributes[attr] : Number(attributes[attr]) || 0,
      }));

      // Ensure local scouting storage includes this player AND its 0-5 technical/tactical attributes
      const finalPlayerRecord = {
        id: targetId,
        ...playerPayload,
        foto_url: finalFotoUrl || '',
        attributes: attributePayloads,
        created_at: new Date().toISOString()
      };
      
      const localScoutingSaved = localStorage.getItem('scouting_local_players');
      let localScoutingList: any[] = localScoutingSaved ? JSON.parse(localScoutingSaved) : [];
      const normKey = normalizePlayerNameKey(finalPlayerRecord.nombre, finalPlayerRecord.apellidos);
      const localIdx = localScoutingList.findIndex((p: any) => 
        (targetId && p.id === targetId) || 
        (id && p.id === id) || 
        normalizePlayerNameKey(p.nombre, p.apellidos) === normKey
      );
      if (localIdx >= 0) {
        const preservedId = localScoutingList[localIdx].id || targetId;
        const normalizedAttrs = attributePayloads.map((a) => ({
          ...a,
          id: `attr_${preservedId}_${a.atributo}`,
          player_id: preservedId,
        }));
        localScoutingList[localIdx] = { 
          ...localScoutingList[localIdx], 
          ...finalPlayerRecord, 
          id: preservedId,
          attributes: normalizedAttrs,
        };
      } else {
        localScoutingList.push(finalPlayerRecord);
      }
      localStorage.setItem('scouting_local_players', JSON.stringify(localScoutingList));

      // Mirror player record into local fallback table ud_lapoveda_table_players
      try {
        const rawLocalPlayers = localStorage.getItem('ud_lapoveda_table_players');
        const localPlayersTable: any[] = rawLocalPlayers ? JSON.parse(rawLocalPlayers) : [];
        const pIdx = localPlayersTable.findIndex(
          (p: any) =>
            String(p?.id ?? '') === String(targetId) ||
            String(p?.id ?? '') === String(effectiveDbPlayerId) ||
            normalizePlayerNameKey(p?.nombre, p?.apellidos) === normKey
        );
        if (pIdx >= 0) {
          localPlayersTable[pIdx] = {
            ...localPlayersTable[pIdx],
            ...finalPlayerRecord,
            id: localPlayersTable[pIdx].id || targetId,
          };
        } else {
          localPlayersTable.push(finalPlayerRecord);
        }
        localStorage.setItem('ud_lapoveda_table_players', JSON.stringify(localPlayersTable));
      } catch {}

      // Remove any scouting deletion flags for this player
      const scoutingDelSaved = localStorage.getItem('scouting_deleted_players');
      if (scoutingDelSaved) {
        try {
          const scoutingDelList: string[] = JSON.parse(scoutingDelSaved);
          const cleaned = scoutingDelList.filter(item => item !== finalPlayerRecord.id && item !== `${finalPlayerRecord.nombre} ${finalPlayerRecord.apellidos}`.toLowerCase());
          localStorage.setItem('scouting_deleted_players', JSON.stringify(cleaned));
        } catch {}
      }

      // Upsert attributes into Supabase (remote or local client)
      if (effectiveDbPlayerId) {
        try {
          const dbAttrPayloads = currentAttrs.map((attr) => ({
            player_id: effectiveDbPlayerId,
            atributo: attr,
            valor: typeof attributes[attr] === 'number' ? attributes[attr] : Number(attributes[attr]) || 0,
          }));

          if (id) {
            await supabase.from('player_attributes').delete().eq('player_id', id);
          }
          if (effectiveDbPlayerId !== id) {
            await supabase.from('player_attributes').delete().eq('player_id', effectiveDbPlayerId);
          }
          await supabase.from('player_attributes').upsert(dbAttrPayloads);
        } catch (attrErr) {
          console.warn('Could not save player attributes to remote DB:', attrErr);
        }
      }

      // Sync to ALL local team rosters and collect any roster player IDs
      const pId = targetId;
      const allPlayerIdsForAttrs = new Set<string>([String(targetId), String(effectiveDbPlayerId)]);
      const isMatchingPlayer = (p: any) => 
        isPlayerMatch(p, { id: pId, nombre: playerPayload.nombre, apellidos: playerPayload.apellidos });

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('team_roster_')) {
          try {
            const rawRoster = localStorage.getItem(k);
            if (rawRoster) {
              const currentR = JSON.parse(rawRoster);
              let rChanged = false;
              const mappedR = currentR.map((p: any) => {
                if (isMatchingPlayer(p)) {
                  rChanged = true;
                  if (p.id) allPlayerIdsForAttrs.add(String(p.id));
                  return {
                    ...p,
                    nombre: playerPayload.nombre,
                    apellidos: playerPayload.apellidos,
                    posicion: playerPayload.posicion || p.posicion,
                    posicion_secundaria: playerPayload.posicion_secundaria || p.posicion_secundaria,
                    dorsal: playerPayload.dorsal || p.dorsal,
                    foto_url: finalFotoUrl || '',
                    telefono: playerPayload.telefono || p.telefono,
                    email: playerPayload.email || p.email,
                    estado: playerPayload.estado,
                    potencial: calculatedPotential,
                    attributes: attributePayloads,
                    anio_nacimiento: playerPayload.anio_nacimiento || p.anio_nacimiento,
                    fecha_nacimiento: playerPayload.fecha_nacimiento || p.fecha_nacimiento
                  };
                }
                return p;
              });
              if (rChanged) {
                localStorage.setItem(k, JSON.stringify(mappedR));
              }
            }
          } catch {}
        }
      }

      // Sync to local team roster strictly according to estado ('Fichado')
      const targetTeam = playerPayload.equipo_asignado || 'SENIOR FEMENINO';
      const rosterKey = `team_roster_${targetTeam}`;
      const savedRoster = localStorage.getItem(rosterKey);
      let rosterArr: any[] = savedRoster ? JSON.parse(savedRoster) : [];

      if (playerPayload.estado === 'Fichado') {
        const deletedKey = `team_deleted_players_${targetTeam}`;
        const deletedSaved = localStorage.getItem(deletedKey);
        if (deletedSaved) {
          try {
            const teamDelList: { id?: string; fullName: string }[] = JSON.parse(deletedSaved);
            const cleanedTeamDel = teamDelList.filter(dp => 
              dp.id !== pId && 
              dp.fullName !== `${playerPayload.nombre} ${playerPayload.apellidos}`.toLowerCase()
            );
            localStorage.setItem(deletedKey, JSON.stringify(cleanedTeamDel));
          } catch {}
        }

        const exists = rosterArr.some(isMatchingPlayer);
        if (exists) {
          rosterArr = rosterArr.map((p: any) => {
            if (isMatchingPlayer(p)) {
              const rId = p.id || pId;
              allPlayerIdsForAttrs.add(String(rId));
              return {
                ...p,
                id: rId,
                nombre: playerPayload.nombre,
                apellidos: playerPayload.apellidos,
                posicion: playerPayload.posicion || p.posicion,
                posicion_secundaria: playerPayload.posicion_secundaria || p.posicion_secundaria,
                dorsal: playerPayload.dorsal || p.dorsal,
                foto_url: finalFotoUrl || '',
                telefono: playerPayload.telefono || p.telefono,
                email: playerPayload.email || p.email,
                potencial: calculatedPotential,
                attributes: attributePayloads,
                origen: (p as any).origen || 'scouting'
              };
            }
            return p;
          });
        } else {
          const newRosterId = pId || crypto.randomUUID();
          allPlayerIdsForAttrs.add(String(newRosterId));
          rosterArr.push({
            id: newRosterId,
            nombre: playerPayload.nombre,
            apellidos: playerPayload.apellidos,
            dorsal: playerPayload.dorsal || (rosterArr.length + 1).toString(),
            posicion: playerPayload.posicion,
            posicion_secundaria: playerPayload.posicion_secundaria || undefined,
            foto_url: finalFotoUrl || '',
            anio_nacimiento: playerPayload.anio_nacimiento || 2005,
            lateralidad: playerPayload.lateralidad || 'Derecho',
            telefono: playerPayload.telefono || '',
            email: playerPayload.email || '',
            potencial: calculatedPotential,
            attributes: attributePayloads,
            estado_fisico: 'Disponible',
            origen: 'scouting'
          });
        }
        localStorage.setItem(rosterKey, JSON.stringify(rosterArr));
      } else {
        const filteredRoster = rosterArr.filter((p: any) => !(isMatchingPlayer(p) && p.origen === 'scouting'));
        localStorage.setItem(rosterKey, JSON.stringify(filteredRoster));
      }

      // Explicitly persist 0-5 technical/tactical attributes in ud_lapoveda_table_player_attributes for all matching IDs
      try {
        const rawAttrTable = localStorage.getItem('ud_lapoveda_table_player_attributes');
        const currentAttrTable: any[] = rawAttrTable ? JSON.parse(rawAttrTable) : [];
        // Keep period-prefixed evaluations (e.g., Septiembre:...) and attributes for other players
        const retainedAttrs = currentAttrTable.filter((row: any) => {
          if (!row) return false;
          const isThisPlayer = allPlayerIdsForAttrs.has(String(row.player_id ?? ''));
          if (!isThisPlayer) return true;
          // Retain period-prefixed stats/attributes from Plantilla evaluations
          return String(row.atributo ?? '').includes(':');
        });

        const newAttrEntries: any[] = [];
        allPlayerIdsForAttrs.forEach((pid) => {
          currentAttrs.forEach((attr) => {
            newAttrEntries.push({
              id: `attr_${pid}_${attr}`,
              player_id: pid,
              atributo: attr,
              valor: typeof attributes[attr] === 'number' ? attributes[attr] : Number(attributes[attr]) || 0,
              updated_at: new Date().toISOString(),
            });
          });
        });

        localStorage.setItem(
          'ud_lapoveda_table_player_attributes',
          JSON.stringify([...retainedAttrs, ...newAttrEntries])
        );
      } catch (e) {
        console.warn('Error syncing local player_attributes table:', e);
      }

      window.dispatchEvent(new CustomEvent('player-updated', { detail: finalPlayerRecord }));
      window.dispatchEvent(new Event('storage'));

      // Push updated player, attributes, and roster data to Firestore cloud sync
      syncAllClubDataWithFirestore({ direction: 'push' }).catch((err) => {
        console.warn('Background Firestore sync after player update:', err);
      });

      toast.success(id ? 'Jugador actualizado' : 'Jugador registrado');
      navigate('/players');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white italic">{id ? 'Editar Jugador' : 'Nuevo Jugador'}</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Completa los datos del prospecto para el informe técnico.</p>
        </div>
      </div>

      <form 
        onSubmit={form.handleSubmit(
          onSubmit, 
          (errors) => { 
            console.warn('Form submission validation error:', errors); 
            const firstField = Object.keys(errors)[0]; 
            toast.error(`Revisa los campos obligatorios (${firstField || 'formulario'})`); 
          }
        )} 
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <Card className="md:col-span-2 border-none shadow-sm premium-card">
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" {...form.register('nombre')} placeholder="Ej: Juan" className="bg-slate-800/40 border-slate-700" />
                  {form.formState.errors.nombre && <p className="text-xs text-red-500">{form.formState.errors.nombre.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input id="apellidos" {...form.register('apellidos')} placeholder="Ej: García Pérez" className="bg-slate-800/40 border-slate-700" />
                  {form.formState.errors.apellidos && <p className="text-xs text-red-500">{form.formState.errors.apellidos.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apodo">Apodo / Nombre Deportivo</Label>
                  <Input id="apodo" {...form.register('apodo')} placeholder="Ej: 'Pedri', 'Gavi'" className="bg-slate-800/40 border-slate-700 text-emerald-400 font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipo_actual">Equipo Actual</Label>
                  <Input id="equipo_actual" {...form.register('equipo_actual')} placeholder="Club de procedencia" className="bg-slate-800/40 border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipo_asignado">Equipo Asignado del Club</Label>
                  <Select 
                    value={form.watch('equipo_asignado') || 'none'} 
                    onValueChange={(val) => form.setValue('equipo_asignado', val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="bg-slate-800/40 border-slate-700 text-left">
                      <SelectValue placeholder="Sin asignar (Ninguno)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Sin asignar --</SelectItem>
                      {CLUB_TEAMS.map(team => (
                        <SelectItem key={team} value={team}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dorsal">Dorsal</Label>
                  <Input id="dorsal" {...form.register('dorsal')} placeholder="Nº" className="bg-slate-800/40 border-slate-700" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Posición Principal</Label>
                  <Select 
                    value={form.watch('posicion')} 
                    onValueChange={(val) => form.setValue('posicion', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(POSITION_ATTRIBUTES).map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-cyan-400">Segunda Posición (Opcional)</Label>
                  <Select 
                    value={form.watch('posicion_secundaria') || 'none'} 
                    onValueChange={(val) => form.setValue('posicion_secundaria', val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="border-cyan-500/30 text-cyan-300">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">-- Ninguna / Sin segunda posición --</SelectItem>
                      {Object.keys(POSITION_ATTRIBUTES).map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lateralidad</Label>
                  <Select 
                    value={form.watch('lateralidad')} 
                    onValueChange={(val: any) => form.setValue('lateralidad', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Derecho">Derecho</SelectItem>
                      <SelectItem value="Izquierdo">Izquierdo</SelectItem>
                      <SelectItem value="Ambidiestro">Ambidiestro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Año de Nacimiento</Label>
                  <Input 
                    type="number" 
                    {...form.register('anio_nacimiento')} 
                  />
                </div>
              </div>

              <div className="space-y-4 text-center pt-4">
                <div className="space-y-1">
                  <Label className="text-sm font-bold uppercase tracking-widest text-slate-500 block">Potencial Estimado (1-5)</Label>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block">
                    Calculado automáticamente como la media de sus valoraciones
                  </span>
                </div>
                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black transition-all border cursor-default",
                        form.watch('potencial') === val 
                          ? cn(
                              "text-white shadow-lg scale-110",
                              val === 1 && "bg-red-600 border-red-500 shadow-red-900/40",
                              val === 2 && "bg-orange-600 border-orange-500 shadow-orange-900/40",
                              val === 3 && "bg-yellow-600 border-yellow-500 shadow-yellow-900/40",
                              val === 4 && "bg-lime-600 border-lime-500 shadow-lime-900/40",
                              val === 5 && "bg-emerald-600 border-emerald-500 shadow-emerald-900/40"
                            )
                          : "bg-slate-800 border-slate-700 text-slate-500"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo & Status */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full bg-slate-900 overflow-hidden border-4 border-slate-700 shadow-lg relative flex items-center justify-center">
                    {photo ? (
                      <img src={URL.createObjectURL(photo)} key={photo.name} className="w-full h-full object-cover" />
                    ) : form.watch('foto_url') ? (
                      <img src={form.watch('foto_url') || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950 gap-1">
                        <Upload className="w-7 h-7 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SIN FOTO</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full space-y-2">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-all duration-200 shadow-md text-center w-full">
                      <Upload className="w-4 h-4 text-white" />
                      <span className="text-xs uppercase tracking-wider">Subir desde Galería</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handlePhotoChange} 
                      />
                    </label>
                    
                    {(photo || form.watch('foto_url')) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPhoto(null);
                          form.setValue('foto_url', '');
                          toast.info('Foto eliminada. Guarda los cambios para aplicar.');
                        }}
                        className="w-full h-9 border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-semibold gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar Foto Actual
                      </Button>
                    )}

                    <p className="text-[10px] text-slate-500 text-center mt-1.5 italic">
                      Pulsa para seleccionar de tu carrete o galería de fotos
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foto_url">URL de la Foto (Opcional)</Label>
                  <Input 
                    id="foto_url" 
                    {...form.register('foto_url')} 
                    placeholder="https://..." 
                    className="bg-muted/50 border-slate-700 text-xs"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    Puedes pegar un enlace directo a una imagen si la subida falla.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Estado de Captación</Label>
                  <Select 
                    value={form.watch('estado')} 
                    onValueChange={(val: any) => form.setValue('estado', val)}
                  >
                    <SelectTrigger className={cn(
                      "bg-muted/50 font-bold",
                      form.watch('estado') === 'Rechazado' && "text-red-500 border-red-500/50 bg-red-500/5",
                      form.watch('estado') === 'Fichado' && "text-emerald-500 border-emerald-500/50 bg-emerald-500/5",
                      form.watch('estado') === 'Interesa' && "text-yellow-500 border-yellow-500/50 bg-yellow-500/5",
                      form.watch('estado') === 'En seguimiento' && "text-blue-500 border-blue-500/50 bg-blue-500/5"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Observado" className="text-slate-400 font-medium">Observado</SelectItem>
                      <SelectItem value="En seguimiento" className="text-blue-400 font-medium">En seguimiento</SelectItem>
                      <SelectItem value="Interesa" className="text-yellow-400 font-medium">Interesa</SelectItem>
                      <SelectItem value="Fichado" className="text-emerald-400 font-medium">Fichado</SelectItem>
                      <SelectItem value="Rechazado" className="text-red-400 font-medium">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="observador" className="text-slate-300">Observador / Scout</Label>
                    {user?.role === 'admin' && (
                      !isAddingObs ? (
                        <button 
                          type="button" 
                          onClick={() => setIsAddingObs(true)}
                          className="text-[10px] text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1 uppercase tracking-wider"
                        >
                          <Plus className="w-3 h-3" /> Nuevo
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => setIsAddingObs(false)}
                          className="text-[10px] text-slate-500 hover:text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider"
                        >
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      )
                    )}
                  </div>

                  {isAddingObs && user?.role === 'admin' ? (
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Alta rápida de observador</p>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nombre del observador" 
                          value={newObsName}
                          onChange={(e) => setNewObsName(e.target.value)}
                          className="bg-slate-900 border-slate-800 h-8 text-xs text-white"
                        />
                        <Button 
                          type="button" 
                          size="sm"
                          disabled={loadingObs}
                          onClick={async () => {
                            if (!newObsName.trim()) {
                              toast.error('Especifica un nombre');
                              return;
                            }
                            setLoadingObs(true);
                            try {
                              const created = await addObserver(newObsName.trim());
                              setObservers(prev => [...prev.filter(o => o.id !== created.id), created].sort((a,b) => a.nombre.localeCompare(b.nombre)));
                              form.setValue('observador', created.nombre);
                              setNewObsName('');
                              setIsAddingObs(false);
                              toast.success('Observador registrado y seleccionado');
                            } catch (err: any) {
                              toast.error(err.message || 'Error al registrar observador');
                            } finally {
                              setLoadingObs(false);
                            }
                          }}
                          className="h-8 text-xs bg-blue-600 hover:bg-blue-500"
                        >
                          Añadir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={form.watch('observador') || ''} 
                      onValueChange={(val: any) => form.setValue('observador', val || '')}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-white w-full">
                        <SelectValue placeholder="Seleccionar observador..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-slate-500 italic">Sin especificar / Ninguno</SelectItem>
                        {observers.map((obs) => (
                          <SelectItem key={obs.id} value={obs.nombre}>{obs.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {form.watch('estado') === 'Rechazado' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label htmlFor="motivos_rechazo" className="text-red-400 font-bold">Motivos del Rechazo</Label>
                    <Textarea 
                      id="motivos_rechazo" 
                      placeholder="Explique por qué se ha descartado al jugador..."
                      {...form.register('motivos_rechazo')}
                      className="border-red-500/30 focus-visible:ring-red-500 bg-red-500/5"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Contacto</Label>
                  <Select 
                    value={form.watch('contacto_tipo')} 
                    onValueChange={(val: any) => form.setValue('contacto_tipo', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Padre">Padre</SelectItem>
                      <SelectItem value="Madre">Madre</SelectItem>
                      <SelectItem value="Tutor">Tutor</SelectItem>
                      <SelectItem value="Jugador">Jugador</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" {...form.register('telefono')} placeholder="+34 ..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" {...form.register('email')} placeholder="ejemplo@correo.com" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attribute Valuation */}
        <Card className="border-none shadow-sm bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-xl">Valoración Técnica: {selectedPosition}</CardTitle>
            <CardDescription className="text-slate-400">Puntúa cada atributo técnico-táctico específico de la posición y los ítems comunes (0-5).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-10">
              {/* Aspectos Específicos */}
              <div>
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-6">
                  Aspectos Específicos de la Demarcación ({selectedPosition})
                </h3>
                <div className="space-y-8">
                  {getPositionStructuredAttributes(selectedPosition).map((group) => (
                    <div key={group.category} className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 inline-block">
                        {group.category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {group.items.map((attr) => (
                          <div key={attr} className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">{attr}</Label>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                                  (attributes[attr] || 0) === 0 && "bg-red-950/30 border-red-500/20 text-red-400",
                                  (attributes[attr] || 0) === 1 && "bg-red-500/10 border-red-500/20 text-red-350",
                                  (attributes[attr] || 0) === 2 && "bg-orange-500/10 border-orange-500/20 text-orange-400",
                                  (attributes[attr] || 0) === 3 && "bg-yellow-500/10 border-yellow-500/20 text-yellow-405",
                                  (attributes[attr] || 0) === 4 && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                                  (attributes[attr] || 0) === 5 && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                )}>
                                  {getRatingLabel(attributes[attr] || 0)}
                                </span>
                                <span className={cn(
                                  "text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                  (attributes[attr] || 0) === 0 && "bg-red-700 text-white",
                                  (attributes[attr] || 0) === 1 && "bg-red-500 text-white",
                                  (attributes[attr] || 0) === 2 && "bg-orange-500 text-white",
                                  (attributes[attr] || 0) === 3 && "bg-yellow-500 text-slate-950",
                                  (attributes[attr] || 0) === 4 && "bg-blue-500 text-white",
                                  (attributes[attr] || 0) === 5 && "bg-emerald-600 text-white"
                                )}>
                                  {attributes[attr] || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between gap-1">
                              {[0, 1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAttributes(prev => ({ ...prev, [attr]: val }))}
                                  className={cn(
                                    "flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all border",
                                    (attributes[attr] || 0) === val 
                                      ? cn(
                                          "text-white shadow-sm",
                                          val === 0 && "bg-red-700 border-red-650",
                                          val === 1 && "bg-red-500 border-red-400",
                                          val === 2 && "bg-orange-500 border-orange-400",
                                          val === 3 && "bg-yellow-500 border-yellow-400 text-slate-950",
                                          val === 4 && "bg-blue-500 border-blue-400",
                                          val === 5 && "bg-emerald-600 border-emerald-500"
                                        )
                                      : "bg-slate-900 border-slate-800 text-slate-550 hover:bg-slate-800"
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aspectos Comunes */}
              <div>
                <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-6">
                  Ítems Comunes para Todas las Posiciones
                </h3>
                <div className="space-y-8">
                  {COMMON_ATTRIBUTES.map((group) => (
                    <div key={group.category} className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 inline-block">
                        {group.category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {group.items.map((attr) => (
                          <div key={attr} className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">{attr}</Label>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                                  (attributes[attr] || 0) === 0 && "bg-red-950/30 border-red-500/20 text-red-400",
                                  (attributes[attr] || 0) === 1 && "bg-red-500/10 border-red-500/20 text-red-350",
                                  (attributes[attr] || 0) === 2 && "bg-orange-500/10 border-orange-500/20 text-orange-400",
                                  (attributes[attr] || 0) === 3 && "bg-yellow-500/10 border-yellow-500/20 text-yellow-405",
                                  (attributes[attr] || 0) === 4 && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                                  (attributes[attr] || 0) === 5 && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                )}>
                                  {getRatingLabel(attributes[attr] || 0)}
                                </span>
                                <span className={cn(
                                  "text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                  (attributes[attr] || 0) === 0 && "bg-red-700 text-white",
                                  (attributes[attr] || 0) === 1 && "bg-red-500 text-white",
                                  (attributes[attr] || 0) === 2 && "bg-orange-500 text-white",
                                  (attributes[attr] || 0) === 3 && "bg-yellow-500 text-slate-950",
                                  (attributes[attr] || 0) === 4 && "bg-blue-500 text-white",
                                  (attributes[attr] || 0) === 5 && "bg-emerald-600 text-white"
                                )}>
                                  {attributes[attr] || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between gap-1">
                              {[0, 1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAttributes(prev => ({ ...prev, [attr]: val }))}
                                  className={cn(
                                    "flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all border",
                                    (attributes[attr] || 0) === val 
                                      ? cn(
                                          "text-white shadow-sm",
                                          val === 0 && "bg-red-700 border-red-650",
                                          val === 1 && "bg-red-500 border-red-400",
                                          val === 2 && "bg-orange-500 border-orange-400",
                                          val === 3 && "bg-yellow-500 border-yellow-400 text-slate-950",
                                          val === 4 && "bg-blue-500 border-blue-400",
                                          val === 5 && "bg-emerald-600 border-emerald-500"
                                        )
                                      : "bg-slate-900 border-slate-800 text-slate-550 hover:bg-slate-800"
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Observaciones Finales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Añade detalles sobre el comportamiento, entorno, mentalidad..." 
              className="min-h-[150px]"
              {...form.register('observaciones')}
            />
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <Label className="mr-4">Próxima fecha de seguimiento</Label>
              <Input type="date" className="max-w-[200px]" {...form.register('fecha_seguimiento')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 bg-slate-950/90 backdrop-blur sticky bottom-0 border-t border-slate-800 z-50 rounded-b-xl">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="w-full sm:w-auto">Cancelar</Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto sm:min-w-[200px]"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="w-4 h-4 mr-2" />}
            {id ? 'Actualizar Informe' : 'Guardar Jugador'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

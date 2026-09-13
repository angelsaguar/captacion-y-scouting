import React, { useState, useMemo, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Clock, 
  X, 
  Check, 
  Trash2, 
  UserMinus, 
  UserPlus, 
  Compass, 
  RotateCcw, 
  Users,
  Layers,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  POSICIONES_CAMPO, 
  PosicionCampo, 
  getDefaultCampoPosition, 
  MatchPlayerStat 
} from './MatchStatsModal';

export interface MatchSubstitution {
  id: string;
  saleId: string;
  saleNombre: string;
  saleDorsal: string;
  salePosicion: string;
  entraId: string;
  entraNombre: string;
  entraDorsal: string;
  posicionEntra: string;
  minuto: number;
  minutoStr: string;
  timestamp?: string;
}

interface MatchTacticalPitchProps {
  playerStats: MatchPlayerStat[];
  substitutions: MatchSubstitution[];
  onExecuteSubstitution: (sub: MatchSubstitution) => void;
  onRemoveSubstitution: (subId: string) => void;
  onPositionChange?: (playerId: string, newPos: PosicionCampo) => void;
  onSelectPlayerForStats?: (player: MatchPlayerStat) => void;
  chronoSeconds: number;
  currentMinuteStr: string;
  onClose?: () => void;
}

// Supported Tactical Systems (Formaciones de juego)
export type TacticalSystem = 
  | '1-4-3-3' 
  | '1-4-4-2' 
  | '1-4-2-3-1' 
  | '1-3-5-2' 
  | '1-3-4-3' 
  | '1-5-3-2' 
  | '1-4-1-4-1';

export interface TacticalSlot {
  id: string;
  name: PosicionCampo;
  roleType: 'portero' | 'defensa' | 'medio' | 'delantero';
  label: string; // e.g. 'POR', 'LI', 'CZ', 'CD', 'LD', 'MC', 'II', 'ID', 'EI', 'DC', 'ED'
  x: number;     // 0 - 100 (%)
  y: number;     // 0 - 100 (%)
  color: string;
}

// Tactical coordinates for all available formations
export const TACTICAL_SYSTEMS: Record<TacticalSystem, { name: string; desc: string; slots: TacticalSlot[] }> = {
  '1-4-3-3': {
    name: '1-4-3-3',
    desc: '4 defensas, pivote + 2 interiores, 2 extremos y delantero',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'defensa', label: 'LI', x: 16, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CZ', x: 38, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 62, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'ld', name: 'Lateral Derecho', roleType: 'defensa', label: 'LD', x: 84, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'ii', name: 'Interior Izquierda', roleType: 'medio', label: 'II', x: 28, y: 52, color: 'from-emerald-500 to-teal-600' },
      { id: 'mc', name: 'Medio Centro', roleType: 'medio', label: 'MC', x: 50, y: 58, color: 'from-teal-500 to-cyan-600' },
      { id: 'id', name: 'Interior Derecha', roleType: 'medio', label: 'ID', x: 72, y: 52, color: 'from-emerald-500 to-teal-600' },
      { id: 'ei', name: 'Extremo Izquierda', roleType: 'delantero', label: 'EI', x: 20, y: 28, color: 'from-purple-500 to-pink-600' },
      { id: 'del', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 50, y: 20, color: 'from-rose-500 to-red-600' },
      { id: 'ed', name: 'Extremo Derecha', roleType: 'delantero', label: 'ED', x: 80, y: 28, color: 'from-purple-500 to-pink-600' },
    ]
  },
  '1-4-4-2': {
    name: '1-4-4-2',
    desc: '4 defensas, 2 medios y 2 bandas abiertas, con 2 delanteras',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'defensa', label: 'LI', x: 16, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CZ', x: 38, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 62, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'ld', name: 'Lateral Derecho', roleType: 'defensa', label: 'LD', x: 84, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'ei', name: 'Extremo Izquierda', roleType: 'medio', label: 'MI', x: 18, y: 50, color: 'from-emerald-500 to-teal-600' },
      { id: 'ii', name: 'Interior Izquierda', roleType: 'medio', label: 'MC', x: 39, y: 52, color: 'from-teal-500 to-cyan-600' },
      { id: 'id', name: 'Interior Derecha', roleType: 'medio', label: 'MC', x: 61, y: 52, color: 'from-teal-500 to-cyan-600' },
      { id: 'ed', name: 'Extremo Derecha', roleType: 'medio', label: 'MD', x: 82, y: 50, color: 'from-emerald-500 to-teal-600' },
      { id: 'del1', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 37, y: 22, color: 'from-rose-500 to-red-600' },
      { id: 'del2', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 63, y: 22, color: 'from-rose-500 to-red-600' },
    ]
  },
  '1-4-2-3-1': {
    name: '1-4-2-3-1',
    desc: 'Doble pivote defensivo con mediapunta y 3 atacantes',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'defensa', label: 'LI', x: 16, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CZ', x: 38, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 62, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'ld', name: 'Lateral Derecho', roleType: 'defensa', label: 'LD', x: 84, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'piv1', name: 'Medio Centro', roleType: 'medio', label: 'PIV', x: 38, y: 60, color: 'from-teal-600 to-cyan-700' },
      { id: 'piv2', name: 'Medio Centro', roleType: 'medio', label: 'PIV', x: 62, y: 60, color: 'from-teal-600 to-cyan-700' },
      { id: 'ei', name: 'Extremo Izquierda', roleType: 'medio', label: 'MI', x: 20, y: 38, color: 'from-purple-500 to-pink-600' },
      { id: 'mp', name: 'Interior Izquierda', roleType: 'medio', label: 'MCO', x: 50, y: 40, color: 'from-emerald-500 to-teal-600' },
      { id: 'ed', name: 'Extremo Derecha', roleType: 'medio', label: 'MD', x: 80, y: 38, color: 'from-purple-500 to-pink-600' },
      { id: 'del', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 50, y: 19, color: 'from-rose-500 to-red-600' },
    ]
  },
  '1-3-5-2': {
    name: '1-3-5-2',
    desc: '3 centrales con carrileros de recorrido largo y 3 mediocentros',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CI', x: 28, y: 75, color: 'from-blue-600 to-indigo-600' },
      { id: 'cc', name: 'Central Diestro', roleType: 'defensa', label: 'CC', x: 50, y: 77, color: 'from-blue-700 to-indigo-700' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 72, y: 75, color: 'from-blue-600 to-indigo-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'defensa', label: 'CAR', x: 14, y: 52, color: 'from-blue-500 to-cyan-600' },
      { id: 'ii', name: 'Interior Izquierda', roleType: 'medio', label: 'II', x: 34, y: 52, color: 'from-emerald-500 to-teal-600' },
      { id: 'mc', name: 'Medio Centro', roleType: 'medio', label: 'MC', x: 50, y: 58, color: 'from-teal-500 to-cyan-600' },
      { id: 'id', name: 'Interior Derecha', roleType: 'medio', label: 'ID', x: 66, y: 52, color: 'from-emerald-500 to-teal-600' },
      { id: 'ld', name: 'Lateral Derecho', roleType: 'defensa', label: 'CAR', x: 86, y: 52, color: 'from-blue-500 to-cyan-600' },
      { id: 'del1', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 38, y: 22, color: 'from-rose-500 to-red-600' },
      { id: 'del2', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 62, y: 22, color: 'from-rose-500 to-red-600' },
    ]
  },
  '1-3-4-3': {
    name: '1-3-4-3',
    desc: '3 centrales, línea de 4 centrocampistas y tridente ofensivo',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CI', x: 26, y: 75, color: 'from-blue-600 to-indigo-600' },
      { id: 'cc', name: 'Central Diestro', roleType: 'defensa', label: 'CC', x: 50, y: 77, color: 'from-blue-700 to-indigo-700' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 74, y: 75, color: 'from-blue-600 to-indigo-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'medio', label: 'MI', x: 18, y: 52, color: 'from-emerald-500 to-teal-600' },
      { id: 'ii', name: 'Interior Izquierda', roleType: 'medio', label: 'MC', x: 39, y: 54, color: 'from-teal-500 to-cyan-600' },
      { id: 'id', name: 'Interior Derecha', roleType: 'medio', label: 'MC', x: 61, y: 54, color: 'from-teal-500 to-cyan-600' },
      { id: 'ld', name: 'Interior Derecha', roleType: 'medio', label: 'MD', x: 82, y: 52, color: 'from-emerald-500 to-teal-600' },
      { id: 'ei', name: 'Extremo Izquierda', roleType: 'delantero', label: 'EI', x: 20, y: 26, color: 'from-purple-500 to-pink-600' },
      { id: 'del', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 50, y: 20, color: 'from-rose-500 to-red-600' },
      { id: 'ed', name: 'Extremo Derecha', roleType: 'delantero', label: 'ED', x: 80, y: 26, color: 'from-purple-500 to-pink-600' },
    ]
  },
  '1-5-3-2': {
    name: '1-5-3-2',
    desc: 'Línea defensiva de 5: solidez con carriles y contraataque',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'defensa', label: 'CAR', x: 14, y: 70, color: 'from-blue-500 to-cyan-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CI', x: 32, y: 76, color: 'from-blue-600 to-indigo-600' },
      { id: 'cc', name: 'Central Diestro', roleType: 'defensa', label: 'CC', x: 50, y: 78, color: 'from-blue-700 to-indigo-700' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 68, y: 76, color: 'from-blue-600 to-indigo-600' },
      { id: 'ld', name: 'Lateral Derecho', roleType: 'defensa', label: 'CAR', x: 86, y: 70, color: 'from-blue-500 to-cyan-600' },
      { id: 'ii', name: 'Interior Izquierda', roleType: 'medio', label: 'II', x: 30, y: 50, color: 'from-emerald-500 to-teal-600' },
      { id: 'mc', name: 'Medio Centro', roleType: 'medio', label: 'MC', x: 50, y: 54, color: 'from-teal-500 to-cyan-600' },
      { id: 'id', name: 'Interior Derecha', roleType: 'medio', label: 'ID', x: 70, y: 50, color: 'from-emerald-500 to-teal-600' },
      { id: 'del1', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 38, y: 22, color: 'from-rose-500 to-red-600' },
      { id: 'del2', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 62, y: 22, color: 'from-rose-500 to-red-600' },
    ]
  },
  '1-4-1-4-1': {
    name: '1-4-1-4-1',
    desc: 'Pivote entre líneas, bloque medio de 4 y delantero centro',
    slots: [
      { id: 'por', name: 'Portero', roleType: 'portero', label: 'POR', x: 50, y: 88, color: 'from-amber-500 to-yellow-600' },
      { id: 'li', name: 'Lateral Izquierdo', roleType: 'defensa', label: 'LI', x: 16, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'cz', name: 'Central Zurdo', roleType: 'defensa', label: 'CZ', x: 38, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'cd', name: 'Central Diestro', roleType: 'defensa', label: 'CD', x: 62, y: 74, color: 'from-blue-600 to-indigo-600' },
      { id: 'ld', name: 'Lateral Derecho', roleType: 'defensa', label: 'LD', x: 84, y: 72, color: 'from-blue-500 to-cyan-600' },
      { id: 'piv', name: 'Medio Centro', roleType: 'medio', label: 'MCD', x: 50, y: 62, color: 'from-teal-700 to-cyan-800' },
      { id: 'ei', name: 'Extremo Izquierda', roleType: 'medio', label: 'MI', x: 18, y: 46, color: 'from-purple-500 to-pink-600' },
      { id: 'ii', name: 'Interior Izquierda', roleType: 'medio', label: 'MC', x: 38, y: 46, color: 'from-emerald-500 to-teal-600' },
      { id: 'id', name: 'Interior Derecha', roleType: 'medio', label: 'MC', x: 62, y: 46, color: 'from-emerald-500 to-teal-600' },
      { id: 'ed', name: 'Extremo Derecha', roleType: 'medio', label: 'MD', x: 82, y: 46, color: 'from-purple-500 to-pink-600' },
      { id: 'del', name: 'Delantero', roleType: 'delantero', label: 'DC', x: 50, y: 20, color: 'from-rose-500 to-red-600' },
    ]
  }
};

// Fallback legacy coordinates mapping for backward compatibility
export const TACTICAL_COORDINATES: Record<PosicionCampo, { x: number; y: number; code: string; color: string }> = {
  'Portero': { x: 50, y: 88, code: 'POR', color: 'from-amber-500 to-yellow-600' },
  'Lateral Izquierdo': { x: 16, y: 72, code: 'LI', color: 'from-blue-500 to-cyan-600' },
  'Central Zurdo': { x: 38, y: 74, code: 'CZ', color: 'from-blue-600 to-indigo-600' },
  'Central Diestro': { x: 62, y: 74, code: 'CD', color: 'from-blue-600 to-indigo-600' },
  'Lateral Derecho': { x: 84, y: 72, code: 'LD', color: 'from-blue-500 to-cyan-600' },
  'Interior Izquierda': { x: 26, y: 52, code: 'II', color: 'from-emerald-500 to-teal-600' },
  'Medio Centro': { x: 50, y: 56, code: 'MC', color: 'from-teal-500 to-cyan-600' },
  'Interior Derecha': { x: 74, y: 52, code: 'ID', color: 'from-emerald-500 to-teal-600' },
  'Extremo Izquierda': { x: 18, y: 28, code: 'EI', color: 'from-purple-500 to-pink-600' },
  'Delantero': { x: 50, y: 20, code: 'DEL', color: 'from-rose-500 to-red-600' },
  'Extremo Derecha': { x: 82, y: 28, code: 'ED', color: 'from-purple-500 to-pink-600' },
};

function getPlayerRoleCategory(pos: string): 'portero' | 'defensa' | 'medio' | 'delantero' {
  const p = (pos || '').toLowerCase().trim();
  if (p.includes('port') || p === 'por') return 'portero';
  if (p.includes('delan') || p.includes('punta') || p.includes('ariete') || p.includes('ext') || p === 'dc' || p === 'ei' || p === 'ed' || p === 'del') return 'delantero';
  if (p.includes('lat') || p.includes('carril') || p.includes('cierre') || (p.includes('centr') && !p.includes('centrocamp')) || p.includes('def') || p === 'cz' || p === 'cd' || p === 'li' || p === 'ld' || p === 'ci') return 'defensa';
  return 'medio';
}

export default function MatchTacticalPitch({
  playerStats,
  substitutions,
  onExecuteSubstitution,
  onRemoveSubstitution,
  onPositionChange,
  onSelectPlayerForStats,
  chronoSeconds,
  currentMinuteStr,
  onClose
}: MatchTacticalPitchProps) {
  // Tactical System selection state (Desplegable de sistema de juego)
  const [tacticalSystem, setTacticalSystem] = useState<TacticalSystem>('1-4-3-3');
  
  // Custom manual drag coordinates for players: { [playerId]: { x, y } }
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const pitchContainerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  // Dialog / Drawer state for substitution
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [selectedEntraId, setSelectedEntraId] = useState<string>('');
  const [selectedPosicionEntra, setSelectedPosicionEntra] = useState<string>('');
  
  // Calculate current minute as a numeric integer (default from chrono)
  const currentChronoMinute = useMemo(() => {
    const mins = Math.max(1, Math.floor(chronoSeconds / 60));
    return Math.min(90, mins);
  }, [chronoSeconds]);

  const [subMinute, setSubMinute] = useState<number>(currentChronoMinute || 45);

  // Derive which players are currently ON FIELD vs ON BENCH (taking into account all substitutions and formation needs)
  const { onFieldPlayers, benchPlayers, currentPositionMap } = useMemo(() => {
    const onFieldIds = new Set<string>();
    const posMap: Record<string, string> = {};

    // 1. Initial on-field players (explicitly marked titulares)
    playerStats.forEach(p => {
      if (p.titular) {
        onFieldIds.add(p.playerId);
        posMap[p.playerId] = p.posicionActiva || getDefaultCampoPosition(p.posicion);
      }
    });

    // 2. If fewer than 11 players are on field, auto-complete up to 11 from available squad players
    if (onFieldIds.size < 11) {
      const activeSystemSlots = TACTICAL_SYSTEMS[tacticalSystem]?.slots || TACTICAL_SYSTEMS['1-4-3-3'].slots;

      // Count roles currently covered on field
      const currentRoleCounts: Record<string, number> = { portero: 0, defensa: 0, medio: 0, delantero: 0 };
      onFieldIds.forEach(id => {
        const role = getPlayerRoleCategory(posMap[id] || '');
        currentRoleCounts[role] = (currentRoleCounts[role] || 0) + 1;
      });

      // Count roles needed in the chosen formation
      const neededRoleCounts: Record<string, number> = { portero: 0, defensa: 0, medio: 0, delantero: 0 };
      activeSystemSlots.forEach(s => {
        neededRoleCounts[s.roleType] = (neededRoleCounts[s.roleType] || 0) + 1;
      });

      // Sort candidate players: Convocadas first, non-suplentes first, then players with minutes
      const candidates = playerStats
        .filter(p => !onFieldIds.has(p.playerId))
        .sort((a, b) => {
          const scoreA = (a.isConvocada ? 4 : 0) + (!a.suplente ? 2 : 0) + ((a.minutos ?? 0) > 0 ? 1 : 0);
          const scoreB = (b.isConvocada ? 4 : 0) + (!b.suplente ? 2 : 0) + ((b.minutos ?? 0) > 0 ? 1 : 0);
          return scoreB - scoreA;
        });

      // Pass A: Fill candidates that match unfilled role needs
      const remainingCandidates: MatchPlayerStat[] = [];
      for (const cand of candidates) {
        if (onFieldIds.size >= 11) break;
        const candPos = cand.posicionActiva || getDefaultCampoPosition(cand.posicion);
        const candRole = getPlayerRoleCategory(candPos);
        if ((currentRoleCounts[candRole] || 0) < (neededRoleCounts[candRole] || 0)) {
          onFieldIds.add(cand.playerId);
          posMap[cand.playerId] = candPos;
          currentRoleCounts[candRole] = (currentRoleCounts[candRole] || 0) + 1;
        } else {
          remainingCandidates.push(cand);
        }
      }

      // Pass B: Fill any remaining spots up to 11 with remaining candidates
      for (const cand of remainingCandidates) {
        if (onFieldIds.size >= 11) break;
        onFieldIds.add(cand.playerId);
        posMap[cand.playerId] = cand.posicionActiva || getDefaultCampoPosition(cand.posicion);
      }
    }

    // 3. Apply substitutions chronologically
    substitutions.forEach(sub => {
      onFieldIds.delete(sub.saleId);
      onFieldIds.add(sub.entraId);
      if (sub.posicionEntra) {
        posMap[sub.entraId] = sub.posicionEntra;
      }
    });

    const onField = playerStats.filter(p => onFieldIds.has(p.playerId));
    const bench = playerStats.filter(p => !onFieldIds.has(p.playerId));

    return {
      onFieldPlayers: onField,
      benchPlayers: bench,
      currentPositionMap: posMap
    };
  }, [playerStats, substitutions, tacticalSystem]);

  // Match each on-field player to a formation slot in the active tactical system,
  // respecting their assigned position, role affinities, and any custom manual drag coordinates
  const placedLayout = useMemo(() => {
    const slots = TACTICAL_SYSTEMS[tacticalSystem].slots;
    const remainingSlots = [...slots];
    const playerPlacements: Array<{
      player: MatchPlayerStat;
      slot: TacticalSlot;
      x: number;
      y: number;
      isManual: boolean;
      activePosition: string;
    }> = [];

    const unassigned: MatchPlayerStat[] = [];

    // Pass 1: Goalkeeper direct assignment
    onFieldPlayers.forEach(p => {
      const pPos = currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion);
      const role = getPlayerRoleCategory(pPos);
      if (role === 'portero') {
        const slotIdx = remainingSlots.findIndex(s => s.roleType === 'portero');
        if (slotIdx !== -1) {
          const slot = remainingSlots.splice(slotIdx, 1)[0];
          const custom = customPositions[p.playerId];
          playerPlacements.push({
            player: p,
            slot,
            x: custom ? custom.x : slot.x,
            y: custom ? custom.y : slot.y,
            isManual: !!custom,
            activePosition: slot.name
          });
          return;
        }
      }
      unassigned.push(p);
    });

    // Pass 2: Exact slot position name match (e.g. "Lateral Izquierdo" -> "Lateral Izquierdo")
    const afterPass2: MatchPlayerStat[] = [];
    unassigned.forEach(p => {
      const pPos = currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion);
      const slotIdx = remainingSlots.findIndex(s => s.name.toLowerCase() === pPos.toLowerCase());
      if (slotIdx !== -1) {
        const slot = remainingSlots.splice(slotIdx, 1)[0];
        const custom = customPositions[p.playerId];
        playerPlacements.push({
          player: p,
          slot,
          x: custom ? custom.x : slot.x,
          y: custom ? custom.y : slot.y,
          isManual: !!custom,
          activePosition: slot.name
        });
      } else {
        afterPass2.push(p);
      }
    });

    // Pass 3: Role match with directional / tactical affinity
    const afterPass3: MatchPlayerStat[] = [];
    afterPass2.forEach(p => {
      const pPos = currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion);
      const role = getPlayerRoleCategory(pPos);
      const pText = (p.posicion + ' ' + pPos).toLowerCase();

      let bestSlotIdx = -1;

      if (role === 'defensa') {
        if (pText.includes('izq') || pText.includes('zur')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'defensa' && (s.name.includes('Izquierdo') || s.name.includes('Zurdo')));
        } else if (pText.includes('der') || pText.includes('die')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'defensa' && (s.name.includes('Derecho') || s.name.includes('Diestro')));
        } else if (pText.includes('centr')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'defensa' && s.name.includes('Central'));
        }
      } else if (role === 'delantero') {
        if (pText.includes('izq')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'delantero' && s.name.includes('Izquierda'));
        } else if (pText.includes('der')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'delantero' && s.name.includes('Derecha'));
        } else if (pText.includes('delan') || pText.includes('punta')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'delantero' && s.name.includes('Delantero'));
        }
      } else if (role === 'medio') {
        if (pText.includes('pivote') || pText.includes('mcd')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'medio' && s.name.includes('Medio Centro'));
        } else if (pText.includes('izq')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'medio' && s.name.includes('Izquierda'));
        } else if (pText.includes('der')) {
          bestSlotIdx = remainingSlots.findIndex(s => s.roleType === 'medio' && s.name.includes('Derecha'));
        }
      }

      // If no directional match, match any slot of same role
      if (bestSlotIdx === -1) {
        bestSlotIdx = remainingSlots.findIndex(s => s.roleType === role);
      }

      if (bestSlotIdx !== -1) {
        const slot = remainingSlots.splice(bestSlotIdx, 1)[0];
        const custom = customPositions[p.playerId];
        playerPlacements.push({
          player: p,
          slot,
          x: custom ? custom.x : slot.x,
          y: custom ? custom.y : slot.y,
          isManual: !!custom,
          activePosition: slot.name
        });
      } else {
        afterPass3.push(p);
      }
    });

    // Pass 4: Distribute any remaining players into any remaining slots
    afterPass3.forEach(p => {
      const pPos = currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion);
      const slot = remainingSlots.shift();
      const custom = customPositions[p.playerId];
      if (slot) {
        playerPlacements.push({
          player: p,
          slot,
          x: custom ? custom.x : slot.x,
          y: custom ? custom.y : slot.y,
          isManual: !!custom,
          activePosition: slot.name
        });
      } else {
        // Fallback if more than 11 players on field
        playerPlacements.push({
          player: p,
          slot: slots[0],
          x: custom ? custom.x : 50,
          y: custom ? custom.y : 50,
          isManual: !!custom,
          activePosition: pPos
        });
      }
    });

    // Empty slots remaining in the tactical formation (when < 11 players are on field)
    const emptySlots = remainingSlots;

    return { playerPlacements, emptySlots };
  }, [onFieldPlayers, tacticalSystem, currentPositionMap, customPositions]);

  // Pointer drag event handlers for manual player repositioning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, playerId: string) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    setDraggingPlayerId(playerId);
    dragInfoRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, playerId: string) => {
    if (draggingPlayerId !== playerId || !dragInfoRef.current || !pitchContainerRef.current) return;

    const dx = Math.abs(e.clientX - dragInfoRef.current.startX);
    const dy = Math.abs(e.clientY - dragInfoRef.current.startY);

    if (dx > 4 || dy > 4) {
      dragInfoRef.current.moved = true;
    }

    if (dragInfoRef.current.moved) {
      const rect = pitchContainerRef.current.getBoundingClientRect();
      const xPct = Math.max(7, Math.min(93, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(6, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100));

      setCustomPositions(prev => ({
        ...prev,
        [playerId]: {
          x: Math.round(xPct * 10) / 10,
          y: Math.round(yPct * 10) / 10
        }
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, player: MatchPlayerStat) => {
    if (draggingPlayerId === player.playerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const moved = dragInfoRef.current?.moved;
      setDraggingPlayerId(null);
      dragInfoRef.current = null;

      // If barely moved, treat as a tap/click to open substitution modal!
      if (!moved) {
        handleOpenSubForPlayer(player);
      } else {
        toast.info(`Posición de ${player.nombre} ajustada manualmente en el campo.`, { duration: 1500 });
      }
    }
  };

  const handlePointerCancel = () => {
    setDraggingPlayerId(null);
    dragInfoRef.current = null;
  };

  // Change tactical formation system
  const handleSystemChange = (newSystem: TacticalSystem) => {
    setTacticalSystem(newSystem);
    setCustomPositions({});
    toast.success(`Sistema cambiado a ${newSystem}. Jugadoras recolocadas en el campo.`);
  };

  // Reset all custom positions back to the formation's default slot positions
  const handleResetToFormation = () => {
    setCustomPositions({});
    toast.success(`Posiciones restablecidas según la formación ${tacticalSystem}.`);
  };

  // Open the substitution modal pre-selecting a specific player to come off
  const handleOpenSubForPlayer = (player: MatchPlayerStat) => {
    setSelectedSaleId(player.playerId);
    const currentPos = currentPositionMap[player.playerId] || player.posicionActiva || getDefaultCampoPosition(player.posicion);
    setSelectedPosicionEntra(currentPos);
    
    if (benchPlayers.length > 0 && !selectedEntraId) {
      setSelectedEntraId(benchPlayers[0].playerId);
    }
    setSubMinute(currentChronoMinute || 45);
    setIsSubModalOpen(true);
  };

  // Open general substitution modal
  const handleOpenGeneralSubModal = () => {
    if (onFieldPlayers.length === 0) {
      toast.error('No hay jugadoras en el campo para sustituir');
      return;
    }
    if (benchPlayers.length === 0) {
      toast.error('No hay jugadoras disponibles en el banquillo');
      return;
    }
    if (!selectedSaleId) {
      setSelectedSaleId(onFieldPlayers[0].playerId);
      const defaultPos = currentPositionMap[onFieldPlayers[0].playerId] || onFieldPlayers[0].posicionActiva || getDefaultCampoPosition(onFieldPlayers[0].posicion);
      setSelectedPosicionEntra(defaultPos);
    }
    if (!selectedEntraId && benchPlayers.length > 0) {
      setSelectedEntraId(benchPlayers[0].playerId);
    }
    setSubMinute(currentChronoMinute || 45);
    setIsSubModalOpen(true);
  };

  // Click on an empty formation slot
  const handleEmptySlotClick = (slot: TacticalSlot) => {
    if (benchPlayers.length === 0) {
      toast.info(`Posición ${slot.name} (${slot.label}) vacía. No hay jugadoras disponibles en el banquillo.`);
      return;
    }
    setSelectedSaleId(onFieldPlayers.length > 0 ? onFieldPlayers[0].playerId : '');
    setSelectedEntraId(benchPlayers[0].playerId);
    setSelectedPosicionEntra(slot.name);
    setSubMinute(currentChronoMinute || 45);
    setIsSubModalOpen(true);
  };

  // Submit substitution
  const handleConfirmSubstitution = () => {
    if (!selectedSaleId || !selectedEntraId) {
      toast.error('Debes seleccionar la jugadora que sale y la jugadora que entra');
      return;
    }

    const salePlayer = playerStats.find(p => p.playerId === selectedSaleId);
    const entraPlayer = playerStats.find(p => p.playerId === selectedEntraId);

    if (!salePlayer || !entraPlayer) {
      toast.error('Error al encontrar los datos de las jugadoras');
      return;
    }

    const salePos = currentPositionMap[salePlayer.playerId] || salePlayer.posicionActiva || getDefaultCampoPosition(salePlayer.posicion);
    const posEntraFinal = selectedPosicionEntra || salePos;
    const finalMinuto = Math.max(1, Math.min(120, subMinute || currentChronoMinute || 45));
    const finalMinutoStr = `${finalMinuto}'`;

    // Transfer any custom position to incoming player
    if (customPositions[salePlayer.playerId]) {
      setCustomPositions(prev => {
        const next = { ...prev };
        next[entraPlayer.playerId] = next[salePlayer.playerId];
        delete next[salePlayer.playerId];
        return next;
      });
    }

    const newSub: MatchSubstitution = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      saleId: salePlayer.playerId,
      saleNombre: `${salePlayer.nombre} ${salePlayer.apellidos || ''}`.trim(),
      saleDorsal: String(salePlayer.dorsal || ''),
      salePosicion: salePos,
      entraId: entraPlayer.playerId,
      entraNombre: `${entraPlayer.nombre} ${entraPlayer.apellidos || ''}`.trim(),
      entraDorsal: String(entraPlayer.dorsal || ''),
      posicionEntra: posEntraFinal,
      minuto: finalMinuto,
      minutoStr: finalMinutoStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onExecuteSubstitution(newSub);

    if (onPositionChange) {
      onPositionChange(entraPlayer.playerId, posEntraFinal as PosicionCampo);
    }

    setIsSubModalOpen(false);
    setSelectedSaleId('');
    setSelectedEntraId('');
    setSelectedPosicionEntra('');

    toast.success(
      `Sustitución en min ${finalMinuto}': Sale #${salePlayer.dorsal} ${salePlayer.nombre} ➜ Entra #${entraPlayer.dorsal} ${entraPlayer.nombre} (${posEntraFinal})`
    );
  };

  const salePlayerObj = useMemo(() => {
    return playerStats.find(p => p.playerId === selectedSaleId);
  }, [playerStats, selectedSaleId]);

  const entraPlayerObj = useMemo(() => {
    return playerStats.find(p => p.playerId === selectedEntraId);
  }, [playerStats, selectedEntraId]);

  const customMovedCount = Object.keys(customPositions).length;

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full h-full min-h-0 select-none">
      
      {/* LEFT / CENTER: THE INTERACTIVE TACTICAL PITCH */}
      <div className="flex-1 flex flex-col items-center min-w-0 bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-2.5 sm:p-3.5 shadow-xl overflow-y-auto relative">
        
        {/* PITCH TOP BAR: Tactical System Dropdown, Status & Actions */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2.5 mb-2 px-1 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
                  <span>Pizarra Táctica</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    onFieldPlayers.length === 11
                      ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50'
                      : onFieldPlayers.length > 11
                        ? 'text-amber-300 bg-amber-950/80 border-amber-500/50'
                        : 'text-blue-300 bg-blue-950/80 border-blue-500/50'
                  }`}>
                    {onFieldPlayers.length}/11 en Campo {onFieldPlayers.length === 11 ? '✓ Completo' : ''}
                  </span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Colocación por posición • Arrastra para mover libremente
              </p>
            </div>
          </div>

          {/* CONTROLS: Formation Dropdown, Reset, and Sub Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* DESPLEGABLE SISTEMA DE JUEGO */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-emerald-500/40 hover:border-emerald-400/80 rounded-xl px-2.5 py-1 text-xs shadow-sm transition-colors">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <label htmlFor="tactical-system-select" className="text-[10px] font-black uppercase text-slate-400 shrink-0">
                Sistema:
              </label>
              <select
                id="tactical-system-select"
                value={tacticalSystem}
                onChange={(e) => handleSystemChange(e.target.value as TacticalSystem)}
                className="bg-transparent text-emerald-300 font-black text-xs sm:text-sm focus:outline-none cursor-pointer pr-1"
                title="Selecciona el sistema táctico de juego"
              >
                {Object.entries(TACTICAL_SYSTEMS).map(([key, sys]) => (
                  <option key={key} value={key} className="bg-slate-950 text-white font-bold py-1">
                    {sys.name}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN REAJUSTAR A FORMACIÓN */}
            <Button
              type="button"
              onClick={handleResetToFormation}
              size="sm"
              variant="ghost"
              className="h-8 sm:h-9 px-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Restablecer posiciones según el sistema táctico"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Reajustar</span>
            </Button>

            {/* BOTÓN SUSTITUCIÓN */}
            <Button
              type="button"
              onClick={handleOpenGeneralSubModal}
              size="sm"
              className="h-8 sm:h-9 px-3 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Sustitución</span>
            </Button>
          </div>
        </div>

        {/* HELPER BANNER: SYSTEM & MANUAL DRAG NOTIFICATION */}
        <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 mb-2 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Move className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              <strong>{tacticalSystem}</strong>: {TACTICAL_SYSTEMS[tacticalSystem].desc} • <strong>Arrastra libremente</strong> a cualquier jugadora
            </span>
          </div>
          {customMovedCount > 0 && (
            <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
              {customMovedCount} movida{customMovedCount > 1 ? 's' : ''} a mano
            </span>
          )}
        </div>

        {/* THE SOCCER PITCH (Tactical Board) */}
        <div className="w-full flex-1 flex items-center justify-center p-1 sm:p-2">
          <div 
            ref={pitchContainerRef}
            className="w-full max-w-[440px] sm:max-w-[480px] h-[480px] sm:h-[530px] md:h-[560px] max-h-[60vh] aspect-[1/1.36] bg-gradient-to-b from-[#06331e] via-[#064225] to-[#06331e] border-4 border-slate-900 rounded-3xl relative shadow-[0_0_50px_rgba(6,78,59,0.35)] overflow-hidden touch-none mx-auto select-none shrink-0"
          >
            {/* Authentic horizontal grass stripes */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.06) 50%, rgba(5, 150, 105, 0.02) 50%)',
                backgroundSize: '100% 12.5%'
              }} 
            />

            {/* Field Outer Lines */}
            <div className="absolute inset-3 sm:inset-4 border-2 border-emerald-400/30 rounded-2xl pointer-events-none" />

            {/* Halfway Line */}
            <div className="absolute top-1/2 left-3 right-3 sm:left-4 sm:right-4 h-0.5 bg-emerald-400/30 -translate-y-1/2 pointer-events-none" />

            {/* Center Circle & Center Spot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 border-2 border-emerald-400/30 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400/60 rounded-full pointer-events-none" />

            {/* Top Penalty Box & Goal (Attacking direction) */}
            <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 w-[52%] h-[15%] border-b-2 border-l-2 border-r-2 border-emerald-400/30 rounded-b-lg pointer-events-none" />
            <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 w-[26%] h-[5.5%] border-b-2 border-l-2 border-r-2 border-emerald-400/30 rounded-b pointer-events-none" />
            <div className="absolute top-[18.5%] left-1/2 -translate-x-1/2 w-[18%] h-[8%] border-b-2 border-emerald-400/30 rounded-b-full pointer-events-none" />
            <div className="absolute top-[13%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400/60 rounded-full pointer-events-none" />
            {/* Top Goal */}
            <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[22%] h-[6px] bg-white rounded-sm shadow-md pointer-events-none" />

            {/* Bottom Penalty Box & Goal (Defending direction) */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[52%] h-[15%] border-t-2 border-l-2 border-r-2 border-emerald-400/30 rounded-t-lg pointer-events-none" />
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[26%] h-[5.5%] border-t-2 border-l-2 border-r-2 border-emerald-400/30 rounded-t pointer-events-none" />
            <div className="absolute bottom-[18.5%] left-1/2 -translate-x-1/2 w-[18%] h-[8%] border-t-2 border-emerald-400/30 rounded-t-full pointer-events-none" />
            <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400/60 rounded-full pointer-events-none" />
            {/* Bottom Goal */}
            <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-[22%] h-[6px] bg-white rounded-sm shadow-md pointer-events-none" />

            {/* Corner Arcs */}
            <div className="absolute top-3 left-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400/30 rounded-br-full pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400/30 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400/30 rounded-tr-full pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400/30 rounded-tl-full pointer-events-none" />

            {/* PLAYERS PLACED ON PITCH (ACCORDING TO TACTICAL SYSTEM + MANUAL DRAG) */}
            {placedLayout.playerPlacements.map(({ player, slot, x, y, isManual, activePosition }) => {
              const hasEnteredAsSub = substitutions.some(s => s.entraId === player.playerId);
              const currentMinutes = player.minutos ?? 0;
              const isDragging = draggingPlayerId === player.playerId;

              return (
                <div
                  key={player.playerId}
                  onPointerDown={(e) => handlePointerDown(e, player.playerId)}
                  onPointerMove={(e) => handlePointerMove(e, player.playerId)}
                  onPointerUp={(e) => handlePointerUp(e, player)}
                  onPointerCancel={handlePointerCancel}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    touchAction: 'none'
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 select-none z-20 group transition-all duration-75 flex flex-col items-center ${
                    isDragging
                      ? 'z-50 scale-125 cursor-grabbing drop-shadow-2xl'
                      : 'cursor-grab hover:scale-110 active:scale-105'
                  }`}
                  title={`${player.nombre} #${player.dorsal} (${activePosition}). Arrastra para mover o toca para sustituir.`}
                >
                  {/* Dorsal Circle Avatar */}
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${slot.color} border-2 ${
                    isManual ? 'border-amber-300 ring-2 ring-amber-400/80 shadow-amber-500/40' : 'border-white'
                  } shadow-lg flex items-center justify-center text-white font-black text-xs sm:text-sm font-mono relative transition-shadow group-hover:ring-4 group-hover:ring-emerald-400/50`}>
                    <span>{player.dorsal || '-'}</span>

                    {/* Drag indicator icon on hover */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 border border-emerald-400 text-emerald-300 flex items-center justify-center shadow">
                      <Move className="w-2.5 h-2.5" />
                    </span>

                    {/* Substitute in indicator */}
                    {hasEnteredAsSub && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[8px] font-black shadow">
                        ▲
                      </span>
                    )}

                    {/* Goals indicator */}
                    {(player.goles_metidos || 0) > 0 && (
                      <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full border border-black shadow">
                        ⚽{player.goles_metidos}
                      </span>
                    )}

                    {/* Yellow card */}
                    {(player.tarjetas_amarillas || 0) > 0 && (
                      <span className="absolute -top-1 -left-1 w-2.5 h-3.5 bg-yellow-400 border border-black rounded-xs shadow" />
                    )}
                  </div>

                  {/* Player Name and Quick Sub Badge */}
                  <div className="mt-1 bg-slate-950/90 border border-white/20 rounded-md px-1.5 py-0.5 text-center shadow-md max-w-[85px] sm:max-w-[105px] truncate group-hover:border-emerald-400 transition-colors pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-white block truncate leading-tight">
                      {player.nombre.split(' ')[0]} {player.apellidos ? player.apellidos.charAt(0) + '.' : ''}
                    </span>
                    <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-emerald-300">
                      <span>{slot.label}</span>
                      {isManual && <span className="text-[8px] text-amber-300 font-bold" title="Posición ajustada manualmente">●</span>}
                      <span>•</span>
                      <span>{currentMinutes}'</span>
                    </div>
                  </div>

                  {/* Hover Action Pill */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 pointer-events-none whitespace-nowrap z-30">
                    <Move className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Arrastra o Toca</span>
                  </div>
                </div>
              );
            })}

            {/* EMPTY TACTICAL SLOTS IN THE ACTIVE FORMATION */}
            {placedLayout.emptySlots.map(slot => (
              <div
                key={slot.id}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                onClick={() => handleEmptySlotClick(slot)}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group flex flex-col items-center"
                title={`Posición vacía: ${slot.name} (${slot.label}). Toca para incorporar jugadora`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-dashed border-emerald-400/40 hover:border-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 flex items-center justify-center text-emerald-300 transition-all group-hover:scale-110 shadow-sm">
                  <span className="text-[8px] font-black">{slot.label}</span>
                </div>
                <span className="text-[8px] font-bold text-emerald-400/70 mt-0.5 group-hover:text-emerald-300">
                  + Libre
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM TACTICAL SUMMARY FOOTER */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-300">Minuto Actual: <strong className="text-emerald-400">{currentMinuteStr}</strong></span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Formación: <strong className="text-white">{tacticalSystem}</strong> • Arrastra para recolocar libremente • Toca para sustitución
          </span>
        </div>
      </div>

      {/* RIGHT: BENCH (BANQUILLO) & HISTORIAL DE SUSTITUCIONES */}
      <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
        
        {/* BANQUILLO / SUPLENTES DISPONIBLES */}
        <div className="bg-slate-950/80 border border-slate-850 p-3.5 sm:p-4 rounded-2xl flex flex-col shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <h5 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                Banquillo / Suplentes ({benchPlayers.length})
              </h5>
            </div>
            <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
              Disponibles
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
            {benchPlayers.length > 0 ? (
              benchPlayers.map(player => {
                const habitualPos = player.posicionActiva || getDefaultCampoPosition(player.posicion);
                const hasPlayed = (player.minutos || 0) > 0;

                return (
                  <div
                    key={player.playerId}
                    className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 p-2 rounded-xl flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-mono font-bold text-xs shrink-0">
                        #{player.dorsal || '-'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {player.nombre} {player.apellidos}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {habitualPos} {hasPlayed ? `• ${player.minutos}' jugados` : ''}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedEntraId(player.playerId);
                        if (onFieldPlayers.length > 0 && !selectedSaleId) {
                          setSelectedSaleId(onFieldPlayers[0].playerId);
                          setSelectedPosicionEntra(habitualPos);
                        }
                        setIsSubModalOpen(true);
                      }}
                      className="h-7 px-2 text-[10px] font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Meter</span>
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs italic">
                No hay jugadoras en el banquillo.
              </div>
            )}
          </div>
        </div>

        {/* REGISTRO OFICIAL DE CAMBIOS DEL PARTIDO */}
        <div className="bg-slate-950/80 border border-slate-850 p-3.5 sm:p-4 rounded-2xl flex-1 flex flex-col shadow-lg min-h-[220px]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <h5 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                Cambios Realizados ({substitutions.length})
              </h5>
            </div>
            {substitutions.length > 0 && (
              <span className="text-[10px] font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">
                Registrados
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-72">
            {substitutions.length > 0 ? (
              substitutions.map(sub => (
                <div
                  key={sub.id}
                  className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex flex-col gap-1.5 text-xs shadow-inner"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded text-[10px]">
                      Min {sub.minutoStr || `${sub.minuto}'`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveSubstitution(sub.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar / deshacer este cambio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Outgoing player */}
                  <div className="flex items-center gap-1.5 text-rose-300">
                    <UserMinus className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span className="font-bold truncate">
                      Sale #{sub.saleDorsal} {sub.saleNombre}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                      ({sub.salePosicion})
                    </span>
                  </div>

                  {/* Incoming player */}
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <UserPlus className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="font-bold truncate">
                      Entra #{sub.entraDorsal} {sub.entraNombre}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-extrabold ml-auto shrink-0">
                      ➜ {sub.posicionEntra}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs italic flex flex-col items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-slate-600" />
                <span>No se han realizado sustituciones aún en este encuentro.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL / DRAWER DE SUSTITUCIÓN DIRECTA */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">
                    Realizar Sustitución de Jugadora
                  </h4>
                  <p className="text-xs text-slate-400">
                    Saca una jugadora del campo y coloca una suplente en la posición deseada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              
              {/* 1. JUGADORA QUE SALE DEL CAMPO */}
              <div className="bg-slate-950/80 border border-rose-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>1. Jugadora que SALE del Campo</span>
                  </span>
                  {salePlayerObj && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Posición actual: <strong className="text-white">{currentPositionMap[salePlayerObj.playerId] || salePlayerObj.posicionActiva || getDefaultCampoPosition(salePlayerObj.posicion)}</strong>
                    </span>
                  )}
                </div>

                <select
                  value={selectedSaleId}
                  onChange={(e) => {
                    const newSaleId = e.target.value;
                    setSelectedSaleId(newSaleId);
                    const found = playerStats.find(p => p.playerId === newSaleId);
                    if (found) {
                      const pos = currentPositionMap[found.playerId] || found.posicionActiva || getDefaultCampoPosition(found.posicion);
                      setSelectedPosicionEntra(pos);
                    }
                  }}
                  className="w-full bg-slate-900 text-white font-bold text-sm py-2 px-3 rounded-lg border border-rose-500/40 focus:outline-none focus:border-rose-400 cursor-pointer"
                >
                  <option value="">-- Selecciona la jugadora que sale --</option>
                  {onFieldPlayers.map(p => {
                    const pos = currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion);
                    return (
                      <option key={p.playerId} value={p.playerId}>
                        #{p.dorsal} {p.nombre} {p.apellidos} ({pos} • {p.minutos ?? 0}')
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. JUGADORA QUE ENTRA (DEL BANQUILLO) */}
              <div className="bg-slate-950/80 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>2. Jugadora que ENTRA al Campo (Banquillo)</span>
                </span>

                <select
                  value={selectedEntraId}
                  onChange={(e) => setSelectedEntraId(e.target.value)}
                  className="w-full bg-slate-900 text-white font-bold text-sm py-2 px-3 rounded-lg border border-emerald-500/40 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="">-- Selecciona la jugadora suplente --</option>
                  {benchPlayers.map(p => {
                    const pos = p.posicionActiva || getDefaultCampoPosition(p.posicion);
                    return (
                      <option key={p.playerId} value={p.playerId}>
                        #{p.dorsal} {p.nombre} {p.apellidos} (Habitual: {pos})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. POSICIÓN EN LA QUE COLOCAMOS A LA QUE ENTRA + MINUTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Posición Asignada */}
                <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3 space-y-1.5">
                  <label className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Posición de la que entra</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Posición en la que jugará en el campo
                  </p>
                  <select
                    value={selectedPosicionEntra}
                    onChange={(e) => setSelectedPosicionEntra(e.target.value)}
                    className="w-full bg-slate-900 text-white font-bold text-xs sm:text-sm py-2 px-2.5 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <optgroup label="Portería">
                      <option value="Portero">🧤 Portero</option>
                    </optgroup>
                    <optgroup label="Defensa">
                      <option value="Central Diestro">🛡️ Central Diestro</option>
                      <option value="Central Zurdo">🛡️ Central Zurdo</option>
                      <option value="Lateral Derecho">🏃 Lateral Derecho</option>
                      <option value="Lateral Izquierdo">🏃 Lateral Izquierdo</option>
                    </optgroup>
                    <optgroup label="Mediocampo">
                      <option value="Medio Centro">🧠 Medio Centro</option>
                      <option value="Interior Derecha">⚡ Interior Derecha</option>
                      <option value="Interior Izquierda">⚡ Interior Izquierda</option>
                    </optgroup>
                    <optgroup label="Ataque / Extremos">
                      <option value="Extremo Derecha">🚀 Extremo Derecha</option>
                      <option value="Extremo Izquierda">🚀 Extremo Izquierda</option>
                      <option value="Delantero">🎯 Delantero</option>
                    </optgroup>
                  </select>
                </div>

                {/* Minuto del Cambio */}
                <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3 space-y-1.5">
                  <label className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Minuto del cambio</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Calculado del cronómetro en vivo
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.max(1, prev - 5))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Restar 5 minutos"
                    >
                      -5'
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.max(1, prev - 1))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Restar 1 minuto"
                    >
                      -1'
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={subMinute}
                      onChange={(e) => setSubMinute(parseInt(e.target.value) || 1)}
                      className="w-16 text-center bg-slate-900 text-white font-mono font-black text-sm py-1.5 rounded border border-cyan-500/40 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.min(120, prev + 1))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Sumar 1 minuto"
                    >
                      +1'
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.min(120, prev + 5))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Sumar 5 minutos"
                    >
                      +5'
                    </button>
                  </div>
                </div>

              </div>

              {/* Confirmation Preview */}
              {salePlayerObj && entraPlayerObj && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Minuto {subMinute}': Sale <strong>#{salePlayerObj.dorsal} {salePlayerObj.nombre}</strong> ➔ Entra <strong>#{entraPlayerObj.dorsal} {entraPlayerObj.nombre}</strong> en <strong>{selectedPosicionEntra}</strong>
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubModalOpen(false)}
                className="h-9 px-4 text-xs font-bold border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubstitution}
                disabled={!selectedSaleId || !selectedEntraId}
                className="h-9 px-5 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Confirmar Sustitución</span>
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export interface MatchDurationConfig {
  totalMinutes: number;
  halfMinutes: number;
  categoryName: string;
  partsLabel: string;
}

/**
 * Returns the official match duration in minutes based on category/team:
 * - Infantil (Infantil A, B, C): 70 minutos (2 partes de 35 minutos)
 * - Cadete (Cadete A, B): 80 minutos (2 partes de 40 minutos)
 * - Juvenil y Senior (Juvenil A, B, Senior Femenino, Senior Masculino): 90 minutos (2 partes de 45 minutos)
 * - Default / Fallback: 90 minutos (2 partes de 45 minutos)
 */
export function getCategoryMatchDuration(teamOrCategory?: string): MatchDurationConfig {
  const normalized = (teamOrCategory || '').toUpperCase().trim();

  // Infantil: 70 min (2 x 35 min)
  if (normalized.includes('INFANTIL')) {
    return {
      totalMinutes: 70,
      halfMinutes: 35,
      categoryName: 'Infantil',
      partsLabel: '2 partes de 35 min (70 min)'
    };
  }

  // Cadete: 80 min (2 x 40 min)
  if (normalized.includes('CADETE')) {
    return {
      totalMinutes: 80,
      halfMinutes: 40,
      categoryName: 'Cadete',
      partsLabel: '2 partes de 40 min (80 min)'
    };
  }

  // Alevín: 60 min (2 x 30 min)
  if (normalized.includes('ALEVIN') || normalized.includes('ALEVÍN')) {
    return {
      totalMinutes: 60,
      halfMinutes: 30,
      categoryName: 'Alevín',
      partsLabel: '2 partes de 30 min (60 min)'
    };
  }

  // Benjamín / Prebenjamín: 50 min (2 x 25 min)
  if (
    normalized.includes('BENJAMIN') || 
    normalized.includes('BENJAMÍN') || 
    normalized.includes('PREBENJAMIN') || 
    normalized.includes('PREBENJAMÍN') || 
    normalized.includes('PRE BENJAMIN')
  ) {
    return {
      totalMinutes: 50,
      halfMinutes: 25,
      categoryName: 'Benjamín',
      partsLabel: '2 partes de 25 min (50 min)'
    };
  }

  // Juvenil y Senior (y fútbol 11 estándar): 90 min (2 x 45 min)
  const isJuvenil = normalized.includes('JUVENIL');
  const isSenior = normalized.includes('SENIOR');
  const catName = isJuvenil ? 'Juvenil' : isSenior ? 'Senior' : 'Fútbol 11';

  return {
    totalMinutes: 90,
    halfMinutes: 45,
    categoryName: catName,
    partsLabel: '2 partes de 45 min (90 min)'
  };
}

/**
 * Normalizes match player minutes based on the team's official category duration.
 * For example, in Infantil teams (where regulation matches are 70 minutes),
 * if older records or templates saved starters with 80 or 90 minutes,
 * this function converts them to the regulation 70 minutes (or scales proportionally).
 */
export function normalizeMatchMinutesForTeam(match: any, teamName?: string): any {
  if (!match || !match.estadisticas) return match;
  const targetTeam = teamName || match.team_id || match.team_name;
  const config = getCategoryMatchDuration(targetTeam);
  const targetTotal = config.totalMinutes;

  const currentStats = match.estadisticas?.jugadoras_stats;
  if (!Array.isArray(currentStats) || currentStats.length === 0) return match;

  let changed = false;
  const updatedStats = currentStats.map((st: any) => {
    let mins = st.minutos;
    if (mins === undefined || mins === null) return st;

    let targetMins = mins;
    // If a starter was recorded with 80 or 90 min in an Infantil team (70 min regulation):
    if (targetTotal === 70) {
      if (mins === 80 || mins === 90 || mins > 70) {
        targetMins = 70;
      } else if (mins === 40 && st.suplente) {
        // Half-game substitution: 40 min -> 35 min
        targetMins = 35;
      }
    } else if (targetTotal === 80) {
      if (mins > 80 || (st.titular && !st.suplente && mins === 90)) {
        targetMins = 80;
      }
    } else if (targetTotal === 90) {
      if (mins > 90) {
        targetMins = 90;
      }
    }

    if (targetMins !== mins) {
      changed = true;
      const updatedPos = { ...(st.stats_por_posicion || {}) };
      Object.keys(updatedPos).forEach(pos => {
        if (updatedPos[pos]?.minutos && updatedPos[pos].minutos > targetTotal) {
          updatedPos[pos] = { ...updatedPos[pos], minutos: targetTotal };
        } else if (targetTotal === 70 && (updatedPos[pos]?.minutos === 80 || updatedPos[pos]?.minutos === 90)) {
          updatedPos[pos] = { ...updatedPos[pos], minutos: 70 };
        }
      });
      return {
        ...st,
        minutos: targetMins,
        stats_por_posicion: Object.keys(updatedPos).length > 0 ? updatedPos : st.stats_por_posicion
      };
    }
    return st;
  });

  if (!changed) return match;

  return {
    ...match,
    estadisticas: {
      ...match.estadisticas,
      jugadoras_stats: updatedStats
    }
  };
}

/**
 * Migrates all stored matches in localStorage to respect official category durations:
 * - Infantil: max 70 min
 * - Cadetes: max 80 min
 * - Juvenil/Senior: max 90 min
 */
export function migrateAllStoredMatches(): void {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('team_matches_')) {
        const team = key.replace('team_matches_', '');
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let listChanged = false;
            const updated = list.map(m => {
              const norm = normalizeMatchMinutesForTeam(m, team);
              if (norm !== m) listChanged = true;
              return norm;
            });
            if (listChanged) {
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error migrating stored match minutes:', e);
  }
}

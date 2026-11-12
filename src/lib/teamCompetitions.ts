import { CLUB_TEAMS } from '@/types';
import { RIVAL_TEAMS } from '@/data/rivalStatsData';
import { RivalTeam } from '@/types/rivals';
import { TeamCompetitionConfig } from '@/types/competitions';

const STORAGE_KEY = 'club_teams_competition_configs_v2';
export const COMPETITION_UPDATED_EVENT = 'club_competition_config_updated';

// Default baseline: As requested, all teams start with Grupo 50 de Segunda Infantil
export function createDefaultConfigForTeam(teamName: string): TeamCompetitionConfig {
  const cleanTeam = teamName.toUpperCase();
  
  // Clone the Grupo 50 rivals but customize the "isMyTeam" entry for this specific club team
  const rivals: RivalTeam[] = RIVAL_TEAMS.map(r => {
    if (r.isMyTeam) {
      return {
        ...r,
        name: `S.A.D. FUNDACION ESCUELA DE FUTBOL AFE (${cleanTeam})`,
        shortName: `Fundación AFE (${cleanTeam})`,
        isMyTeam: true
      };
    }
    return { ...r };
  });

  return {
    teamName,
    categoryName: cleanTeam === 'INFANTIL B' 
      ? 'Segunda Infantil - Grupo 50' 
      : `Segunda Infantil - Grupo 50 (${cleanTeam})`,
    temporada: '2026-2027',
    temporadaId: '22',
    competicionId: '26738324',
    grupoId: '27306559',
    federationName: 'Real Federación de Fútbol de Madrid (RFFM)',
    urlCalendario: 'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559',
    urlClasificacion: 'https://www.rffm.es/competicion/clasificaciones?temporada=22&competicion=26738324&grupo=27306559',
    urlActas: 'https://www.rffm.es/competiciones/acta',
    rivals,
    notes: 'Configuración inicial cargada con el Grupo 50 de Segunda Infantil.',
    updatedAt: new Date().toISOString()
  };
}

export function getAllTeamCompetitionConfigs(): Record<string, TeamCompetitionConfig> {
  const result: Record<string, TeamCompetitionConfig> = {};
  
  // Initialize defaults for every team in CLUB_TEAMS
  CLUB_TEAMS.forEach(team => {
    result[team] = createDefaultConfigForTeam(team);
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(team => {
        if (parsed[team]) {
          result[team] = {
            ...result[team],
            ...parsed[team],
            rivals: Array.isArray(parsed[team].rivals) && parsed[team].rivals.length > 0 
              ? parsed[team].rivals 
              : result[team]?.rivals || RIVAL_TEAMS
          };
        }
      });
    }
  } catch (err) {
    console.error('Error reading team competition configs:', err);
  }

  return result;
}

export function getTeamCompetitionConfig(teamName: string): TeamCompetitionConfig {
  const all = getAllTeamCompetitionConfigs();
  if (all[teamName]) {
    return all[teamName];
  }
  return createDefaultConfigForTeam(teamName);
}

export function saveTeamCompetitionConfig(config: TeamCompetitionConfig): void {
  const all = getAllTeamCompetitionConfigs();
  all[config.teamName] = {
    ...config,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Error saving team competition config:', err);
  }

  // Notify active listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMPETITION_UPDATED_EVENT, { 
      detail: { teamName: config.teamName } 
    }));
  }
}

export function getTeamRivals(teamName: string): RivalTeam[] {
  const config = getTeamCompetitionConfig(teamName);
  if (config.rivals && config.rivals.length > 0) {
    return config.rivals;
  }
  return RIVAL_TEAMS;
}

export function resetTeamCompetitionConfig(teamName: string): TeamCompetitionConfig {
  const fresh = createDefaultConfigForTeam(teamName);
  saveTeamCompetitionConfig(fresh);
  return fresh;
}

export function resetAllTeamCompetitionConfigs(): Record<string, TeamCompetitionConfig> {
  const result: Record<string, TeamCompetitionConfig> = {};
  CLUB_TEAMS.forEach(team => {
    result[team] = createDefaultConfigForTeam(team);
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch (err) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMPETITION_UPDATED_EVENT, { 
      detail: { all: true } 
    }));
  }
  return result;
}

export async function extractAndSyncFromCalendarUrl(
  teamName: string, 
  calendarUrl: string
): Promise<TeamCompetitionConfig> {
  const cleanUrl = calendarUrl.trim();
  if (!cleanUrl) {
    throw new Error('Debes indicar la URL del calendario de la Federación (RFFM).');
  }

  const response = await fetch('/api/rffm/extract-calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calendarUrl: cleanUrl, teamName })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error del servidor federativo (${response.status}).`);
  }

  const data = await response.json();
  if (!data.ok || !data.rivals || data.rivals.length === 0) {
    throw new Error('No se pudieron extraer rivales válidos desde el calendario especificado.');
  }

  const current = getTeamCompetitionConfig(teamName);
  const updated: TeamCompetitionConfig = {
    ...current,
    teamName,
    categoryName: data.categoryName || current.categoryName,
    temporada: data.temporada || current.temporada || '2026-2027',
    temporadaId: data.temporadaId || '22',
    competicionId: data.competicionId || '',
    grupoId: data.grupoId || '',
    federationName: data.federationName || 'Real Federación de Fútbol de Madrid (RFFM)',
    urlCalendario: cleanUrl,
    urlClasificacion: data.urlClasificacion || current.urlClasificacion,
    urlActas: data.urlActas || 'https://www.rffm.es/competiciones/acta',
    rivals: data.rivals,
    matches: data.matches || [],
    jornadasDisputadas: data.jornadasDisputadas || [],
    lastSync: data.lastSync || new Date().toISOString(),
    notes: `Extraído automáticamente del calendario oficial: ${data.categoryName} (${data.rivals.length} equipos, ${data.matches?.length || 0} partidos con actas).`,
    updatedAt: new Date().toISOString()
  };

  saveTeamCompetitionConfig(updated);
  return updated;
}


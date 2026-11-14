import {
  COLLECTIVE_MATCHES,
  computeAllCollectiveStats
} from '@/data/rivalStatsData';
import {
  CollectiveCardEvent,
  CollectiveGoalEvent,
  Franja15Min,
  RivalMatchCollective,
  RivalTeam,
  TeamCollectiveStats
} from '@/types/rivals';
import { TeamCompetitionConfig } from '@/types/competitions';
import {
  extractAndSyncFromCalendarUrl,
  getTeamCompetitionConfig
} from './teamCompetitions';
import {
  getTeamActasData,
  syncTeamActasFromFederation
} from './actasArbitrales';
import { TeamActasDatabase } from '@/types/actas';

function mapMinuteToFranja(min: number): Franja15Min {
  if (min <= 15) return '0-15';
  if (min <= 30) return '16-30';
  if (min <= 35) return '31-35';
  if (min <= 50) return '36-50';
  if (min <= 65) return '51-65';
  return '66-70';
}

function normalizeName(s: string): string {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findRivalTeamId(name: string, rivals: RivalTeam[]): string | null {
  if (!name) return null;
  const upper = name.trim().toUpperCase();
  const exact = rivals.find(
    (r) => r.name.trim().toUpperCase() === upper || r.shortName.trim().toUpperCase() === upper
  );
  if (exact) return exact.id;

  const norm = normalizeName(name);
  const byNorm = rivals.find((r) => {
    const rn = normalizeName(r.name);
    const rs = normalizeName(r.shortName);
    return rn === norm || rs === norm || (norm.length >= 5 && (rn.includes(norm) || norm.includes(rn)));
  });
  return byNorm ? byNorm.id : null;
}

function findRivalSummaryMatch(
  team: RivalTeam,
  rivalsSummary: TeamActasDatabase['rivalsSummary']
) {
  if (!rivalsSummary) return null;
  const entries = Object.values(rivalsSummary);
  const tUpper = team.name.trim().toUpperCase();
  const tNorm = normalizeName(team.name);
  const sNorm = normalizeName(team.shortName);

  return (
    entries.find((e) => e.name.trim().toUpperCase() === tUpper) ||
    entries.find((e) => {
      const eNorm = normalizeName(e.name);
      return eNorm === tNorm || eNorm === sNorm || (sNorm.length >= 5 && eNorm.includes(sNorm));
    }) ||
    null
  );
}

/**
 * Computes live TeamCollectiveStats for any team's active RFFM competition config,
 * combining synced calendar matches, official RFFM standings, and detailed actas arbitrales.
 */
export function computeLiveTeamCollectiveStats(
  teamName: string,
  config: TeamCompetitionConfig
): TeamCollectiveStats[] {
  const rivals = config.rivals || [];
  const hasSyncedMatches = Array.isArray(config.matches) && config.matches.length > 0;
  const isCustomOrSynced =
    Boolean(config.lastSync) ||
    (config.competicionId && config.competicionId !== '26738324') ||
    hasSyncedMatches;

  // Before any RFFM sync on the default Grupo 50 competition, keep rich baseline matches
  if (!isCustomOrSynced) {
    return computeAllCollectiveStats(COLLECTIVE_MATCHES, 'all', undefined, rivals);
  }

  const actasDb = getTeamActasData(teamName);
  const detailedActas = actasDb.actas || [];

  const liveMatches: RivalMatchCollective[] = (config.matches || [])
    .map((m, idx): RivalMatchCollective | null => {
      const localId = findRivalTeamId(m.local, rivals);
      const visitId = findRivalTeamId(m.visitante, rivals);
      if (!localId || !visitId) return null;

      const glRaw = m.golesLocal;
      const gvRaw = m.golesVisitante;
      const hasScore =
        glRaw !== '' && glRaw !== null && glRaw !== undefined &&
        gvRaw !== '' && gvRaw !== null && gvRaw !== undefined &&
        !isNaN(Number(glRaw)) && !isNaN(Number(gvRaw));

      const gl = hasScore ? Number(glRaw) : undefined;
      const gv = hasScore ? Number(gvRaw) : undefined;
      const matchId = m.id || `live-m-${m.jornada}-${idx}`;

      // Match against detailed acta if present for goal minutes & cards
      const matchedActa = detailedActas.find(
        (a) =>
          (m.codacta && a.codacta === m.codacta) ||
          (a.jornada === m.jornada &&
            normalizeName(a.local) === normalizeName(m.local) &&
            normalizeName(a.visitante) === normalizeName(m.visitante))
      );

      const goalEvents: CollectiveGoalEvent[] = [];
      const cardEvents: CollectiveCardEvent[] = [];

      if (matchedActa) {
        (matchedActa.goles || []).forEach((g, gIdx) => {
          const min = parseInt(String(g.minuto || '0'), 10) || 1;
          const franja = mapMinuteToFranja(min);
          const scorerTeamId = g.equipo === 'local' ? localId : visitId;
          const concededTeamId = g.equipo === 'local' ? visitId : localId;
          goalEvents.push({
            id: `${matchId}-gf-${gIdx}`,
            matchId,
            teamId: scorerTeamId,
            minuto: min,
            franja,
            esFavor: true
          });
          goalEvents.push({
            id: `${matchId}-gc-${gIdx}`,
            matchId,
            teamId: concededTeamId,
            minuto: min,
            franja,
            esFavor: false
          });
        });

        (matchedActa.tarjetas || []).forEach((c, cIdx) => {
          const min = parseInt(String(c.minuto || '0'), 10) || 1;
          const cardTeamId = c.equipo === 'local' ? localId : visitId;
          cardEvents.push({
            id: `${matchId}-c-${cIdx}`,
            matchId,
            teamId: cardTeamId,
            minuto: min,
            tipo: c.tipo === 'roja' ? 'Roja_Directa' : 'Amarilla'
          });
        });
      }

      return {
        id: matchId,
        jornada: m.jornada,
        fecha: m.fecha || '',
        hora: m.hora || '',
        campo: m.campo || '',
        localTeamId: localId,
        visitanteTeamId: visitId,
        golesLocal: gl,
        golesVisitante: gv,
        jugado: Boolean(hasScore || m.disputado),
        actaCerrada: Boolean(hasScore || m.disputado),
        goalEvents,
        cardEvents
      };
    })
    .filter((m): m is RivalMatchCollective => m !== null);

  // Use base collective engine for home/away, clean sheets, evolution, goal timing
  const computed = computeAllCollectiveStats(liveMatches, 'all', undefined, rivals);

  // Overlay official RFFM clasificacion totals & actas discipline counts so table always matches RFFM 100%
  const merged = computed.map((item) => {
    const r = item.team;
    const hasOfficialStandings =
      typeof r.matchesPlayed === 'number' &&
      typeof r.points === 'number' &&
      (r.matchesPlayed > 0 || r.points > 0 || (r.position ?? 0) > 0);

    const pj = hasOfficialStandings ? (r.matchesPlayed ?? item.pj) : item.pj;
    const pg = hasOfficialStandings ? (r.won ?? item.pg) : item.pg;
    const pe = hasOfficialStandings ? (r.drawn ?? item.pe) : item.pe;
    const pp = hasOfficialStandings ? (r.lost ?? item.pp) : item.pp;
    const gf = hasOfficialStandings ? (r.goalsFor ?? item.gf) : item.gf;
    const gc = hasOfficialStandings ? (r.goalsAgainst ?? item.gc) : item.gc;
    const puntos = hasOfficialStandings ? (r.points ?? item.puntos) : item.puntos;
    const dg = gf - gc;
    const promedioGf = pj > 0 ? parseFloat((gf / pj).toFixed(2)) : 0;
    const promedioGc = pj > 0 ? parseFloat((gc / pj).toFixed(2)) : 0;

    // Merge discipline from actas rivalsSummary if available
    const rActa = findRivalSummaryMatch(r, actasDb.rivalsSummary);
    let discipline = item.discipline;
    if (rActa && (rActa.amarillas > discipline.amarillas || rActa.rojas > discipline.rojasDirectas)) {
      const amarillas = Math.max(discipline.amarillas, rActa.amarillas);
      const rojasDirectas = Math.max(discipline.rojasDirectas, rActa.rojas);
      const doblesAmarillas = discipline.doblesAmarillas;
      const totalTarjetas = amarillas + rojasDirectas + doblesAmarillas;
      const promedioPorPartido = pj > 0 ? parseFloat((totalTarjetas / pj).toFixed(2)) : 0;
      const puntosFairPlay = amarillas * 1 + doblesAmarillas * 3 + rojasDirectas * 5;
      discipline = {
        amarillas,
        rojasDirectas,
        doblesAmarillas,
        totalTarjetas,
        promedioPorPartido,
        puntosFairPlay
      };
    }

    return {
      ...item,
      pos: r.position && r.position > 0 ? r.position : item.pos,
      puntos,
      pj,
      pg,
      pe,
      pp,
      gf,
      gc,
      dg,
      promedioGf,
      promedioGc,
      discipline
    };
  });

  // Sort by official RFFM position if present, else by points/dg/gf
  merged.sort((a, b) => {
    if (a.team.position && b.team.position && a.team.position !== b.team.position) {
      return a.team.position - b.team.position;
    }
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.name.localeCompare(b.team.name);
  });

  return merged.map((item, idx) => ({
    ...item,
    pos: idx + 1
  }));
}

/**
 * Full 2-step live RFFM sync for any club team:
 * 1) Extracts standings, rivals, calendar matches, and disputed jornadas
 * 2) Syncs detailed referee match reports (goals, cards, minutes, sanctions)
 */
export async function syncTeamWithFederationFull(teamName: string): Promise<{
  config: TeamCompetitionConfig;
  actas: TeamActasDatabase | null;
  latestJornada: number;
}> {
  const current = getTeamCompetitionConfig(teamName);
  const calendarUrl =
    current.urlCalendario ||
    'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559';

  const updatedConfig = await extractAndSyncFromCalendarUrl(teamName, calendarUrl);

  let updatedActas: TeamActasDatabase | null = null;
  try {
    updatedActas = await syncTeamActasFromFederation(teamName, calendarUrl);
  } catch (err) {
    console.warn('Actas detailed sync partial/skipped:', err);
  }

  const jornadas = updatedConfig.jornadasDisputadas || [];
  const latestJornada =
    jornadas.length > 0
      ? Math.max(...jornadas)
      : (updatedConfig.matches || []).reduce((max, m) => Math.max(max, m.jornada || 0), 0) || 1;

  return {
    config: updatedConfig,
    actas: updatedActas,
    latestJornada
  };
}

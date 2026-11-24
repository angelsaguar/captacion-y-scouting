import { applyApiCors, authorizeClubRequest } from "../../src/server/clubAuth";
import { validateRffmParams, validateRffmJornada, validateRffmActaCode, validateRffmTeamName, validateRffmCalendarUrl } from "../../src/server/rffmValidation";

const RFFM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

function normalizeSeasonParam(rawSeason: string): string {
  const s = (rawSeason || '').trim();
  if (!s) return '22';
  if (/^\d{1,3}$/.test(s)) return s;
  if (s.includes('2026') && s.includes('2027')) return '22';
  if (s.includes('2025') && s.includes('2026')) return '21';
  if (s.includes('2024') && s.includes('2025')) return '20';
  if (s.includes('2023') && s.includes('2024')) return '19';
  return s;
}

function parseRffmUrlParams(input: {
  calendarUrl?: string;
  temporada?: string;
  competicion?: string;
  grupo?: string;
  tipojuego?: string;
}) {
  let rawUrl = (input.calendarUrl || '').toString().trim().replace(/&amp;/gi, '&');
  try {
    if (/%3D|%26/i.test(rawUrl)) rawUrl = decodeURIComponent(rawUrl);
  } catch {
    // Keep original
  }

  let temporada = (input.temporada || '').toString().trim();
  let competicion = (input.competicion || '').toString().trim();
  let grupo = (input.grupo || '').toString().trim();
  let tipojuego = (input.tipojuego || '').toString().trim();

  if (rawUrl) {
    const urlCandidates = rawUrl.match(/https?:\/\/[^\s]+/gi) || [rawUrl];
    for (const candidate of urlCandidates) {
      try {
        const parsed = new URL(candidate.startsWith('http') ? candidate : `https://${candidate}`);
        const lowerParams = new Map<string, string>();
        parsed.searchParams.forEach((val, key) => lowerParams.set(key.toLowerCase(), val.trim()));

        temporada =
          lowerParams.get('temporada') ||
          lowerParams.get('cod_temporada') ||
          lowerParams.get('codtemporada') ||
          temporada;
        competicion =
          lowerParams.get('competicion') ||
          lowerParams.get('cod_competicion') ||
          lowerParams.get('codcompeticion') ||
          competicion;
        grupo =
          lowerParams.get('grupo') ||
          lowerParams.get('cod_grupo') ||
          lowerParams.get('codgrupo') ||
          grupo;
        tipojuego =
          lowerParams.get('tipojuego') ||
          lowerParams.get('tipo_juego') ||
          lowerParams.get('cod_tipo_juego') ||
          lowerParams.get('codtipojuego') ||
          tipojuego;
        if (competicion && grupo) break;
      } catch {
        // Regex fallback
      }
    }
    if (!temporada) {
      const m = rawUrl.match(/(?:temporada|cod_temporada|codtemporada)=([^&#\s]+)/i);
      if (m) temporada = m[1];
    }
    if (!competicion) {
      const m = rawUrl.match(/(?:competicion|cod_competicion|codcompeticion)=(\d+)/i);
      if (m) competicion = m[1];
    }
    if (!grupo) {
      const m = rawUrl.match(/(?:grupo|cod_grupo|codgrupo)=(\d+)/i);
      if (m) grupo = m[1];
    }
    if (!tipojuego) {
      const m = rawUrl.match(/(?:tipojuego|tipo_juego|codtipojuego|cod_tipo_juego)=(\d+)/i);
      if (m) tipojuego = m[1];
    }
  }

  return {
    temporada: normalizeSeasonParam(temporada) || '22',
    competicion: competicion || '26738324',
    grupo: grupo || '27306559',
    tipojuego: tipojuego || '1'
  };
}

function extractNextData(html: string): any | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function fetchRffmPageProps(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(url, { headers: RFFM_HEADERS, signal: controller.signal });
    if (!resp.ok) return null;
    const html = await resp.text();
    return extractNextData(html)?.props?.pageProps || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseSpanishDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  if (isNaN(d) || isNaN(mo) || isNaN(y)) return null;
  return new Date(y, mo, d, 23, 59, 59);
}

function isOurClubTeamName(rawName: string, targetTeamName?: string): boolean {
  const upper = (rawName || '').toUpperCase();
  if (!upper) return false;
  if (/\bAFE\b/.test(upper)) return true;
  if (upper.includes('FUNDACION ESCUELA DE FUTBOL AFE')) return true;
  if (upper.includes('FUNDACIÓN AFE') || upper.includes('FUNDACION AFE')) return true;
  if (targetTeamName) {
    const cleanTarget = targetTeamName.toUpperCase().trim();
    if (cleanTarget.length >= 4 && upper.includes(cleanTarget)) return true;
  }
  return false;
}

function cleanTeamShortName(rawName: string): string {
  let short = (rawName || '')
    .trim()
    .toUpperCase()
    .replace(/^C\.D\.\s*/i, '')
    .replace(/^S\.A\.D\.\s*/i, '')
    .replace(/^A\.D\.\s*/i, '')
    .replace(/^E\.F\.\s*/i, '')
    .replace(/^CLUB\s*/i, '')
    .replace(/^ASOCIACION\s*/i, '')
    .replace(/^SECCION\s+DEPORTIVA\s+DEL\s*/i, 'S.D. Del ')
    .replace(/^ESCUELA\s+DE\s+FUTBOL\s*/i, 'E.F. ')
    .trim();
  if (short.length > 22) short = short.substring(0, 22).trim();
  return short || rawName;
}

function getDuration(teamOrCategory: string) {
  const normalized = (teamOrCategory || '').toUpperCase().trim();
  if (normalized.includes('INFANTIL')) return { totalMinutes: 70, halfMinutes: 35 };
  if (normalized.includes('CADETE')) return { totalMinutes: 80, halfMinutes: 40 };
  if (normalized.includes('ALEVIN') || normalized.includes('ALEVÍN')) return { totalMinutes: 60, halfMinutes: 30 };
  if (normalized.includes('BENJAMIN') || normalized.includes('BENJAMÍN') || normalized.includes('PREBENJAM')) {
    return { totalMinutes: 50, halfMinutes: 25 };
  }
  return { totalMinutes: 90, halfMinutes: 45 };
}

export default async function handler(req: any, res: any) {
  if (!applyApiCors(req, res, ["GET", "POST"])) {
    return res.status(403).json({ error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authorization = await authorizeClubRequest(
    req.headers?.authorization,
    ["estadisticas-rivales", "gestion-equipo"]
  );
  if (authorization.ok === false) {
    return res.status(authorization.statusCode).json({ error: authorization.error });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const query = req.query || {};

    const calendarUrl = (body.calendarUrl || query.calendarUrl || body.url || query.url || '').toString();
    const urlError = validateRffmCalendarUrl(calendarUrl);
    if (urlError) return res.status(400).json({ error: urlError });

    const parsed = parseRffmUrlParams({
      calendarUrl: (body.calendarUrl || query.calendarUrl || body.url || query.url || '').toString(),
      temporada: (body.temporada || query.temporada || '').toString(),
      competicion: (body.competicion || query.competicion || '').toString(),
      grupo: (body.grupo || query.grupo || '').toString(),
      tipojuego: (body.tipojuego || query.tipojuego || '').toString()
    });

    const { temporada, competicion, grupo } = parsed;
    let tipojuego = parsed.tipojuego;
    const paramsError = validateRffmParams(parsed);
    if (paramsError) return res.status(400).json({ error: paramsError });
    const targetTeamName = (body.teamName || query.teamName || 'INFANTIL B').toString().trim();
    const teamNameError = validateRffmTeamName(targetTeamName);
    if (teamNameError) return res.status(400).json({ error: teamNameError });

    let calendar: any = null;
    const [calFirst, stFirst, resFirst] = await Promise.all([
      fetchRffmPageProps(
        `https://www.rffm.es/competicion/calendario?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`
      ),
      fetchRffmPageProps(
        `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`
      ),
      fetchRffmPageProps(
        `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`
      )
    ]);
    const standingsData = stFirst?.standings || null;
    const activeResults = resFirst?.results || null;

    if (calFirst?.calendar?.rounds?.length > 0) {
      calendar = calFirst.calendar;
    } else {
      const others = ['1', '2', '3'].filter((t) => t !== tipojuego);
      const otherRes = await Promise.all(
        others.map(async (tj) => ({
          tj,
          cal: (
            await fetchRffmPageProps(
              `https://www.rffm.es/competicion/calendario?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tj}`
            )
          )?.calendar
        }))
      );
      const found = otherRes.find((x) => x.cal?.rounds?.length > 0);
      if (found) {
        calendar = found.cal;
        tipojuego = found.tj;
      }
    }

    let categoryName = 'Competición RFFM';
    const matchesToProcess: Array<{ codacta: string; jornada: number }> = [];
    const seenCodactas = new Set<string>();

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const activeResJornada = parseInt(activeResults?.jornada || '0', 10) || 0;
    const maxStandingsJugados = (standingsData?.clasificacion || []).reduce(
      (max: number, t: any) => Math.max(max, parseInt(t.jugados, 10) || 0),
      0
    );
    const latestTargetJornada = Math.max(activeResJornada, maxStandingsJugados);

    if (calendar) {
      const compLabel = (calendar.competicion || '').trim();
      const grpLabel = (calendar.grupo || '').trim();
      if (compLabel || grpLabel) {
        categoryName = `${compLabel}${grpLabel ? ` - ${grpLabel}` : ''}`.trim();
      }
      for (const round of calendar.rounds || []) {
        const jNum = parseInt(round.codjornada, 10);
        if (isNaN(jNum)) continue;
        const roundDate = parseSpanishDate(round.jornada);
        for (const p of round.equipos || []) {
          if (!p.codacta) continue;
          const hasScore =
            (p.goles_casa !== '' && p.goles_casa !== null && p.goles_casa !== undefined) ||
            (p.goles_visitante !== '' && p.goles_visitante !== null && p.goles_visitante !== undefined);
          const matchDate = parseSpanishDate(p.fecha) || roundDate;
          const isEligible = hasScore || jNum <= latestTargetJornada || (matchDate !== null && matchDate <= todayEnd);
          if (!isEligible) continue;
          if ((isOurClubTeamName(p.equipo_local, targetTeamName) || isOurClubTeamName(p.equipo_visitante, targetTeamName)) && !seenCodactas.has(String(p.codacta))) {
            seenCodactas.add(String(p.codacta));
            matchesToProcess.push({ codacta: p.codacta, jornada: jNum });
          }
        }
      }
    }

    if (activeResJornada > 0 && Array.isArray(activeResults?.partidos)) {
      for (const p of activeResults.partidos) {
        if (!p.codacta || seenCodactas.has(String(p.codacta))) continue;
        if (isOurClubTeamName(p.Nombre_equipo_local, targetTeamName) || isOurClubTeamName(p.Nombre_equipo_visitante, targetTeamName)) {
          seenCodactas.add(String(p.codacta));
          matchesToProcess.push({ codacta: p.codacta, jornada: activeResJornada });
        }
      }
    }

    const duration = getDuration(targetTeamName || categoryName);
    const playersSummary: Record<string, any> = {};
    const rivalsSummary: Record<string, any> = {};
    const detailedActas: any[] = [];

    matchesToProcess.sort((a, b) => a.jornada - b.jornada);
    if (matchesToProcess.length > 60) {
      return res.status(400).json({ error: "La consulta supera el máximo de 60 actas por ejecución." });
    }
    for (const item of matchesToProcess) {
      if (validateRffmActaCode(String(item.codacta))) {
        return res.status(502).json({ error: "La Federación ha devuelto un código de acta con formato no válido." });
      }
    }

    const fetchedActas: Array<{ item: { codacta: string; jornada: number }; g: any }> = [];
    for (let i = 0; i < matchesToProcess.length; i += 6) {
      const batch = matchesToProcess.slice(i, i + 6);
      const batchGames = await Promise.all(
        batch.map(async (item) => {
          const props = await fetchRffmPageProps(`https://www.rffm.es/acta-partido/${item.codacta}`);
          const g = props?.game;
          const hasMatchData =
            g &&
            (g.equipo_local || g.equipo_visitante) &&
            (g.acta_cerrada === '1' ||
              (g.goles_local !== '' && g.goles_local !== null && g.goles_local !== undefined) ||
              (g.jugadores_equipo_local?.length > 0) ||
              (g.jugadores_equipo_visitante?.length > 0));
          return hasMatchData ? { item, g } : null;
        })
      );
      batchGames.forEach((r) => {
        if (r) fetchedActas.push(r);
      });
    }

    for (const { item, g } of fetchedActas) {
      const isLocalAfe = isOurClubTeamName(g.equipo_local || '', targetTeamName);
      const rivalTeamName = isLocalAfe ? g.equipo_visitante : g.equipo_local;
      const ourPlayers = isLocalAfe ? g.jugadores_equipo_local || [] : g.jugadores_equipo_visitante || [];
      const ourCards = isLocalAfe ? g.tarjetas_equipo_local || [] : g.tarjetas_equipo_visitante || [];
      const ourGoals = isLocalAfe ? g.goles_equipo_local || [] : g.goles_equipo_visitante || [];
      const rivalCards = isLocalAfe ? g.tarjetas_equipo_visitante || [] : g.tarjetas_equipo_local || [];
      const rivalGoals = isLocalAfe ? g.goles_equipo_visitante || [] : g.goles_equipo_local || [];

      for (const p of ourPlayers) {
        const name = (p.nombre_jugador || '').trim().toUpperCase();
        if (!name) continue;
        const parts = name.split(',');
        const short = parts.length > 1 ? parts[1].trim() : name;
        const firstName = short.split(' ')[0];

        if (!playersSummary[name]) {
          playersSummary[name] = {
            nombreCompleto: name,
            nombreCorto: firstName || short,
            dorsal: p.dorsal || '',
            convocatorias: 0,
            titularidades: 0,
            suplencias: 0,
            minutos: 0,
            goles: 0,
            amarillas: 0,
            rojas: 0,
            estaSancionado: false,
            partidosSancion: 0,
            motivoSancion: '',
            esApercibido: false,
            partidos: []
          };
        }

        playersSummary[name].convocatorias += 1;
        const isTitular = p.titular === '1';
        const playedMins = isTitular ? duration.totalMinutes : duration.halfMinutes;
        if (isTitular) {
          playersSummary[name].titularidades += 1;
          playersSummary[name].minutos += duration.totalMinutes;
        } else {
          playersSummary[name].suplencias += 1;
          playersSummary[name].minutos += duration.halfMinutes;
        }

        playersSummary[name].partidos.push({
          jornada: item.jornada,
          rival: rivalTeamName,
          fecha: g.fecha,
          titular: isTitular,
          minutos: playedMins,
          goles: 0,
          amarillas: 0,
          rojas: 0,
          codacta: item.codacta
        });
      }

      for (const c of ourCards) {
        const name = (c.nombre_jugador || '').trim().toUpperCase();
        if (playersSummary[name]) {
          if (c.codigo_tipo_amonestacion === '100') playersSummary[name].amarillas += 1;
          else playersSummary[name].rojas += 1;
        }
      }

      for (const gl of ourGoals) {
        const name = (gl.nombre_jugador || '').trim().toUpperCase();
        if (playersSummary[name]) playersSummary[name].goles += 1;
      }

      if (rivalTeamName && !rivalsSummary[rivalTeamName]) {
        rivalsSummary[rivalTeamName] = {
          name: rivalTeamName,
          shortName: cleanTeamShortName(rivalTeamName),
          partidosJugados: 0,
          amarillas: 0,
          rojas: 0,
          golesFavor: 0,
          golesContra: 0,
          jugadoresAmonestados: [],
          goleadores: []
        };
      }
      if (rivalTeamName && rivalsSummary[rivalTeamName]) {
        rivalsSummary[rivalTeamName].partidosJugados += 1;
        rivalsSummary[rivalTeamName].amarillas += rivalCards.filter((c: any) => c.codigo_tipo_amonestacion === '100').length;
        rivalsSummary[rivalTeamName].rojas += rivalCards.filter((c: any) => c.codigo_tipo_amonestacion !== '100').length;
        rivalsSummary[rivalTeamName].golesFavor += rivalGoals.length;
        rivalsSummary[rivalTeamName].golesContra += ourGoals.length;
        rivalCards.forEach((c: any) => {
          rivalsSummary[rivalTeamName].jugadoresAmonestados.push({
            nombre: c.nombre_jugador,
            jornada: item.jornada,
            minuto: c.minuto || '',
            esRoja: c.codigo_tipo_amonestacion !== '100'
          });
        });
        rivalGoals.forEach((gl: any) => {
          rivalsSummary[rivalTeamName].goleadores.push({
            nombre: gl.nombre_jugador,
            jornada: item.jornada,
            minuto: gl.minuto || ''
          });
        });
      }

      detailedActas.push({
        codacta: item.codacta,
        jornada: item.jornada,
        fecha: g.fecha,
        hora: g.hora,
        campo: g.campo,
        arbitro: g.arbitro || g.arbitros_partido?.[0]?.nombre_arbitro || '',
        local: g.equipo_local,
        visitante: g.equipo_visitante,
        golesLocal: parseInt(g.goles_local, 10) || 0,
        golesVisitante: parseInt(g.goles_visitante, 10) || 0,
        tarjetas: [
          ...(g.tarjetas_equipo_local || []).map((c: any) => ({
            minuto: c.minuto || '',
            nombreJugador: c.nombre_jugador || '',
            dorsal: c.dorsal || '',
            tipo: c.codigo_tipo_amonestacion === '100' ? 'amarilla' : 'roja',
            equipo: 'local'
          })),
          ...(g.tarjetas_equipo_visitante || []).map((c: any) => ({
            minuto: c.minuto || '',
            nombreJugador: c.nombre_jugador || '',
            dorsal: c.dorsal || '',
            tipo: c.codigo_tipo_amonestacion === '100' ? 'amarilla' : 'roja',
            equipo: 'visitante'
          }))
        ],
        goles: [
          ...(g.goles_equipo_local || []).map((gl: any) => ({
            minuto: gl.minuto || '',
            nombreJugador: gl.nombre_jugador || '',
            dorsal: gl.dorsal || '',
            tipo: gl.tipo_gol || 'normal',
            equipo: 'local'
          })),
          ...(g.goles_equipo_visitante || []).map((gl: any) => ({
            minuto: gl.minuto || '',
            nombreJugador: gl.nombre_jugador || '',
            dorsal: gl.dorsal || '',
            tipo: gl.tipo_gol || 'normal',
            equipo: 'visitante'
          }))
        ],
        actaUrl: `https://www.rffm.es/acta-partido/${item.codacta}`
      });
    }

    Object.values(playersSummary).forEach((p: any) => {
      if (p.rojas > 0) {
        p.estaSancionado = true;
        p.partidosSancion = 1;
        p.motivoSancion = 'Expulsión directa en acta arbitral';
      } else if (p.amarillas > 0 && p.amarillas % 5 === 0) {
        p.estaSancionado = true;
        p.partidosSancion = 1;
        p.motivoSancion = `Acumulación de ${p.amarillas} tarjetas amarillas (Ciclo RFFM)`;
      } else if (p.amarillas > 0 && p.amarillas % 5 === 4) {
        p.esApercibido = true;
      }
    });

    return res.status(200).json({
      ok: true,
      data: {
        teamName: targetTeamName,
        categoryName,
        temporada:
          calendar?.temporada ||
          (temporada === '22' ? '2026-2027' : temporada === '21' ? '2025-2026' : '2026-2027'),
        updatedAt: new Date().toISOString(),
        playersSummary,
        rivalsSummary,
        actas: detailedActas
      }
    });
  } catch (err: any) {
    console.error('Error in /api/rffm/sync-actas-detailed:', err);
    return res.status(500).json({
      error: err?.message || 'Error al procesar actas arbitrales.'
    });
  }
}

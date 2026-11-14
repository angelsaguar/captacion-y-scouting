import { getCategoryMatchDuration } from './matchDuration';

const RFFM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

export interface ParsedRffmParams {
  temporada: string;
  competicion: string;
  grupo: string;
  tipojuego: string;
  jornada: string;
}

export function normalizeSeasonParam(rawSeason: string): string {
  const s = (rawSeason || '').trim();
  if (!s) return '22';
  if (/^\d{1,3}$/.test(s)) return s;
  if (s.includes('2026') && s.includes('2027')) return '22';
  if (s.includes('2025') && s.includes('2026')) return '21';
  if (s.includes('2024') && s.includes('2025')) return '20';
  if (s.includes('2023') && s.includes('2024')) return '19';
  return s;
}

export function parseRffmUrlParams(input: {
  calendarUrl?: string;
  temporada?: string;
  competicion?: string;
  grupo?: string;
  tipojuego?: string;
  jornada?: string;
}): ParsedRffmParams {
  let rawUrl = (input.calendarUrl || '').toString().trim().replace(/&amp;/gi, '&');
  try {
    if (/%3D|%26/i.test(rawUrl)) {
      rawUrl = decodeURIComponent(rawUrl);
    }
  } catch {
    // Keep original if malformed encoding
  }

  let temporada = (input.temporada || '').toString().trim();
  let competicion = (input.competicion || '').toString().trim();
  let grupo = (input.grupo || '').toString().trim();
  let tipojuego = (input.tipojuego || '').toString().trim();
  let jornada = (input.jornada || '').toString().trim();

  if (rawUrl) {
    const urlCandidates = rawUrl.match(/https?:\/\/[^\s]+/gi) || [rawUrl];
    for (const candidate of urlCandidates) {
      try {
        const parsed = new URL(candidate.startsWith('http') ? candidate : `https://${candidate}`);
        const lowerParams = new Map<string, string>();
        parsed.searchParams.forEach((val, key) => {
          lowerParams.set(key.toLowerCase(), val.trim());
        });

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

        jornada =
          lowerParams.get('jornada') ||
          lowerParams.get('cod_jornada') ||
          lowerParams.get('codjornada') ||
          jornada;

        if (competicion && grupo) break;
      } catch {
        // Fallback to regex matching below
      }
    }

    if (!temporada) {
      const tMatch = rawUrl.match(/(?:temporada|cod_temporada|codtemporada)=([^&#\s]+)/i);
      if (tMatch) temporada = tMatch[1];
    }
    if (!competicion) {
      const cMatch = rawUrl.match(/(?:competicion|cod_competicion|codcompeticion)=(\d+)/i);
      if (cMatch) competicion = cMatch[1];
    }
    if (!grupo) {
      const gMatch = rawUrl.match(/(?:grupo|cod_grupo|codgrupo)=(\d+)/i);
      if (gMatch) grupo = gMatch[1];
    }
    if (!tipojuego) {
      const tjMatch = rawUrl.match(/(?:tipojuego|tipo_juego|codtipojuego|cod_tipo_juego)=(\d+)/i);
      if (tjMatch) tipojuego = tjMatch[1];
    }
    if (!jornada) {
      const jMatch = rawUrl.match(/(?:jornada|cod_jornada|codjornada)=(\d+)/i);
      if (jMatch) jornada = jMatch[1];
    }
  }

  return {
    temporada: normalizeSeasonParam(temporada),
    competicion,
    grupo,
    tipojuego: tipojuego || '1',
    jornada: jornada || ''
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
    const json = extractNextData(html);
    return json?.props?.pageProps || null;
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

export function isOurClubTeamName(rawName: string, targetTeamName?: string): boolean {
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

  if (short.length > 22) {
    short = short.substring(0, 22).trim();
  }
  return short || rawName;
}

function prefixRffmImg(img?: string): string {
  if (!img) return '';
  return img.startsWith('http') ? img : `https://appweb.rffm.es${img}`;
}

export async function fetchClasificacionData(params: {
  temporada?: string;
  competicion?: string;
  grupo?: string;
  jornada?: string;
  tipojuego?: string;
}) {
  const temporada = normalizeSeasonParam(params.temporada || '22');
  const competicion = params.competicion || '26738324';
  const grupo = params.grupo || '27306559';
  const tipojuego = params.tipojuego || '1';
  const jornadaQuery = params.jornada ? `&jornada=${params.jornada}` : '';

  const targetUrl = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}${jornadaQuery}&tipojuego=${tipojuego}`;
  const pageProps = await fetchRffmPageProps(targetUrl);
  if (!pageProps) {
    throw new Error('No se pudieron obtener los datos de clasificación de la RFFM.');
  }
  return pageProps.standings || {};
}

export async function fetchResultadosData(params: {
  temporada?: string;
  competicion?: string;
  grupo?: string;
  jornada?: string;
  tipojuego?: string;
}) {
  const temporada = normalizeSeasonParam(params.temporada || '22');
  const competicion = params.competicion || '26738324';
  const grupo = params.grupo || '27306559';
  const tipojuego = params.tipojuego || '1';
  const jornadaQuery = params.jornada ? `&jornada=${params.jornada}` : '';

  const targetUrl = `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}${jornadaQuery}&tipojuego=${tipojuego}`;
  const pageProps = await fetchRffmPageProps(targetUrl);
  if (!pageProps) {
    throw new Error('No se pudieron obtener los datos de resultados de la RFFM.');
  }
  return pageProps.results || {};
}

export async function fetchSingleActaDetail(codacta: string) {
  const pageProps = await fetchRffmPageProps(`https://www.rffm.es/acta-partido/${codacta}`);
  if (!pageProps) {
    throw new Error('No se pudo leer el acta arbitral de la RFFM.');
  }
  return pageProps.game || null;
}

export async function extractCalendarData(input: {
  calendarUrl?: string;
  temporada?: string;
  competicion?: string;
  grupo?: string;
  tipojuego?: string;
  teamName?: string;
}) {
  const parsed = parseRffmUrlParams(input);
  const { temporada, competicion, grupo } = parsed;
  let tipojuego = parsed.tipojuego;
  const targetTeamName = (input.teamName || '').toString().trim();

  if (!competicion || !grupo) {
    const err: any = new Error(
      "No se pudieron identificar los parámetros de 'competicion' y 'grupo' en la URL proporcionada. Asegúrate de pegar la URL completa del calendario o resultados de la RFFM (ej. https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559)."
    );
    err.statusCode = 400;
    throw err;
  }

  // Fast parallel fetch of clasificaciones + calendario + active resultados-y-jornadas
  const fetchPairForType = async (tj: string) => {
    const clasifUrl = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tj}`;
    const calUrl = `https://www.rffm.es/competicion/calendario?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tj}`;
    const resUrl = `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tj}`;
    const [clasifProps, calProps, activeResProps] = await Promise.all([
      fetchRffmPageProps(clasifUrl),
      fetchRffmPageProps(calUrl),
      fetchRffmPageProps(resUrl)
    ]);
    const st = clasifProps?.standings || null;
    const cal = calProps?.calendar || null;
    const activeRes = activeResProps?.results || null;
    const hasStandings = !!(st && (st.clasificacion?.length > 0 || st.competicion));
    const hasCalendar = !!(cal && (cal.rounds?.length > 0 || cal.competicion));
    const hasActiveRes = !!(activeRes && (activeRes.partidos?.length > 0 || activeRes.listado_jornadas?.length > 0 || activeRes.nombre_competicion));
    return { tj, st, cal, activeRes, hasStandings, hasCalendar, hasActiveRes };
  };

  let primary = await fetchPairForType(tipojuego);
  if (!primary.hasStandings && !primary.hasCalendar && !primary.hasActiveRes) {
    const fallbacks = ['1', '2', '3'].filter((t) => t !== tipojuego);
    const fallbackResults = await Promise.all(fallbacks.map(fetchPairForType));
    const winner = fallbackResults.find((r) => r.hasStandings || r.hasCalendar || r.hasActiveRes);
    if (winner) {
      primary = winner;
      tipojuego = winner.tj;
    }
  }

  const standings = primary.hasStandings ? primary.st : null;
  const calendar = primary.hasCalendar ? primary.cal : null;
  const resultsPageData = primary.hasActiveRes ? primary.activeRes : null;

  if (!standings && !calendar && !resultsPageData) {
    const err: any = new Error(
      'No se pudo leer la información de la Federación para esta URL. Verifica que el enlace corresponda a una competición oficial de la RFFM.'
    );
    err.statusCode = 502;
    throw err;
  }

  const compName = (
    standings?.competicion ||
    calendar?.competicion ||
    resultsPageData?.nombre_competicion ||
    resultsPageData?.competicion ||
    'Competición Federada'
  ).trim();
  const grupoName = (
    standings?.grupo ||
    calendar?.grupo ||
    resultsPageData?.nombre_grupo ||
    resultsPageData?.grupo ||
    `Grupo ${grupo}`
  ).trim();
  const categoryName = `${compName} - ${grupoName}`;

  const rawTeams = standings?.clasificacion || [];
  let rivals = rawTeams.map((t: any, idx: number) => {
    const rawName = (t.nombre || `Equipo ${idx + 1}`).trim().toUpperCase();
    return {
      id: `rffm-team-${t.codequipo || idx + 1}`,
      codequipo: t.codequipo,
      name: rawName,
      shortName: cleanTeamShortName(rawName),
      crestUrl: prefixRffmImg(t.url_img),
      position: parseInt(t.posicion, 10) || idx + 1,
      points: parseInt(t.puntos, 10) || 0,
      matchesPlayed: parseInt(t.jugados, 10) || 0,
      won: parseInt(t.ganados, 10) || 0,
      drawn: parseInt(t.empatados, 10) || 0,
      lost: parseInt(t.perdidos, 10) || 0,
      goalsFor: parseInt(t.goles_a_favor, 10) || 0,
      goalsAgainst: parseInt(t.goles_en_contra, 10) || 0,
      isMyTeam: isOurClubTeamName(rawName, targetTeamName)
    };
  });

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const activeResJornada = parseInt(resultsPageData?.jornada || '0', 10) || 0;
  const maxStandingsJugados = rawTeams.reduce(
    (max: number, t: any) => Math.max(max, parseInt(t.jugados, 10) || 0),
    0
  );
  const latestTargetJornada = Math.max(activeResJornada, maxStandingsJugados);

  // Build map of live resultados-y-jornadas starting with active jornada
  const resultsByJornada = new Map<number, any[]>();
  if (activeResJornada > 0 && Array.isArray(resultsPageData?.partidos)) {
    resultsByJornada.set(activeResJornada, resultsPageData.partidos);
  }

  // Fetch missing-score jornadas from resultados-y-jornadas in parallel (when calendario lags behind)
  if (calendar?.rounds?.length > 0 && latestTargetJornada > 0) {
    const missingJornadas: number[] = [];
    for (const round of calendar.rounds) {
      const jNum = parseInt(round.codjornada, 10);
      if (isNaN(jNum) || jNum <= 0 || jNum > latestTargetJornada) continue;
      if (resultsByJornada.has(jNum)) continue;
      const eqs = round.equipos || [];
      const hasAnyScore = eqs.some(
        (p: any) =>
          (p.goles_casa !== '' && p.goles_casa !== null && p.goles_casa !== undefined) ||
          (p.goles_visitante !== '' && p.goles_visitante !== null && p.goles_visitante !== undefined)
      );
      if (!hasAnyScore) {
        missingJornadas.push(jNum);
      }
    }
    if (missingJornadas.length > 0) {
      const extraRes = await Promise.all(
        missingJornadas.slice(-6).map(async (jNum) => {
          const rProps = await fetchRffmPageProps(
            `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=${jNum}&tipojuego=${tipojuego}`
          );
          return { jNum, partidos: rProps?.results?.partidos || [] };
        })
      );
      extraRes.forEach(({ jNum, partidos }) => {
        if (Array.isArray(partidos) && partidos.length > 0) {
          resultsByJornada.set(jNum, partidos);
        }
      });
    }
  }

  let allMatches: any[] = [];
  const disputedSet = new Set<number>();

  if (calendar?.rounds?.length > 0) {
    for (const round of calendar.rounds) {
      const jNum = parseInt(round.codjornada, 10);
      if (isNaN(jNum)) continue;
      const roundDate = parseSpanishDate(round.jornada);
      const liveRoundPartidos = resultsByJornada.get(jNum) || [];

      const roundMatches = (round.equipos || []).map((p: any) => {
        const calLocal = (p.equipo_local || '').trim().toUpperCase();
        const calVisit = (p.equipo_visitante || '').trim().toUpperCase();
        const liveMatch = liveRoundPartidos.find(
          (lp: any) =>
            (p.codacta && lp.codacta && String(lp.codacta) === String(p.codacta)) ||
            ((lp.Nombre_equipo_local || '').trim().toUpperCase() === calLocal &&
              (lp.Nombre_equipo_visitante || '').trim().toUpperCase() === calVisit)
        );

        const rawGl =
          p.goles_casa !== '' && p.goles_casa !== null && p.goles_casa !== undefined
            ? p.goles_casa
            : liveMatch?.Goles_casa ?? '';
        const rawGv =
          p.goles_visitante !== '' && p.goles_visitante !== null && p.goles_visitante !== undefined
            ? p.goles_visitante
            : liveMatch?.Goles_visitante ?? '';

        const hasScore =
          (rawGl !== '' && rawGl !== null && rawGl !== undefined) &&
          (rawGv !== '' && rawGv !== null && rawGv !== undefined);

        const matchDate = parseSpanishDate(liveMatch?.fecha || p.fecha) || roundDate;
        const isPastOrPlayed =
          hasScore ||
          liveMatch?.acta_cerrada === '1' ||
          jNum <= latestTargetJornada ||
          (matchDate !== null && matchDate <= todayEnd);

        const codacta = p.codacta || liveMatch?.codacta || '';
        return {
          id: `acta-${codacta || `${jNum}-${p.codigo_equipo_local}-${p.codigo_equipo_visitante}`}`,
          jornada: jNum,
          fecha: liveMatch?.fecha || p.fecha || '',
          hora: liveMatch?.hora || p.hora || '',
          campo: liveMatch?.campojuego || p.campo || '',
          codigoCampo: liveMatch?.codigo_campo || p.codigo_campo || '',
          arbitro: liveMatch?.arbitro || '',
          local: p.equipo_local || liveMatch?.Nombre_equipo_local || '',
          visitante: p.equipo_visitante || liveMatch?.Nombre_equipo_visitante || '',
          codEquipoLocal: p.codigo_equipo_local || liveMatch?.CodEquipo_local || '',
          codEquipoVisitante: p.codigo_equipo_visitante || liveMatch?.CodEquipo_visitante || '',
          escudoLocal: prefixRffmImg(p.escudo_equipo_local || liveMatch?.url_img_local),
          escudoVisitante: prefixRffmImg(p.escudo_equipo_visitante || liveMatch?.url_img_visitante),
          golesLocal: rawGl,
          golesVisitante: rawGv,
          codacta,
          actaUrl: codacta ? `https://www.rffm.es/acta-partido/${codacta}` : '',
          actaOficialUrl: codacta
            ? `https://appweb.rffm.es/pnfg/NPcd/NFG_CmpActa1?cod_primaria=1000122&CodActa=${codacta}`
            : '',
          estado: liveMatch?.estado || '1',
          disputado: hasScore || liveMatch?.acta_cerrada === '1',
          _include: isPastOrPlayed
        };
      });

      const includedInRound = roundMatches.filter((m: any) => m._include);
      if (includedInRound.length > 0) {
        disputedSet.add(jNum);
        allMatches.push(...includedInRound);
      }
    }

    // If season hasn't started yet, still return round 1 fixtures so teams/schedule are visible
    if (allMatches.length === 0 && calendar.rounds[0]?.equipos?.length > 0) {
      const r0 = calendar.rounds[0];
      const jNum = parseInt(r0.codjornada, 10) || 1;
      disputedSet.add(jNum);
      allMatches = r0.equipos.map((p: any) => ({
        id: `acta-${p.codacta || `${jNum}-${p.codigo_equipo_local}-${p.codigo_equipo_visitante}`}`,
        jornada: jNum,
        fecha: p.fecha || '',
        hora: p.hora || '',
        campo: p.campo || '',
        codigoCampo: p.codigo_campo || '',
        arbitro: '',
        local: p.equipo_local || '',
        visitante: p.equipo_visitante || '',
        codEquipoLocal: p.codigo_equipo_local || '',
        codEquipoVisitante: p.codigo_equipo_visitante || '',
        escudoLocal: prefixRffmImg(p.escudo_equipo_local),
        escudoVisitante: prefixRffmImg(p.escudo_equipo_visitante),
        golesLocal: p.goles_casa ?? '',
        golesVisitante: p.goles_visitante ?? '',
        codacta: p.codacta || '',
        actaUrl: p.codacta ? `https://www.rffm.es/acta-partido/${p.codacta}` : '',
        actaOficialUrl: p.codacta
          ? `https://appweb.rffm.es/pnfg/NPcd/NFG_CmpActa1?cod_primaria=1000122&CodActa=${p.codacta}`
          : '',
        estado: '1',
        disputado: false
      }));
    }
  } else if (resultsPageData) {
    let pastJornadaNumbers: number[] = [];
    const list = resultsPageData?.listado_jornadas?.[0]?.jornadas || [];
    if (list.length > 0) {
      for (const jItem of list) {
        const jDate = parseSpanishDate(jItem.fecha_jornada);
        const jCod = parseInt(jItem.codjornada, 10);
        if (!isNaN(jCod) && ((jDate && jDate <= todayEnd) || jCod <= latestTargetJornada)) {
          pastJornadaNumbers.push(jCod);
        }
      }
      if (pastJornadaNumbers.length === 0 && list[0]?.codjornada) {
        pastJornadaNumbers = [parseInt(list[0].codjornada, 10) || 1];
      }
    } else {
      pastJornadaNumbers = latestTargetJornada > 0
        ? Array.from({ length: latestTargetJornada }, (_, i) => i + 1)
        : [1];
    }

    const fetchedBatches: any[] = [];
    for (let i = 0; i < pastJornadaNumbers.length; i += 8) {
      const slice = pastJornadaNumbers.slice(i, i + 8);
      const batch = await Promise.all(
        slice.map(async (jNum) => {
          const cachedPartidos = resultsByJornada.get(jNum);
          const partidos = cachedPartidos || (
            await fetchRffmPageProps(
              `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=${jNum}&tipojuego=${tipojuego}`
            )
          )?.results?.partidos || [];
          return partidos.map((p: any) => {
            const hasScore =
              p.Goles_casa !== '' && p.Goles_casa !== null && p.Goles_casa !== undefined;
            if (hasScore || p.codacta) disputedSet.add(jNum);
            return {
              id: `acta-${p.codacta || `${jNum}-${p.CodEquipo_local}-${p.CodEquipo_visitante}`}`,
              jornada: jNum,
              fecha: p.fecha || '',
              hora: p.hora || '',
              campo: p.campojuego || '',
              codigoCampo: p.codigo_campo || '',
              arbitro: p.arbitro || '',
              local: p.Nombre_equipo_local || '',
              visitante: p.Nombre_equipo_visitante || '',
              codEquipoLocal: p.CodEquipo_local || '',
              codEquipoVisitante: p.CodEquipo_visitante || '',
              escudoLocal: prefixRffmImg(p.url_img_local),
              escudoVisitante: prefixRffmImg(p.url_img_visitante),
              golesLocal: p.Goles_casa ?? '',
              golesVisitante: p.Goles_visitante ?? '',
              codacta: p.codacta || '',
              actaUrl: p.codacta ? `https://www.rffm.es/acta-partido/${p.codacta}` : '',
              actaOficialUrl: p.codacta
                ? `https://appweb.rffm.es/pnfg/NPcd/NFG_CmpActa1?cod_primaria=1000122&CodActa=${p.codacta}`
                : '',
              estado: p.estado || '1',
              disputado: hasScore || p.acta_cerrada === '1'
            };
          });
        })
      );
      fetchedBatches.push(...batch.flat());
    }
    allMatches = fetchedBatches;
  }

  // Fallback: if standings returned 0 teams, reconstruct teams from match fixtures
  if (rivals.length === 0 && allMatches.length > 0) {
    const seenTeams = new Map<string, any>();
    allMatches.forEach((m: any) => {
      if (m.local) {
        const key = m.local.trim().toUpperCase();
        if (!seenTeams.has(key)) {
          seenTeams.set(key, {
            id: `rffm-team-${m.codEquipoLocal || seenTeams.size + 1}`,
            codequipo: m.codEquipoLocal || '',
            name: key,
            shortName: cleanTeamShortName(key),
            crestUrl: m.escudoLocal || '',
            isMyTeam: isOurClubTeamName(key, targetTeamName)
          });
        }
      }
      if (m.visitante) {
        const key = m.visitante.trim().toUpperCase();
        if (!seenTeams.has(key)) {
          seenTeams.set(key, {
            id: `rffm-team-${m.codEquipoVisitante || seenTeams.size + 1}`,
            codequipo: m.codEquipoVisitante || '',
            name: key,
            shortName: cleanTeamShortName(key),
            crestUrl: m.escudoVisitante || '',
            isMyTeam: isOurClubTeamName(key, targetTeamName)
          });
        }
      }
    });
    rivals = Array.from(seenTeams.values());
  }

  const cleanMatches = allMatches.map(
    ({ codEquipoLocal: _a, codEquipoVisitante: _b, _include: _c, ...rest }) => rest
  );

  const jornadasDisputadas = Array.from(disputedSet).sort((a, b) => a - b);

  const seasonLabel =
    calendar?.temporada ||
    (temporada === '22'
      ? '2026-2027'
      : temporada === '21'
        ? '2025-2026'
        : temporada === '20'
          ? '2024-2025'
          : '2026-2027');

  return {
    ok: true,
    categoryName,
    temporada: seasonLabel,
    temporadaId: temporada,
    competicionId: competicion,
    grupoId: grupo,
    urlCalendario:
      input.calendarUrl ||
      `https://www.rffm.es/competicion/calendario?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`,
    urlClasificacion: `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`,
    urlResultados: `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`,
    urlActas: 'https://www.rffm.es/competiciones/acta',
    federationName: 'Real Federación de Fútbol de Madrid (RFFM)',
    rivals,
    matches: cleanMatches,
    jornadasDisputadas,
    lastSync: new Date().toISOString()
  };
}

export async function syncActasDetailedData(input: {
  calendarUrl?: string;
  temporada?: string;
  competicion?: string;
  grupo?: string;
  tipojuego?: string;
  teamName?: string;
}) {
  const parsed = parseRffmUrlParams(input);
  const temporada = parsed.temporada || '22';
  const competicion = parsed.competicion || '26738324';
  const grupo = parsed.grupo || '27306559';
  let tipojuego = parsed.tipojuego || '1';
  const targetTeamName = (input.teamName || 'INFANTIL B').toString().trim();

  // Fetch calendario + clasificaciones + active resultados-y-jornadas in parallel
  let calendar: any = null;
  let activeResults: any = null;
  let standingsData: any = null;
  const candidateGameTypes = Array.from(new Set([tipojuego, '1', '2', '3']));

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
  standingsData = stFirst?.standings || null;
  activeResults = resFirst?.results || null;

  if (calFirst?.calendar?.rounds?.length > 0) {
    calendar = calFirst.calendar;
  } else {
    const others = candidateGameTypes.filter((t) => t !== tipojuego);
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
        const isOurTeam =
          isOurClubTeamName(p.equipo_local, targetTeamName) ||
          isOurClubTeamName(p.equipo_visitante, targetTeamName);
        if (isOurTeam && !seenCodactas.has(String(p.codacta))) {
          seenCodactas.add(String(p.codacta));
          matchesToProcess.push({ codacta: p.codacta, jornada: jNum });
        }
      }
    }
  }

  // Also check activeResults.partidos in case calendar omitted codacta or latest jornada
  if (activeResJornada > 0 && Array.isArray(activeResults?.partidos)) {
    for (const p of activeResults.partidos) {
      if (!p.codacta || seenCodactas.has(String(p.codacta))) continue;
      const isOurTeam =
        isOurClubTeamName(p.Nombre_equipo_local, targetTeamName) ||
        isOurClubTeamName(p.Nombre_equipo_visitante, targetTeamName);
      if (isOurTeam) {
        seenCodactas.add(String(p.codacta));
        matchesToProcess.push({ codacta: p.codacta, jornada: activeResJornada });
      }
    }
  }

  const duration = getCategoryMatchDuration(targetTeamName || categoryName);
  const playersSummary: Record<string, any> = {};
  const rivalsSummary: Record<string, any> = {};
  const detailedActas: any[] = [];

  matchesToProcess.sort((a, b) => a.jornada - b.jornada);

  const fetchedActas: Array<{ item: { codacta: string; jornada: number }; g: any }> = [];
  for (let i = 0; i < matchesToProcess.length; i += 6) {
    const batch = matchesToProcess.slice(i, i + 6);
    const batchGames = await Promise.all(
      batch.map(async (item) => {
        try {
          const g = await fetchSingleActaDetail(item.codacta);
          const hasMatchData =
            g &&
            (g.equipo_local || g.equipo_visitante) &&
            (g.acta_cerrada === '1' ||
              (g.goles_local !== '' && g.goles_local !== null && g.goles_local !== undefined) ||
              (g.jugadores_equipo_local?.length > 0) ||
              (g.jugadores_equipo_visitante?.length > 0));
          return hasMatchData ? { item, g } : null;
        } catch (actaErr) {
          console.warn(`Error processing acta ${item.codacta}:`, actaErr);
          return null;
        }
      })
    );
    batchGames.forEach((res) => {
      if (res) fetchedActas.push(res);
    });
  }

  for (const { item, g } of fetchedActas) {
    try {
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
          if (c.codigo_tipo_amonestacion === '100') {
            playersSummary[name].amarillas += 1;
          } else {
            playersSummary[name].rojas += 1;
          }
        }
      }

      for (const gl of ourGoals) {
        const name = (gl.nombre_jugador || '').trim().toUpperCase();
        if (playersSummary[name]) {
          playersSummary[name].goles += 1;
        }
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
        rivalsSummary[rivalTeamName].amarillas += rivalCards.filter(
          (c: any) => c.codigo_tipo_amonestacion === '100'
        ).length;
        rivalsSummary[rivalTeamName].rojas += rivalCards.filter(
          (c: any) => c.codigo_tipo_amonestacion !== '100'
        ).length;
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
    } catch (actaErr) {
      console.warn(`Error processing acta ${item.codacta}:`, actaErr);
    }
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

  return {
    teamName: targetTeamName,
    categoryName,
    temporada:
      temporada === '22'
        ? '2026-2027'
        : temporada === '21'
          ? '2025-2026'
          : '2026-2027',
    updatedAt: new Date().toISOString(),
    playersSummary,
    rivalsSummary,
    actas: detailedActas
  };
}

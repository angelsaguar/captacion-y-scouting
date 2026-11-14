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
    if (/%3D|%26/i.test(rawUrl)) {
      rawUrl = decodeURIComponent(rawUrl);
    }
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

        if (competicion && grupo) break;
      } catch {
        // Fallback to regex
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
    temporada: normalizeSeasonParam(temporada),
    competicion,
    grupo,
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

function prefixRffmImg(img?: string): string {
  if (!img) return '';
  return img.startsWith('http') ? img : `https://appweb.rffm.es${img}`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const query = req.query || {};

    const calendarUrl = (body.calendarUrl || query.calendarUrl || body.url || query.url || '').toString();
    const targetTeamName = (body.teamName || query.teamName || '').toString().trim();
    const parsed = parseRffmUrlParams({
      calendarUrl,
      temporada: (body.temporada || query.temporada || '').toString(),
      competicion: (body.competicion || query.competicion || '').toString(),
      grupo: (body.grupo || query.grupo || '').toString(),
      tipojuego: (body.tipojuego || query.tipojuego || '').toString()
    });

    const { temporada, competicion, grupo } = parsed;
    let tipojuego = parsed.tipojuego;

    if (!competicion || !grupo) {
      return res.status(400).json({
        error:
          "No se pudieron identificar los parámetros de 'competicion' y 'grupo' en la URL proporcionada. Asegúrate de pegar la URL completa del calendario o resultados de la RFFM (ej. https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559)."
      });
    }

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
      return res.status(502).json({
        error:
          'No se pudo leer la información de la Federación para esta URL. Verifica que el enlace corresponda a una competición oficial de la RFFM.'
      });
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

    const resultsByJornada = new Map<number, any[]>();
    if (activeResJornada > 0 && Array.isArray(resultsPageData?.partidos)) {
      resultsByJornada.set(activeResJornada, resultsPageData.partidos);
    }

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
        if (!hasAnyScore) missingJornadas.push(jNum);
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
            rawGl !== '' && rawGl !== null && rawGl !== undefined &&
            rawGv !== '' && rawGv !== null && rawGv !== undefined;

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

        const included = roundMatches.filter((m: any) => m._include);
        if (included.length > 0) {
          disputedSet.add(jNum);
          allMatches.push(...included);
        }
      }

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

    return res.status(200).json({
      ok: true,
      categoryName,
      temporada: seasonLabel,
      temporadaId: temporada,
      competicionId: competicion,
      grupoId: grupo,
      urlCalendario:
        calendarUrl ||
        `https://www.rffm.es/competicion/calendario?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`,
      urlClasificacion: `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`,
      urlResultados: `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&tipojuego=${tipojuego}`,
      urlActas: 'https://www.rffm.es/competiciones/acta',
      federationName: 'Real Federación de Fútbol de Madrid (RFFM)',
      rivals,
      matches: cleanMatches,
      jornadasDisputadas,
      lastSync: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error in /api/rffm/extract-calendar:', err);
    return res.status(err?.statusCode || 500).json({
      error: err?.message || 'Error al extraer los datos de la federación.'
    });
  }
}

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';

let myFilename = "";
let myDirname = "";

try {
  if (typeof __filename !== 'undefined') {
    myFilename = __filename;
  }
  if (typeof __dirname !== 'undefined') {
    myDirname = __dirname;
  }
} catch (e) {
  // Ignore reference errors
}

if (!myDirname) {
  try {
    if (import.meta && import.meta.url) {
      myFilename = fileURLToPath(import.meta.url);
      myDirname = path.dirname(myFilename);
    } else {
      myDirname = process.cwd();
      myFilename = path.join(myDirname, 'server.ts');
    }
  } catch (e) {
    myDirname = process.cwd();
    myFilename = path.join(myDirname, 'server.ts');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Official RFFM Classification Proxy
  app.get("/api/rffm/clasificacion", async (req, res) => {
    try {
      const temporada = req.query.temporada || "22";
      const competicion = req.query.competicion || "26738324";
      const grupo = req.query.grupo || "27306559";
      const jornada = req.query.jornada || "4";
      const tipojuego = req.query.tipojuego || "1";

      const targetUrl = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=${jornada}&tipojuego=${tipojuego}`;
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const html = await response.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) {
        return res.status(502).json({ error: "No se pudieron obtener los datos de la RFFM." });
      }
      const json = JSON.parse(match[1]);
      const standings = json.props?.pageProps?.standings;
      res.json(standings || {});
    } catch (err: any) {
      console.error("Error fetching RFFM clasificacion:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Official RFFM Resultados & Jornadas Proxy
  app.get("/api/rffm/resultados", async (req, res) => {
    try {
      const temporada = req.query.temporada || "22";
      const competicion = req.query.competicion || "26738324";
      const grupo = req.query.grupo || "27306559";
      const jornada = req.query.jornada || "4";
      const tipojuego = req.query.tipojuego || "1";

      const targetUrl = `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=${jornada}&tipojuego=${tipojuego}`;
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const html = await response.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) {
        return res.status(502).json({ error: "No se pudieron obtener los datos de la RFFM." });
      }
      const json = JSON.parse(match[1]);
      const results = json.props?.pageProps?.results;
      res.json(results || {});
    } catch (err: any) {
      console.error("Error fetching RFFM resultados:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Extract all competition, teams, rankings and match actas arbitrales from a single Calendar URL
  const handleExtractCalendar = async (req: express.Request, res: express.Response) => {
    try {
      const calendarUrl = (req.body?.calendarUrl || req.query?.calendarUrl || req.body?.url || req.query?.url || "").toString().trim();
      let temporada = (req.body?.temporada || req.query?.temporada || "").toString().trim();
      let competicion = (req.body?.competicion || req.query?.competicion || "").toString().trim();
      let grupo = (req.body?.grupo || req.query?.grupo || "").toString().trim();
      const targetTeamName = (req.body?.teamName || req.query?.teamName || "").toString().trim();

      // Extract params from calendarUrl if provided
      if (calendarUrl) {
        try {
          const parsed = new URL(calendarUrl.startsWith("http") ? calendarUrl : `https://${calendarUrl}`);
          temporada = parsed.searchParams.get("temporada") || parsed.searchParams.get("cod_temporada") || temporada;
          competicion = parsed.searchParams.get("competicion") || parsed.searchParams.get("cod_competicion") || competicion;
          grupo = parsed.searchParams.get("grupo") || parsed.searchParams.get("cod_grupo") || grupo;
        } catch {
          const tMatch = calendarUrl.match(/(?:temporada|cod_temporada)=(\d+)/i);
          const cMatch = calendarUrl.match(/(?:competicion|cod_competicion)=(\d+)/i);
          const gMatch = calendarUrl.match(/(?:grupo|cod_grupo)=(\d+)/i);
          if (tMatch) temporada = tMatch[1];
          if (cMatch) competicion = cMatch[1];
          if (gMatch) grupo = gMatch[1];
        }
      }

      if (!temporada) temporada = "22"; // 2026-2027 default on RFFM
      if (!competicion || !grupo) {
        return res.status(400).json({ 
          error: "No se pudieron identificar los parámetros de 'competicion' y 'grupo' en la URL proporcionada. Asegúrate de pegar la URL completa del calendario de la RFFM (ej. https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559)." 
        });
      }

      // 1. Fetch official standings & teams from clasificaciones
      const clasifUrl = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=1&tipojuego=1`;
      const clasifResp = await fetch(clasifUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const clasifHtml = await clasifResp.text();
      const clasifMatch = clasifHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!clasifMatch) {
        return res.status(502).json({ error: "No se pudo leer la información de la Federación para esta URL de calendario." });
      }
      const clasifJson = JSON.parse(clasifMatch[1]);
      const standings = clasifJson.props?.pageProps?.standings;

      const compName = standings?.competicion ? standings.competicion.trim() : "Competición Federada";
      const grupoName = standings?.grupo ? standings.grupo.trim() : `Grupo ${grupo}`;
      const categoryName = `${compName} - ${grupoName}`;

      const rawTeams = standings?.clasificacion || [];
      const rivals = rawTeams.map((t: any, idx: number) => {
        const rawName = (t.nombre || `Equipo ${idx + 1}`).trim().toUpperCase();
        
        // Clean short name
        let short = rawName
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

        const isMine = rawName.includes("AFE") || 
          (targetTeamName && rawName.includes(targetTeamName.toUpperCase())) ||
          rawName.includes("FUNDACION ESCUELA DE FUTBOL AFE");

        const crestUrl = t.url_img 
          ? (t.url_img.startsWith("http") ? t.url_img : `https://appweb.rffm.es${t.url_img}`) 
          : "";

        return {
          id: `rffm-team-${t.codequipo || idx + 1}`,
          codequipo: t.codequipo,
          name: rawName,
          shortName: short || rawName,
          crestUrl,
          position: parseInt(t.posicion) || (idx + 1),
          points: parseInt(t.puntos) || 0,
          matchesPlayed: parseInt(t.jugados) || 0,
          won: parseInt(t.ganados) || 0,
          drawn: parseInt(t.empatados) || 0,
          lost: parseInt(t.perdidos) || 0,
          goalsFor: parseInt(t.goles_a_favor) || 0,
          goalsAgainst: parseInt(t.goles_en_contra) || 0,
          isMyTeam: isMine
        };
      });

      // 2. Discover all jornadas that have occurred or are scheduled
      let pastJornadaNumbers = [1, 2, 3, 4, 5];
      try {
        const j1Resp = await fetch(
          `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=1&tipojuego=1`,
          { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
        );
        const j1Html = await j1Resp.text();
        const j1Match = j1Html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (j1Match) {
          const j1Json = JSON.parse(j1Match[1]);
          const list = j1Json.props?.pageProps?.results?.listado_jornadas?.[0]?.jornadas || [];
          if (list.length > 0) {
            const now = new Date();
            const detected: number[] = [];
            for (const jItem of list) {
              const parts = (jItem.fecha_jornada || "").split("-");
              if (parts.length === 3) {
                // DD-MM-YYYY
                const jDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 23, 59, 59);
                if (jDate <= now) {
                  detected.push(parseInt(jItem.codjornada));
                }
              }
            }
            if (detected.length > 0) {
              pastJornadaNumbers = detected;
            }
          }
        }
      } catch (err) {
        console.warn("Could not auto-detect past jornadas, using fallback:", err);
      }

      // Fetch match fixtures & actas arbitrales for all detected past jornadas
      const fetchJornadaPartidos = async (jNum: number) => {
        try {
          const resJornada = await fetch(
            `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=${jNum}&tipojuego=1`,
            { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
          );
          const html = await resJornada.text();
          const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
          if (!match) return [];
          const parsed = JSON.parse(match[1]);
          const partidos = parsed.props?.pageProps?.results?.partidos || [];
          return partidos.map((p: any) => {
            const hasScore = p.Goles_casa !== "" && p.Goles_casa !== null && p.Goles_casa !== undefined;
            return {
              id: `acta-${p.codacta || `${jNum}-${p.CodEquipo_local}-${p.CodEquipo_visitante}`}`,
              jornada: jNum,
              fecha: p.fecha || "",
              hora: p.hora || "",
              campo: p.campojuego || "",
              codigoCampo: p.codigo_campo || "",
              arbitro: p.arbitro || "",
              local: p.Nombre_equipo_local || "",
              visitante: p.Nombre_equipo_visitante || "",
              escudoLocal: p.url_img_local ? (p.url_img_local.startsWith("http") ? p.url_img_local : `https://appweb.rffm.es${p.url_img_local}`) : "",
              escudoVisitante: p.url_img_visitante ? (p.url_img_visitante.startsWith("http") ? p.url_img_visitante : `https://appweb.rffm.es${p.url_img_visitante}`) : "",
              golesLocal: p.Goles_casa ?? "",
              golesVisitante: p.Goles_visitante ?? "",
              codacta: p.codacta || "",
              actaUrl: p.codacta ? `https://www.rffm.es/competiciones/acta?codacta=${p.codacta}` : "",
              actaOficialUrl: p.codacta ? `https://appweb.rffm.es/pnfg/NPcd/NFG_CmpActa1?cod_primaria=1000122&CodActa=${p.codacta}` : "",
              estado: p.estado || "1",
              disputado: hasScore || p.acta_cerrada === "1"
            };
          });
        } catch {
          return [];
        }
      };

      const jornadaResults = await Promise.all(pastJornadaNumbers.map(fetchJornadaPartidos));
      const allMatches = jornadaResults.flat();

      // Collect all unique jornadas that have been disputed (have scores or actas)
      const disputedSet = new Set<number>();
      allMatches.forEach((m: any) => {
        if (m.disputado || (m.golesLocal !== "" && m.golesLocal !== null && m.golesLocal !== undefined) || m.codacta) {
          disputedSet.add(m.jornada);
        }
      });
      const jornadasDisputadas = Array.from(disputedSet).sort((a, b) => a - b);

      const extractedData = {
        ok: true,
        categoryName,
        temporada: "2026-2027",
        temporadaId: temporada,
        competicionId: competicion,
        grupoId: grupo,
        urlCalendario: calendarUrl || `https://www.rffm.es/competicion/calendario?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}`,
        urlClasificacion: `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}`,
        urlResultados: `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}`,
        urlActas: "https://www.rffm.es/competiciones/acta",
        federationName: "Real Federación de Fútbol de Madrid (RFFM)",
        rivals,
        matches: allMatches,
        jornadasDisputadas,
        lastSync: new Date().toISOString()
      };


      res.json(extractedData);
    } catch (err: any) {
      console.error("Error in /api/rffm/extract-calendar:", err);
      res.status(500).json({ error: err.message || "Error al extraer los datos de la federación." });
    }
  };

  app.post("/api/rffm/extract-calendar", handleExtractCalendar);
  app.get("/api/rffm/extract-calendar", handleExtractCalendar);

  // Single Acta Arbitral proxy
  app.get("/api/rffm/acta-detail", async (req, res) => {
    try {
      const codacta = req.query.codacta;
      if (!codacta) {
        return res.status(400).json({ error: "Parámetro codacta requerido" });
      }
      const response = await fetch(`https://www.rffm.es/acta-partido/${codacta}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const html = await response.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) {
        return res.status(502).json({ error: "No se pudo leer el acta arbitral de la RFFM." });
      }
      const json = JSON.parse(match[1]);
      const game = json.props?.pageProps?.game;
      res.json({ ok: true, game });
    } catch (err: any) {
      console.error("Error fetching single acta:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Sync all actas arbitrales in the category and extract all player disciplinary stats & rival metrics
  app.post("/api/rffm/sync-actas-detailed", async (req, res) => {
    try {
      const calendarUrl = (req.body?.calendarUrl || "").toString().trim();
      let temporada = (req.body?.temporada || "").toString().trim();
      let competicion = (req.body?.competicion || "").toString().trim();
      let grupo = (req.body?.grupo || "").toString().trim();
      const targetTeamName = (req.body?.teamName || "INFANTIL B").toString().trim();

      if (calendarUrl) {
        try {
          const parsed = new URL(calendarUrl.startsWith("http") ? calendarUrl : `https://${calendarUrl}`);
          temporada = parsed.searchParams.get("temporada") || parsed.searchParams.get("cod_temporada") || temporada;
          competicion = parsed.searchParams.get("competicion") || parsed.searchParams.get("cod_competicion") || competicion;
          grupo = parsed.searchParams.get("grupo") || parsed.searchParams.get("cod_grupo") || grupo;
        } catch {
          const tMatch = calendarUrl.match(/(?:temporada|cod_temporada)=(\d+)/i);
          const cMatch = calendarUrl.match(/(?:competicion|cod_competicion)=(\d+)/i);
          const gMatch = calendarUrl.match(/(?:grupo|cod_grupo)=(\d+)/i);
          if (tMatch) temporada = tMatch[1];
          if (cMatch) competicion = cMatch[1];
          if (gMatch) grupo = gMatch[1];
        }
      }

      if (!temporada) temporada = "22";
      if (!competicion) competicion = "26738324";
      if (!grupo) grupo = "27306559";

      // 1. Discover played jornadas
      let pastJornadaNumbers = [1, 2, 3, 4, 5];
      try {
        const j1Resp = await fetch(
          `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=1&tipojuego=1`,
          { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
        );
        const j1Html = await j1Resp.text();
        const j1Match = j1Html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (j1Match) {
          const j1Json = JSON.parse(j1Match[1]);
          const list = j1Json.props?.pageProps?.results?.listado_jornadas?.[0]?.jornadas || [];
          if (list.length > 0) {
            const now = new Date();
            const detected: number[] = [];
            for (const jItem of list) {
              const parts = (jItem.fecha_jornada || "").split("-");
              if (parts.length === 3) {
                const jDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 23, 59, 59);
                if (jDate <= now) {
                  detected.push(parseInt(jItem.codjornada));
                }
              }
            }
            if (detected.length > 0) pastJornadaNumbers = detected;
          }
        }
      } catch {}

      // 2. Fetch matches for all past jornadas to find our team's matches and actas
      const matchesToProcess: Array<{ codacta: string; jornada: number }> = [];

      for (const jNum of pastJornadaNumbers) {
        try {
          const rj = await fetch(
            `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}&jornada=${jNum}&tipojuego=1`,
            { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
          );
          const htmlj = await rj.text();
          const match = htmlj.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            const partidos = parsed.props?.pageProps?.results?.partidos || [];
            partidos.forEach((p: any) => {
              if (p.codacta) {
                const isOurTeam = p.Nombre_equipo_local?.toUpperCase().includes("AFE") || 
                  p.Nombre_equipo_visitante?.toUpperCase().includes("AFE") ||
                  p.Nombre_equipo_local?.toUpperCase().includes(targetTeamName.toUpperCase()) ||
                  p.Nombre_equipo_visitante?.toUpperCase().includes(targetTeamName.toUpperCase());
                if (isOurTeam) {
                  matchesToProcess.push({ codacta: p.codacta, jornada: jNum });
                }
              }
            });
          }
        } catch {}
      }

      // 3. Sequential fetch of actas to prevent any rate limiting
      const playersSummary: Record<string, any> = {};
      const rivalsSummary: Record<string, any> = {};
      const detailedActas: any[] = [];

      for (const item of matchesToProcess) {
        try {
          const actaResp = await fetch(`https://www.rffm.es/acta-partido/${item.codacta}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
          });
          const actaHtml = await actaResp.text();
          const actaMatch = actaHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
          if (!actaMatch) continue;
          const actaJson = JSON.parse(actaMatch[1]);
          const g = actaJson.props?.pageProps?.game;
          if (!g) continue;

          const isLocalAfe = (g.equipo_local || "").toUpperCase().includes("AFE") || (g.equipo_local || "").toUpperCase().includes(targetTeamName.toUpperCase());
          const rivalTeamName = isLocalAfe ? g.equipo_visitante : g.equipo_local;

          const ourPlayers = isLocalAfe ? (g.jugadores_equipo_local || []) : (g.jugadores_equipo_visitante || []);
          const ourCards = isLocalAfe ? (g.tarjetas_equipo_local || []) : (g.tarjetas_equipo_visitante || []);
          const ourGoals = isLocalAfe ? (g.goles_equipo_local || []) : (g.goles_equipo_visitante || []);

          const rivalCards = isLocalAfe ? (g.tarjetas_equipo_visitante || []) : (g.tarjetas_equipo_local || []);
          const rivalGoals = isLocalAfe ? (g.goles_equipo_visitante || []) : (g.goles_equipo_local || []);

          // Process our team players
          for (const p of ourPlayers) {
            const name = (p.nombre_jugador || "").trim().toUpperCase();
            if (!name) continue;

            // Generate clean short name
            const parts = name.split(",");
            let short = parts.length > 1 ? parts[1].trim() : name;
            const firstName = short.split(" ")[0];

            if (!playersSummary[name]) {
              playersSummary[name] = {
                nombreCompleto: name,
                nombreCorto: firstName || short,
                dorsal: p.dorsal || "",
                convocatorias: 0,
                titularidades: 0,
                suplencias: 0,
                minutos: 0,
                goles: 0,
                amarillas: 0,
                rojas: 0,
                estaSancionado: false,
                partidosSancion: 0,
                motivoSancion: "",
                esApercibido: false,
                partidos: []
              };
            }

            playersSummary[name].convocatorias += 1;
            const isTitular = p.titular === "1";
            if (isTitular) {
              playersSummary[name].titularidades += 1;
              playersSummary[name].minutos += 70;
            } else {
              playersSummary[name].suplencias += 1;
              playersSummary[name].minutos += 35;
            }

            playersSummary[name].partidos.push({
              jornada: item.jornada,
              rival: rivalTeamName,
              fecha: g.fecha,
              titular: isTitular,
              minutos: isTitular ? 70 : 35,
              goles: 0,
              amarillas: 0,
              rojas: 0,
              codacta: item.codacta
            });
          }

          // Process cards for our players
          for (const c of ourCards) {
            const name = (c.nombre_jugador || "").trim().toUpperCase();
            if (playersSummary[name]) {
              if (c.codigo_tipo_amonestacion === "100") {
                playersSummary[name].amarillas += 1;
              } else {
                playersSummary[name].rojas += 1;
              }
            }
          }

          // Process goals for our players
          for (const gl of ourGoals) {
            const name = (gl.nombre_jugador || "").trim().toUpperCase();
            if (playersSummary[name]) {
              playersSummary[name].goles += 1;
            }
          }

          // Process rival stats
          if (!rivalsSummary[rivalTeamName]) {
            rivalsSummary[rivalTeamName] = {
              name: rivalTeamName,
              shortName: rivalTeamName.replace(/^C\.D\.\s*|^S\.A\.D\.\s*|^A\.D\.\s*/i, '').substring(0, 22),
              partidosJugados: 0,
              amarillas: 0,
              rojas: 0,
              golesFavor: 0,
              golesContra: 0,
              jugadoresAmonestados: [],
              goleadores: []
            };
          }
          rivalsSummary[rivalTeamName].partidosJugados += 1;
          rivalsSummary[rivalTeamName].amarillas += rivalCards.filter((c: any) => c.codigo_tipo_amonestacion === "100").length;
          rivalsSummary[rivalTeamName].rojas += rivalCards.filter((c: any) => c.codigo_tipo_amonestacion !== "100").length;
          rivalsSummary[rivalTeamName].golesFavor += rivalGoals.length;
          rivalsSummary[rivalTeamName].golesContra += ourGoals.length;

          rivalCards.forEach((c: any) => {
            rivalsSummary[rivalTeamName].jugadoresAmonestados.push({
              nombre: c.nombre_jugador,
              jornada: item.jornada,
              minuto: c.minuto || "",
              esRoja: c.codigo_tipo_amonestacion !== "100"
            });
          });

          rivalGoals.forEach((gl: any) => {
            rivalsSummary[rivalTeamName].goleadores.push({
              nombre: gl.nombre_jugador,
              jornada: item.jornada,
              minuto: gl.minuto || ""
            });
          });

          detailedActas.push({
            codacta: item.codacta,
            jornada: item.jornada,
            fecha: g.fecha,
            hora: g.hora,
            campo: g.campo,
            arbitro: g.arbitro || (g.arbitros_partido?.[0]?.nombre_arbitro || ""),
            local: g.equipo_local,
            visitante: g.equipo_visitante,
            golesLocal: parseInt(g.goles_local) || 0,
            golesVisitante: parseInt(g.goles_visitante) || 0,
            actaUrl: `https://www.rffm.es/competiciones/acta?codacta=${item.codacta}`
          });
        } catch (actaErr) {
          console.warn(`Error processing acta ${item.codacta}:`, actaErr);
        }
      }

      // Calculate disciplinary status (cycles of 5 cards, red cards)
      Object.values(playersSummary).forEach((p: any) => {
        if (p.rojas > 0) {
          p.estaSancionado = true;
          p.partidosSancion = 1;
          p.motivoSancion = "Expulsión directa en acta arbitral";
        } else if (p.amarillas >= 5) {
          p.estaSancionado = true;
          p.partidosSancion = 1;
          p.motivoSancion = `Acumulación de ${p.amarillas} tarjetas amarillas (Ciclo RFFM)`;
        } else if (p.amarillas === 4) {
          p.esApercibido = true;
        }
      });

      const databasePayload = {
        teamName: targetTeamName,
        categoryName: "Segunda Infantil - Grupo 50",
        temporada: "2026-2027",
        updatedAt: new Date().toISOString(),
        playersSummary,
        rivalsSummary,
        actas: detailedActas
      };

      res.json({ ok: true, data: databasePayload });
    } catch (err: any) {
      console.error("Error in /api/rffm/sync-actas-detailed:", err);
      res.status(500).json({ error: err.message || "Error al procesar actas arbitrales." });
    }
  });



  // Gemini AI Match Plan & Tactical Counter-Strategy endpoint
  app.post("/api/tactical-advice", async (req, res) => {
    try {
      const { teamName, rivalName, rivalSystem, rivalNotes, myRoster } = req.body;

      if (!rivalSystem) {
        return res.status(400).json({ error: "El sistema del equipo rival es requerido." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const fallback = generateFallbackTacticalAdvice(rivalSystem, rivalName, myRoster);
        return res.json(fallback);
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Eres el Director Técnico y Analista Táctico Máster de fútbol para el equipo ${teamName || 'FUNDACION. AFE'}.
Nos enfrentamos al rival "${rivalName || 'Rival'}" que juega habitualmente con el sistema de juego / formación: ${rivalSystem}.
${rivalNotes ? `Información/Notas sobre el juego del rival: ${rivalNotes}` : ''}
${myRoster && myRoster.length > 0 ? `Nuestra plantilla disponible incluye a: ${myRoster.map((p: any) => `${p.nombre} (${p.posicion || 'Jugadora'})`).join(', ')}.` : ''}

Recomienda la mejor contra-estrategia táctica para que nuestro equipo venza a este rival. Proporciona la respuesta estrictamente en JSON con los campos:
{
  "sistemaRecomendado": "Sistema sugerido para nuestro equipo (ej. 1-4-3-3, 1-4-2-3-1, 1-3-5-2)",
  "razonamientoSistema": "Explicación táctica detallada de por qué este sistema neutraliza específicamente el ${rivalSystem} del rival (superioridades en campo, basculaciones, emparejamientos clave)",
  "objetivosTacticos": [
    "Objetivo 1 en fase de ataque y salida de balón",
    "Objetivo 2 en fase defensiva y presión",
    "Objetivo 3 en transiciones ofensiva/defensiva"
  ],
  "puntosFuertesRival": [
    "Punto fuerte / peligro principal 1 del sistema ${rivalSystem}",
    "Vigilancia o duelo clave 2"
  ],
  "instruccionesPorPuesto": "Instrucciones de alineación o roles clave para nuestras líneas (Portería, Defensa, Mediocampo, Delantera)",
  "estrategiaBalonParado": "Sugerencias tácticas para córners y faltas a balón parado (ABP)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sistemaRecomendado: { type: Type.STRING },
              razonamientoSistema: { type: Type.STRING },
              objetivosTacticos: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              puntosFuertesRival: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              instruccionesPorPuesto: { type: Type.STRING },
              estrategiaBalonParado: { type: Type.STRING }
            },
            required: ["sistemaRecomendado", "razonamientoSistema", "objetivosTacticos", "puntosFuertesRival", "instruccionesPorPuesto", "estrategiaBalonParado"]
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        const parsed = JSON.parse(resultText);
        return res.json(parsed);
      } else {
        throw new Error("Respuesta vacía de Gemini");
      }
    } catch (error: any) {
      console.warn("Exception in /api/tactical-advice (using fallback):", error);
      const fallback = generateFallbackTacticalAdvice(req.body.rivalSystem, req.body.rivalName, req.body.myRoster);
      return res.json(fallback);
    }
  });

function generateFallbackTacticalAdvice(rivalSystem: string, rivalName?: string, myRoster?: any[]) {
  const normRival = (rivalSystem || '').trim();
  let sistemaRecomendado = '1-4-3-3';
  let razonamientoSistema = '';
  let objetivosTacticos: string[] = [];
  let puntosFuertesRival: string[] = [];

  if (normRival.includes('1-4-4-2')) {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `El sistema 1-4-3-3 es idóneo para contra-restar el 1-4-4-2 de ${rivalName || 'rival'}. Generamos superioridad numérica 3v2 en la medular con nuestro pivote y dos interiores. Además, nuestras dos extremas fijan a sus laterales, desprotegiendo los carriles interiores.`;
    objetivosTacticos = [
      "1. Dominar el carril central aprovechando la superioridad de 3 centrocampistas contra sus 2 pivotes.",
      "2. Fijar a sus laterales con nuestras extremas abiertas para generar pasillos interiores de ruptura.",
      "3. Presión tras pérdida inmediata en su primer pase para evitar envíos directos a sus 2 delanteras."
    ];
    puntosFuertesRival = [
      "Su doble punta genera constante peligro en balones directos y segundas jugadas.",
      "Su banda doble (lateral + interior) puede generar centros peligrosos al área."
    ];
  } else if (normRival.includes('1-4-3-3')) {
    sistemaRecomendado = '1-4-2-3-1';
    razonamientoSistema = `El 1-4-2-3-1 neutraliza el 1-4-3-3 de ${rivalName || 'rival'} situando un doble pivote defensivo que tapa las recepciones interiores de sus interiores y extremo inverso. Nuestra mediapunta explota la espalda de su pivote.`;
    objetivosTacticos = [
      "1. Doble pivote en vigilancia estrecha para neutralizar las recepciones entre líneas del rival.",
      "2. Ataque rápido por bandas tras recuperar, atacando el espacio a la espalda de sus laterales desplegados.",
      "3. Basculación defensiva en bloque medio para cerrar vías de penetración."
    ];
    puntosFuertesRival = [
      "Amplitud y peligro constante en el 1v1 por parte de sus dos extremas.",
      "Buen trato de balón y llegada de segunda línea con sus interiores."
    ];
  } else if (normRival.includes('1-3-5-2') || normRival.includes('1-5-3-2')) {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `Contra la defensa de 3 o 5 de ${rivalName || 'rival'}, el 1-4-3-3 permite presionar alto a sus centrales laterales con nuestras extremas y forzar que su salida pase por balones divididos o zonas sin ventaja.`;
    objetivosTacticos = [
      "1. Presión alta orientada hacia la banda para atrapar a sus carrileros sin línea de pase clara.",
      "2. Circulación rápida de lado a lado para desorganizar la basculación de su línea defensiva.",
      "3. Disparos desde media distancia aprovechando el espacio por delante de su área."
    ];
    puntosFuertesRival = [
      "Densidad defensiva en área propia con 3 centrales.",
      "Incorporación ofensiva profunda de sus carrileros."
    ];
  } else if (normRival.includes('1-4-2-3-1')) {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `Contra el 1-4-2-3-1 de ${rivalName || 'rival'}, nuestro pivote fijará a su mediapunta mientras nuestros dos interiores presionan a su doble pivote, impidiendo que inicien juego cómodamente.`;
    objetivosTacticos = [
      "1. Marcaje estrecho de nuestro MCD sobre su enganche/mediapunta principal.",
      "2. Mover el balón en triángulo en el mediocampo para desgastar su doble pivote.",
      "3. Desmarques de ruptura de nuestras extremas a las espaldas de sus laterales."
    ];
    puntosFuertesRival = [
      "Calidad técnica de su enganche entre líneas.",
      "Equilibrio defensivo que aporta su doble pivote."
    ];
  } else {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `Analizando la formación ${normRival} de ${rivalName || 'rival'}, el sistema 1-4-3-3 nos garantiza flexibilidad, amplitud y control en el mediocampo para imponernos tácticamente.`;
    objetivosTacticos = [
      "1. Imponer nuestro ritmo de juego mediante posesión con sentido e intencionalidad.",
      "2. Coberturas y permutas constantes en línea defensiva para evitar despistes.",
      "3. Intensidad máxima en la presión tras pérdida durante los primeros 5 segundos."
    ];
    puntosFuertesRival = [
      "Organización colectiva según su sistema característico.",
      "Capacidad de contraataque si les permitimos espacios libres."
    ];
  }

  const instruccionesPorPuesto = `• Portería: Salida en corto preferente con centrales, atenta a balones a la espalda de la zaga.\n• Defensa: Laterales activas en apoyos y vigilancia de extremos. Centrales contundentes en duelos aéreos.\n• Mediocampo: Movilidad constante, recibir perfiladas y buscar siempre el lado débil del rival.\n• Delantera: Extremas fijando amplitud, delantera centro ofreciendo desmarques de apoyo y ruptura.`;
  
  const estrategiaBalonParado = `• Córners Ofensivos: 2 jugadoras al primer palo para peinar, ataque al segundo palo desde fuera del área.\n• Córners Defensivos: Marcaje mixto (2 en zona corta + 5 marcajes individuales agresivos).\n• Faltas Laterales: Poner centro tenso buscando la zona entre el punto de penalti y área pequeña.`;

  return {
    sistemaRecomendado,
    razonamientoSistema,
    objetivosTacticos,
    puntosFuertesRival,
    instruccionesPorPuesto,
    estrategiaBalonParado
  };
}

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback to index.html for SPA routes in development
    app.get('*', async (req, res, next) => {
      // Exclude API requests and direct requests that look like static files (e.g. /favicon.ico)
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(req.path);
      if (req.path.startsWith('/api') || hasExtension) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(myDirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        next(err);
      }
    });
  } else {
    // Production static serving
    const distPath = path.join(myDirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

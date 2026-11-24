import { applyApiCors, authorizeClubRequest } from "../../src/server/clubAuth";
import { validateRffmParams, validateRffmJornada } from "../../src/server/rffmValidation";

const RFFM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

export default async function handler(req: any, res: any) {
  if (!applyApiCors(req, res, ["GET"])) {
    return res.status(403).json({ error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET"].includes(req.method)) {
    res.setHeader("Allow", "GET, OPTIONS");
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
    const q = req.query || {};
    const temporada = (q.temporada || '22').toString();
    const competicion = (q.competicion || '26738324').toString();
    const grupo = (q.grupo || '27306559').toString();
    const tipojuego = (q.tipojuego || '1').toString();
    const paramsError = validateRffmParams({ temporada, competicion, grupo, tipojuego });
    if (paramsError) return res.status(400).json({ error: paramsError });
    const jornada = q.jornada ? q.jornada.toString() : '';
    const jornadaError = jornada ? validateRffmJornada(jornada) : null;
    if (jornadaError) return res.status(400).json({ error: jornadaError });
    const jornadaQuery = jornada ? `&jornada=${jornada}` : '';

    const targetUrl = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}${jornadaQuery}&tipojuego=${tipojuego}`;
    const response = await fetch(targetUrl, { headers: RFFM_HEADERS });
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      throw new Error('No se pudieron obtener los datos de clasificación de la RFFM.');
    }
    const json = JSON.parse(match[1]);
    return res.status(200).json(json?.props?.pageProps?.standings || {});
  } catch (err: any) {
    console.error('Error in /api/rffm/clasificacion:', err);
    return res.status(500).json({ error: err?.message || 'Error consultando clasificación RFFM.' });
  }
}

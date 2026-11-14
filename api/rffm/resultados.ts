const RFFM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const q = req.query || {};
    const temporada = (q.temporada || '22').toString();
    const competicion = (q.competicion || '26738324').toString();
    const grupo = (q.grupo || '27306559').toString();
    const tipojuego = (q.tipojuego || '1').toString();
    const jornadaQuery = q.jornada ? `&jornada=${q.jornada.toString()}` : '';

    const targetUrl = `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=${temporada}&competicion=${competicion}&grupo=${grupo}${jornadaQuery}&tipojuego=${tipojuego}`;
    const response = await fetch(targetUrl, { headers: RFFM_HEADERS });
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      throw new Error('No se pudieron obtener los datos de resultados de la RFFM.');
    }
    const json = JSON.parse(match[1]);
    return res.status(200).json(json?.props?.pageProps?.results || {});
  } catch (err: any) {
    console.error('Error in /api/rffm/resultados:', err);
    return res.status(500).json({ error: err?.message || 'Error consultando resultados RFFM.' });
  }
}

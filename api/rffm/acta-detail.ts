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
    const codacta = (req.query?.codacta || '').toString().trim();
    if (!codacta) {
      return res.status(400).json({ error: 'Parámetro codacta requerido' });
    }
    const response = await fetch(`https://www.rffm.es/acta-partido/${codacta}`, { headers: RFFM_HEADERS });
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      throw new Error('No se pudo leer el acta arbitral de la RFFM.');
    }
    const json = JSON.parse(match[1]);
    return res.status(200).json({ ok: true, game: json?.props?.pageProps?.game || null });
  } catch (err: any) {
    console.error('Error in /api/rffm/acta-detail:', err);
    return res.status(500).json({ error: err?.message || 'Error consultando acta arbitral.' });
  }
}

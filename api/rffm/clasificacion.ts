import { fetchClasificacionData } from '../../src/lib/rffmServerLogic';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const q = req.query || {};
    const standings = await fetchClasificacionData({
      temporada: (q.temporada || '22').toString(),
      competicion: (q.competicion || '26738324').toString(),
      grupo: (q.grupo || '27306559').toString(),
      jornada: q.jornada ? q.jornada.toString() : undefined,
      tipojuego: (q.tipojuego || '1').toString()
    });
    return res.status(200).json(standings);
  } catch (err: any) {
    console.error('Error in /api/rffm/clasificacion:', err);
    return res.status(500).json({ error: err?.message || 'Error consultando clasificación RFFM.' });
  }
}

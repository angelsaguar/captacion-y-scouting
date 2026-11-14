import { extractCalendarData } from '../../src/lib/rffmServerLogic';

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

    const data = await extractCalendarData({
      calendarUrl: (body.calendarUrl || query.calendarUrl || body.url || query.url || '').toString(),
      temporada: (body.temporada || query.temporada || '').toString(),
      competicion: (body.competicion || query.competicion || '').toString(),
      grupo: (body.grupo || query.grupo || '').toString(),
      tipojuego: (body.tipojuego || query.tipojuego || '').toString(),
      teamName: (body.teamName || query.teamName || '').toString()
    });

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Error in /api/rffm/extract-calendar:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      error: err?.message || 'Error al extraer los datos de la federación.'
    });
  }
}

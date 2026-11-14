import { fetchSingleActaDetail } from '../../src/lib/rffmServerLogic';

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
    const game = await fetchSingleActaDetail(codacta);
    return res.status(200).json({ ok: true, game });
  } catch (err: any) {
    console.error('Error in /api/rffm/acta-detail:', err);
    return res.status(500).json({ error: err?.message || 'Error consultando acta arbitral.' });
  }
}

import { generateLocalTacticalAdvice } from '../src/lib/tacticalAdvisor';

export default async function handler(req: any, res: any) {
  // CORS headers for Vercel functions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { teamName, rivalName, rivalSystem, rivalNotes, myRoster } = body;

    if (!rivalSystem) {
      return res.status(400).json({ error: 'El sistema del equipo rival es requerido.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `Eres el Director Técnico y Analista Táctico Máster de fútbol para el equipo ${teamName || 'U.D. La Poveda'}.
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
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
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
              required: ['sistemaRecomendado', 'razonamientoSistema', 'objetivosTacticos', 'puntosFuertesRival', 'instruccionesPorPuesto', 'estrategiaBalonParado']
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.status(200).json(parsed);
        }
      } catch (geminiErr) {
        console.warn('Gemini API call error in Vercel function, using fallback:', geminiErr);
      }
    }

    // Fallback if no GEMINI_API_KEY or Gemini call failed
    const fallback = generateLocalTacticalAdvice(rivalSystem, rivalName, myRoster, teamName);
    return res.status(200).json(fallback);
  } catch (error: any) {
    console.error('Error in /api/tactical-advice function:', error);
    const fallback = generateLocalTacticalAdvice('1-4-4-2', 'Rival', []);
    return res.status(200).json(fallback);
  }
}

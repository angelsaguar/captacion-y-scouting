export interface TacticalAdviceResult {
  sistemaRecomendado: string;
  razonamientoSistema: string;
  objetivosTacticos: string[];
  puntosFuertesRival: string[];
  instruccionesPorPuesto: string;
  estrategiaBalonParado: string;
}

export function generateLocalTacticalAdvice(
  rivalSystem: string,
  rivalName?: string,
  myRoster?: any[],
  teamName: string = 'U.D. La Poveda'
): TacticalAdviceResult {
  const normRival = (rivalSystem || '').trim();
  const rival = rivalName || 'Rival';

  let sistemaRecomendado = '1-4-3-3';
  let razonamientoSistema = '';
  let objetivosTacticos: string[] = [];
  let puntosFuertesRival: string[] = [];

  if (normRival.includes('1-4-4-2')) {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `El sistema 1-4-3-3 es idóneo para contrarrestar el 1-4-4-2 de ${rival}. Generamos una superioridad numérica decisiva de 3v2 en la medular con nuestro pivote y dos interiores. Además, nuestras dos extremas abiertas fijan a sus laterales, obligándoles a hundirse y desprotegiendo los carriles interiores.`;
    objetivosTacticos = [
      `1. Dominar el carril central aprovechando la superioridad de 3 centrocampistas de ${teamName} contra sus 2 pivotes.`,
      `2. Fijar a sus laterales con nuestras extremas abiertas para generar pasillos interiores de ruptura.`,
      `3. Presión tras pérdida inmediata en su primer pase para evitar envíos directos a sus 2 delanteras.`
    ];
    puntosFuertesRival = [
      `Su doble punta en el 1-4-4-2 genera constante peligro en balones directos y segundas jugadas.`,
      `Su banda doble (lateral + interior) puede doblar y colgar centros peligrosos al área.`
    ];
  } else if (normRival.includes('1-4-3-3')) {
    sistemaRecomendado = '1-4-2-3-1';
    razonamientoSistema = `El 1-4-2-3-1 neutraliza el 1-4-3-3 de ${rival} situando un doble pivote defensivo que tapa las recepciones interiores de sus interiores y extremo inverso. Nuestra mediapunta exprime el espacio a la espalda de su pivote defensivo.`;
    objetivosTacticos = [
      `1. Doble pivote en vigilancia estrecha para neutralizar las recepciones entre líneas de ${rival}.`,
      `2. Ataque rápido por bandas tras recuperar, atacando el espacio a la espalda de sus laterales desplegados.`,
      `3. Basculación defensiva en bloque medio para cerrar vías de penetración interiores.`
    ];
    puntosFuertesRival = [
      `Amplitud y peligro constante en el 1v1 por parte de sus dos extremas.`,
      `Buen trato de balón y llegada de segunda línea con sus interiores.`
    ];
  } else if (normRival.includes('1-3-5-2') || normRival.includes('1-5-3-2')) {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `Contra la línea de 3 o 5 defensores de ${rival}, el 1-4-3-3 permite presionar alto a sus centrales exteriores con nuestras extremas y forzar que su salida pase por balones divididos o zonas sin ventaja.`;
    objetivosTacticos = [
      `1. Presión alta orientada hacia la banda para atrapar a sus carrileros sin línea de pase clara.`,
      `2. Circulación rápida de lado a lado para desorganizar la basculación de su línea defensiva de 5.`,
      `3. Disparos desde media distancia aprovechando el espacio por delante de su área.`
    ];
    puntosFuertesRival = [
      `Densidad defensiva en área propia con 3 centrales.`,
      `Incorporación ofensiva profunda de sus carrileros.`
    ];
  } else if (normRival.includes('1-4-2-3-1')) {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `Contra el 1-4-2-3-1 de ${rival}, nuestro pivote defensivo fijará a su enganche/mediapunta mientras nuestros dos interiores presionan a su doble pivote, impidiendo que inicien juego cómodamente.`;
    objetivosTacticos = [
      `1. Marcaje estrecho de nuestro pivote sobre el mediapunta principal de ${rival}.`,
      `2. Mover el balón en triángulo en el mediocampo para desgastar su doble pivote.`,
      `3. Desmarques de ruptura de nuestras extremas a las espaldas de sus laterales.`
    ];
    puntosFuertesRival = [
      `Calidad técnica de su enganche entre líneas.`,
      `Equilibrio defensivo que aporta su doble pivote.`
    ];
  } else if (normRival.includes('1-3-4-3')) {
    sistemaRecomendado = '1-4-4-2';
    razonamientoSistema = `Contra el 1-3-4-3 abierto de ${rival}, el 1-4-4-2 permite fijar 2 delanteros contra sus 3 centrales e invadir con doblamientos laterales los carriles desprotegidos.`;
    objetivosTacticos = [
      `1. Doblamientos en banda para generar situaciones de 2v1 contra sus carrileros.`,
      `2. Fijación de sus 3 centrales con nuestra pareja de atacantes.`,
      `3. Transiciones ofensivas verticales en cuanto se recupere la posesión.`
    ];
    puntosFuertesRival = [
      `Acumulación de futbolistas en primera y segunda línea de ataque.`,
      `Presión alta intensa en campo contrario.`
    ];
  } else {
    sistemaRecomendado = '1-4-3-3';
    razonamientoSistema = `Analizando la formación ${normRival} de ${rival}, el sistema 1-4-3-3 nos garantiza máxima flexibilidad, amplitud y control en el mediocampo para imponernos tácticamente.`;
    objetivosTacticos = [
      `1. Imponer nuestro ritmo de juego mediante posesión con sentido e intencionalidad.`,
      `2. Coberturas y permutas constantes en línea defensiva para evitar despistes.`,
      `3. Intensidad máxima en la presión tras pérdida durante los primeros 5 segundos.`
    ];
    puntosFuertesRival = [
      `Organización colectiva según su sistema característico.`,
      `Capacidad de contraataque si les permitimos espacios libres.`
    ];
  }

  // Generate role instructions based on roster if available
  let instruccionesPorPuesto = '';
  if (myRoster && myRoster.length > 0) {
    const gks = myRoster.filter(p => p.posicion === 'PORTERO').map(p => p.nombre);
    const dfs = myRoster.filter(p => p.posicion === 'DEFENSA').map(p => p.nombre);
    const mfs = myRoster.filter(p => p.posicion === 'CENTROCAMPISTA').map(p => p.nombre);
    const fws = myRoster.filter(p => p.posicion === 'DELANTERO').map(p => p.nombre);

    instruccionesPorPuesto = `• Portería (${gks.length > 0 ? gks[0] : 'Titular'}): Salida en corto preferente con centrales, atenta a balones a la espalda de la zaga.\n` +
      `• Defensa (${dfs.length > 0 ? dfs.slice(0, 4).join(', ') : 'Línea de 4'}): Laterales activas en apoyos y vigilancia de extremos. Centrales contundentes en duelos aéreos.\n` +
      `• Mediocampo (${mfs.length > 0 ? mfs.slice(0, 3).join(', ') : 'Medular'}): Movilidad constante, recibir perfiladas y buscar siempre el lado débil de ${rival}.\n` +
      `• Delantera (${fws.length > 0 ? fws.slice(0, 3).join(', ') : 'Ataque'}): Extremas fijando amplitud, delantera centro ofreciendo desmarques de apoyo y ruptura.`;
  } else {
    instruccionesPorPuesto = `• Portería: Salida en corto preferente con centrales, atenta a balones a la espalda de la zaga.\n` +
      `• Defensa: Laterales activas en apoyos y vigilancia de extremos. Centrales contundentes en duelos aéreos.\n` +
      `• Mediocampo: Movilidad constante, recibir perfiladas y buscar siempre el lado débil de ${rival}.\n` +
      `• Delantera: Extremas fijando amplitud, delantera centro ofreciendo desmarques de apoyo y ruptura.`;
  }

  const estrategiaBalonParado = `• Córners Ofensivos: 2 jugadoras al primer palo para peinar, ataque al segundo palo desde fuera del área.\n` +
    `• Córners Defensivos: Marcaje mixto (2 en zona corta + 5 marcajes individuales agresivos).\n` +
    `• Faltas Laterales: Poner centro tenso buscando la zona entre el punto de penalti y área pequeña.`;

  return {
    sistemaRecomendado,
    razonamientoSistema,
    objetivosTacticos,
    puntosFuertesRival,
    instruccionesPorPuesto,
    estrategiaBalonParado
  };
}

export async function getTacticalAdvice(params: {
  teamName: string;
  rivalName: string;
  rivalSystem: string;
  rivalNotes?: string;
  myRoster?: any[];
}): Promise<TacticalAdviceResult> {
  const { teamName, rivalName, rivalSystem, rivalNotes, myRoster } = params;

  // 1. Try server route with a 3.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/tactical-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(params)
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.sistemaRecomendado) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Server /api/tactical-advice call skipped/failed:', err);
  }

  // 2. Try client-side Gemini if API key exists in environment
  try {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
    if (apiKey) {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Eres el Director Técnico y Analista Táctico Máster de fútbol para el equipo ${teamName || 'U.D. La Poveda'}.
Nos enfrentamos al rival "${rivalName || 'Rival'}" que juega habitualmente con el sistema de juego: ${rivalSystem}.
${rivalNotes ? `Información/Notas sobre el juego del rival: ${rivalNotes}` : ''}
${myRoster && myRoster.length > 0 ? `Nuestra plantilla disponible incluye a: ${myRoster.map((p: any) => `${p.nombre} (${p.posicion || 'Jugadora'})`).join(', ')}.` : ''}

Recomienda la mejor contra-estrategia táctica para que nuestro equipo venza a este rival. Proporciona la respuesta estrictamente en JSON con los campos:
{
  "sistemaRecomendado": "Sistema sugerido para nuestro equipo (ej. 1-4-3-3, 1-4-2-3-1, 1-3-5-2)",
  "razonamientoSistema": "Explicación táctica detallada de por qué este sistema neutraliza específicamente el ${rivalSystem} del rival",
  "objetivosTacticos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"],
  "puntosFuertesRival": ["Punto fuerte 1", "Punto fuerte 2"],
  "instruccionesPorPuesto": "Instrucciones de alineación o roles clave para nuestras líneas",
  "estrategiaBalonParado": "Sugerencias tácticas para córners y faltas a balón parado"
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
              objetivosTacticos: { type: Type.ARRAY, items: { type: Type.STRING } },
              puntosFuertesRival: { type: Type.ARRAY, items: { type: Type.STRING } },
              instruccionesPorPuesto: { type: Type.STRING },
              estrategiaBalonParado: { type: Type.STRING }
            },
            required: ['sistemaRecomendado', 'razonamientoSistema', 'objetivosTacticos', 'puntosFuertesRival', 'instruccionesPorPuesto', 'estrategiaBalonParado']
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed && parsed.sistemaRecomendado) {
          return parsed;
        }
      }
    }
  } catch (geminiClientErr) {
    console.warn('Client-side Gemini call failed, using local generator:', geminiClientErr);
  }

  // 3. Fallback to local tactical engine (Instant and guaranteed)
  return generateLocalTacticalAdvice(rivalSystem, rivalName, myRoster, teamName);
}


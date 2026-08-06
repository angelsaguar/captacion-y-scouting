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

  // Example API route for complex scouting logic if needed
  app.post("/api/scouting-report", async (req, res) => {
    // This could involve Gemini API later
    res.json({ message: "Scouting report endpoint" });
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
        model: "gemini-3.6-flash",
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

import { applyApiCors, authorizeClubRequest } from "../src/server/clubAuth";
import { generateLocalTacticalAdvice } from "../src/lib/tacticalAdvisor";

function boundedString(value: unknown, maxLength: number, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

export default async function handler(req: any, res: any) {
  if (!applyApiCors(req, res, ["POST"])) {
    return res.status(403).json({ error: "Origen no autorizado." });
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authorization = await authorizeClubRequest(req.headers.authorization, ["gestion-equipo"]);
  if (authorization.ok === false) {
    return res.status(authorization.statusCode).json({ error: authorization.error });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Solicitud no válida." });
    }

    const teamName = boundedString(body.teamName, 80, "FUNDACION. AFE");
    const rivalName = boundedString(body.rivalName, 80, "Rival");
    const rivalSystem = boundedString(body.rivalSystem, 40);
    const rivalNotes = boundedString(body.rivalNotes, 1000);
    const rosterInput = Array.isArray(body.myRoster) ? body.myRoster.slice(0, 40) : [];
    const myRoster = rosterInput.map((player: any) => ({
      nombre: boundedString(player?.nombre, 60, "Jugadora"),
      posicion: boundedString(player?.posicion, 40, "Jugadora"),
    }));

    if (!rivalSystem || !/^[0-9A-Za-zÀ-ÿ .+/-]{1,40}$/.test(rivalSystem)) {
      return res.status(400).json({ error: "El sistema del equipo rival es obligatorio y debe ser válido." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI, Type } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });

        const prompt = `Eres el Director Técnico y Analista Táctico Máster de fútbol para el equipo ${teamName || "FUNDACION. AFE"}.
Nos enfrentamos al rival "${rivalName || "Rival"}" que juega habitualmente con el sistema de juego / formación: ${rivalSystem}.
${rivalNotes ? `Información/Notas sobre el juego del rival: ${rivalNotes}` : ""}
${myRoster.length > 0 ? `Nuestra plantilla disponible incluye a: ${myRoster.map((player: any) => `${player.nombre} (${player.posicion})`).join(", ")}.` : ""}

Recomienda la mejor contra-estrategia táctica para que nuestro equipo venza a este rival. Proporciona la respuesta estrictamente en JSON con los campos:
{
  "sistemaRecomendado": "Sistema sugerido para nuestro equipo (ej. 1-4-3-3, 1-4-2-3-1, 1-3-5-2)",
  "razonamientoSistema": "Explicación táctica detallada de por qué este sistema neutraliza específicamente el ${rivalSystem} del rival",
  "objetivosTacticos": ["Objetivos en ataque, defensa y transiciones"],
  "puntosFuertesRival": ["Puntos fuertes y vigilancias del rival"],
  "instruccionesPorPuesto": "Instrucciones para portería, defensa, mediocampo y delantera",
  "estrategiaBalonParado": "Sugerencias para córners y faltas"
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
                objetivosTacticos: { type: Type.ARRAY, items: { type: Type.STRING } },
                puntosFuertesRival: { type: Type.ARRAY, items: { type: Type.STRING } },
                instruccionesPorPuesto: { type: Type.STRING },
                estrategiaBalonParado: { type: Type.STRING },
              },
              required: ["sistemaRecomendado", "razonamientoSistema", "objetivosTacticos", "puntosFuertesRival", "instruccionesPorPuesto", "estrategiaBalonParado"],
            },
          },
        });

        if (response.text) {
          return res.status(200).json(JSON.parse(response.text));
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed; using local tactical fallback.");
      }
    }

    return res.status(200).json(generateLocalTacticalAdvice(rivalSystem, rivalName, myRoster, teamName));
  } catch (error) {
    console.error("Tactical advice request failed:", error);
    return res.status(400).json({ error: "No se pudo procesar la solicitud táctica." });
  }
}

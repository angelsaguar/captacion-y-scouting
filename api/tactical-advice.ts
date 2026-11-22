import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { generateLocalTacticalAdvice } from "../src/lib/tacticalAdvisor";

const FIREBASE_PROJECT_ID = "gen-lang-client-0091658680";
const FIRESTORE_DATABASE_ID = "ai-studio-remixcaptacionys-b51f65a2-fce1-4849-a665-604b0915604c";
const SCOUT_ACCESS_DOCUMENT = "club_access/alejandro_scout";
const ADMIN_EMAIL = "angel.saguar@telefonica.net";
const SCOUT_EMAIL = "asaguar04@gmail.com";
const REQUIRED_MODULE = "gestion-equipo";
const PRODUCTION_ORIGIN = "https://captacion-y-scouting.vercel.app";

if (getApps().length === 0) {
  initializeApp({ projectId: FIREBASE_PROJECT_ID });
}

const adminDb = getFirestore(undefined, FIRESTORE_DATABASE_ID);

function allowedOrigins(): Set<string> {
  const configured = (process.env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([PRODUCTION_ORIGIN, "http://localhost:3000", "http://localhost:5173", ...configured]);
}

function applyCors(req: any, res: any): boolean {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  if (!origin) return true; // Non-browser clients still require a valid Firebase token.
  if (!allowedOrigins().has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

async function authorizeRequest(req: any): Promise<{ uid: string; role: "admin" | "scout" } | null> {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;

  const decoded = await getAuth().verifyIdToken(token);
  if (decoded.aud !== FIREBASE_PROJECT_ID || !decoded.email_verified || !decoded.email) return null;
  const email = decoded.email.trim().toLowerCase();

  if (email === ADMIN_EMAIL) {
    const adminUid = (process.env.CLUB_ADMIN_FIREBASE_UID || "").trim();
    if (!adminUid || decoded.uid !== adminUid) return null;
    return { uid: decoded.uid, role: "admin" };
  }

  if (email !== SCOUT_EMAIL) return null;
  let snapshot;
  try {
    snapshot = await adminDb.doc(SCOUT_ACCESS_DOCUMENT).get();
  } catch (error) {
    const dependencyError = new Error("Firestore authorization lookup failed");
    (dependencyError as any).name = "AuthorizationDependencyError";
    (dependencyError as any).cause = error;
    throw dependencyError;
  }
  if (!snapshot.exists) return null;
  const access = snapshot.data() || {};
  const allowedModules = Array.isArray(access.allowedModules) ? access.allowedModules : [];
  if (
    typeof access.email !== "string" ||
    access.email.trim().toLowerCase() !== SCOUT_EMAIL ||
    access.active !== true ||
    access.uidLocked !== true ||
    typeof access.uid !== "string" ||
    access.uid !== decoded.uid ||
    !allowedModules.includes(REQUIRED_MODULE)
  ) return null;

  return { uid: decoded.uid, role: "scout" };
}

function boundedString(value: unknown, maxLength: number, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

export default async function handler(req: any, res: any) {
  if (!applyCors(req, res)) {
    return res.status(403).json({ error: "Origen no autorizado." });
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let identity: { uid: string; role: "admin" | "scout" } | null = null;
  try {
    identity = await authorizeRequest(req);
  } catch (error: any) {
    if (error?.name === "AuthorizationDependencyError") {
      console.error("Tactical advice authorization dependency failed.");
      return res.status(503).json({ error: "No se pudo verificar la autorización. Inténtalo de nuevo." });
    }
    return res.status(401).json({ error: "Sesión no válida o caducada. Vuelve a iniciar sesión." });
  }
  if (!identity) {
    return res.status(403).json({ error: "No tienes autorización para utilizar el asesor táctico." });
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

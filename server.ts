import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "url";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  extractCalendarData,
  fetchClasificacionData,
  fetchResultadosData,
  fetchSingleActaDetail,
  syncActasDetailedData,
} from "./src/lib/rffmServerLogic";

export const EXPECTED_FIREBASE_PROJECT_ID = "gen-lang-client-0091658680";
export const ADMIN_AUTHORIZED_EMAIL = "angel.saguar@telefonica.net";
const ADMIN_AUTHORIZED_UID = (process.env.CLUB_ADMIN_FIREBASE_UID || "").trim();
export const ALEJANDRO_AUTHORIZED_EMAIL = "asaguar04@gmail.com";

if (getApps().length === 0) {
  initializeApp({ projectId: EXPECTED_FIREBASE_PROJECT_ID });
}

export const FIRESTORE_DATABASE_ID = "ai-studio-remixcaptacionys-b51f65a2-fce1-4849-a665-604b0915604c";
export const SCOUT_ACCESS_DOCUMENT = "club_access/alejandro_scout";
const adminDb = getFirestore(undefined, FIRESTORE_DATABASE_ID);
export interface ServerScoutAccessState {
  email: string; uid: string; uidLocked: boolean; active: boolean; allowedModules: string[];
}
export async function readScoutAccessFromFirestore(): Promise<ServerScoutAccessState | null> {
  const snapshot = await adminDb.doc(SCOUT_ACCESS_DOCUMENT).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const validModules = new Set(["scouting", "campograma", "needs", "gestion-equipo", "estadisticas-rivales"]);
  return {
    email: typeof data.email === "string" ? data.email.trim().toLowerCase() : "",
    uid: typeof data.uid === "string" ? data.uid.trim() : "",
    uidLocked: data.uidLocked === true,
    active: data.active === true,
    allowedModules: Array.isArray(data.allowedModules)
      ? data.allowedModules.filter((module: unknown): module is string => typeof module === "string" && validModules.has(module))
      : [],
  };
}

export interface ClubTokenVerificationResult {
  allowed: boolean;
  statusCode: number;
  error?: string;
  role?: "admin" | "scout";
  email?: string;
  uid?: string;
}

/**
 * Pure verification evaluator used by the Express middleware after cryptographic verifyIdToken().
 */
export function evaluateDecodedClubToken(decoded: DecodedIdToken | null | undefined, requiredModules: string[] = [], scoutAccess: ServerScoutAccessState | null = null): ClubTokenVerificationResult {
  if (!decoded || !decoded.uid) return { allowed: false, statusCode: 401, error: "No autenticado: Token inválido o ausente." };
  if (decoded.aud !== EXPECTED_FIREBASE_PROJECT_ID) return { allowed: false, statusCode: 403, error: "Proyecto Firebase no coincidente." };
  const email = (decoded.email || "").trim().toLowerCase();
  if (!decoded.email_verified || !email) return { allowed: false, statusCode: 403, error: "Se requiere una cuenta con correo verificado." };
  if (email === ADMIN_AUTHORIZED_EMAIL) {
    if (!ADMIN_AUTHORIZED_UID || decoded.uid !== ADMIN_AUTHORIZED_UID) {
      return { allowed: false, statusCode: 403, error: "Identidad de administrador no vinculada al UID autorizado del entorno." };
    }
    return { allowed: true, statusCode: 200, role: "admin", email, uid: decoded.uid };
  }
  if (email !== ALEJANDRO_AUTHORIZED_EMAIL) return { allowed: false, statusCode: 403, error: "Cuenta no autorizada en Captación y Scouting." };
  if (!scoutAccess || scoutAccess.email !== ALEJANDRO_AUTHORIZED_EMAIL) return { allowed: false, statusCode: 403, error: "Perfil de observador inexistente o no válido." };
  if (!scoutAccess.active) return { allowed: false, statusCode: 403, error: "La cuenta de observador está desactivada." };
  if (!scoutAccess.uidLocked || !scoutAccess.uid || scoutAccess.uid !== decoded.uid) return { allowed: false, statusCode: 403, error: "El UID no coincide con el vínculo autorizado y sellado." };
  if (requiredModules.length > 0 && !requiredModules.some((module) => scoutAccess.allowedModules.includes(module))) {
    return { allowed: false, statusCode: 403, error: "No está habilitado ninguno de los módulos requeridos: " + requiredModules.join(" / ") };
  }
  return { allowed: true, statusCode: 200, role: "scout", email, uid: decoded.uid };
}

let myFilename = "";
let myDirname = "";

try {
  if (typeof __filename !== "undefined") {
    myFilename = __filename;
  }
  if (typeof __dirname !== "undefined") {
    myDirname = __dirname;
  }
} catch {
  // Ignore reference errors
}

if (!myDirname) {
  try {
    if (import.meta && import.meta.url) {
      myFilename = fileURLToPath(import.meta.url);
      myDirname = path.dirname(myFilename);
    } else {
      myDirname = process.cwd();
      myFilename = path.join(myDirname, "server.ts");
    }
  } catch {
    myDirname = process.cwd();
    myFilename = path.join(myDirname, "server.ts");
  }
}

// Per-IP Rate Limiter
interface RateBucket {
  count: number;
  resetAt: number;
}
const ipRateBuckets = new Map<string, RateBucket>();

function createRateLimiter(maxRequestsPerMinute: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const existing = ipRateBuckets.get(key);

    if (!existing || now > existing.resetAt) {
      ipRateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }

    existing.count += 1;
    if (existing.count > maxRequestsPerMinute) {
      return res.status(429).json({
        error: "Demasiadas peticiones desde esta dirección IP. Espera un minuto antes de reintentar.",
      });
    }

    return next();
  };
}

/**
 * Cryptographic Firebase Admin SDK authentication & authorization middleware.
 * Uses getAuth().verifyIdToken(idToken) and enforces the two-account Zero-Trust policy.
 */
function requireClubAuth(requiredModules: string[] = [], adminOnly = false) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "No autenticado: Cabecera Authorization Bearer requerida.",
        });
      }

      const idToken = authHeader.slice("Bearer ".length).trim();
      if (!idToken) {
        return res.status(401).json({
          error: "No autenticado: Token vacío.",
        });
      }

      const decoded = await getAuth().verifyIdToken(idToken);
      let scoutAccess: ServerScoutAccessState | null = null;
      if ((decoded.email || "").trim().toLowerCase() === ALEJANDRO_AUTHORIZED_EMAIL) {
        try {
          scoutAccess = await readScoutAccessFromFirestore();
        } catch (firestoreError) {
          console.error("Firestore authorization lookup failed:", firestoreError);
          return res.status(503).json({ error: "No se pudo verificar el perfil de acceso. Inténtalo de nuevo." });
        }
      }
      const evaluation = evaluateDecodedClubToken(decoded, requiredModules, scoutAccess);

      if (!evaluation.allowed) {
        return res.status(evaluation.statusCode).json({ error: evaluation.error });
      }

      if (adminOnly && evaluation.role !== "admin") {
        return res.status(403).json({
          error: "Acceso restringido exclusivamente al Administrador Principal (angel.saguar@telefonica.net).",
        });
      }

      (req as any).clubUser = {
        uid: evaluation.uid,
        email: evaluation.email,
        role: evaluation.role,
      };

      return next();
    } catch (err: any) {
      return res.status(401).json({
        error: "Token de sesión inválido o expirado. Vuelve a iniciar sesión con Google.",
        details: err?.code || "auth/invalid-id-token",
      });
    }
  };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers for Cloud Run / Mac / iPad deployment
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    next();
  });

  app.use(express.json({ limit: "250kb" }));

  // Public Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      projectId: EXPECTED_FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString(),
    });
  });

  // Compatibility endpoint: reports Firestore state; it never accepts writes.
  app.post("/api/admin/sync-scout-access", createRateLimiter(30), requireClubAuth([], true), async (_req, res) => {
    try {
      const access = await readScoutAccessFromFirestore();
      if (!access) return res.status(404).json({ error: "No existe el perfil de acceso del observador." });
      return res.json({ ok: true, scoutAccess: access, source: "firestore" });
    } catch (error) {
      console.error("Firestore scout access read failed:", error);
      return res.status(503).json({ error: "No se pudo consultar el perfil de acceso." });
    }
  });

  // Compatibility endpoint: validates UID against Firestore without changing it.
  app.post("/api/scout/seal-uid", createRateLimiter(15), requireClubAuth([]), async (req, res) => {
    const clubUser = (req as any).clubUser;
    if (!clubUser || clubUser.email !== ALEJANDRO_AUTHORIZED_EMAIL) return res.status(403).json({ error: "Operación reservada para la cuenta de observador." });
    try {
      const access = await readScoutAccessFromFirestore();
      if (!access || !access.active || !access.uidLocked || access.uid !== clubUser.uid) return res.status(403).json({ error: "El UID no coincide con el vínculo persistido en Firestore." });
      return res.json({ ok: true, uidLocked: true, source: "firestore" });
    } catch (error) {
      console.error("Firestore UID verification failed:", error);
      return res.status(503).json({ error: "No se pudo verificar el vínculo UID." });
    }
  });

  // Official RFFM Classification Proxy (Protected by Firebase Admin verifyIdToken + Rate Limit)
  app.get(
    "/api/rffm/clasificacion",
    createRateLimiter(30),
    requireClubAuth(["estadisticas-rivales", "gestion-equipo"]),
    async (req, res) => {
      try {
        const standings = await fetchClasificacionData({
          temporada: req.query.temporada?.toString() || "22",
          competicion: req.query.competicion?.toString() || "26738324",
          grupo: req.query.grupo?.toString() || "27306559",
          jornada: req.query.jornada?.toString() || "4",
          tipojuego: req.query.tipojuego?.toString() || "1",
        });
        res.json(standings);
      } catch (err: any) {
        console.error("Error fetching RFFM clasificacion:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Official RFFM Resultados & Jornadas Proxy
  app.get(
    "/api/rffm/resultados",
    createRateLimiter(30),
    requireClubAuth(["estadisticas-rivales", "gestion-equipo"]),
    async (req, res) => {
      try {
        const results = await fetchResultadosData({
          temporada: req.query.temporada?.toString() || "22",
          competicion: req.query.competicion?.toString() || "26738324",
          grupo: req.query.grupo?.toString() || "27306559",
          jornada: req.query.jornada?.toString() || "4",
          tipojuego: req.query.tipojuego?.toString() || "1",
        });
        res.json(results);
      } catch (err: any) {
        console.error("Error fetching RFFM resultados:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Extract all competition, teams, rankings and match actas arbitrales from a single Calendar URL
  const handleExtractCalendar = async (req: express.Request, res: express.Response) => {
    try {
      const extractedData = await extractCalendarData({
        calendarUrl: (
          req.body?.calendarUrl ||
          req.query?.calendarUrl ||
          req.body?.url ||
          req.query?.url ||
          ""
        ).toString(),
        temporada: (req.body?.temporada || req.query?.temporada || "").toString(),
        competicion: (req.body?.competicion || req.query?.competicion || "").toString(),
        grupo: (req.body?.grupo || req.query?.grupo || "").toString(),
        tipojuego: (req.body?.tipojuego || req.query?.tipojuego || "").toString(),
        teamName: (req.body?.teamName || req.query?.teamName || "").toString(),
      });
      res.json(extractedData);
    } catch (err: any) {
      console.error("Error in /api/rffm/extract-calendar:", err);
      const status = err?.statusCode || 500;
      res.status(status).json({ error: err.message || "Error al extraer los datos de la federación." });
    }
  };

  app.post(
    "/api/rffm/extract-calendar",
    createRateLimiter(20),
    requireClubAuth(["estadisticas-rivales", "gestion-equipo"]),
    handleExtractCalendar
  );
  app.get(
    "/api/rffm/extract-calendar",
    createRateLimiter(20),
    requireClubAuth(["estadisticas-rivales", "gestion-equipo"]),
    handleExtractCalendar
  );

  // Single Acta Arbitral proxy (with strict numeric codacta validation)
  app.get(
    "/api/rffm/acta-detail",
    createRateLimiter(30),
    requireClubAuth(["estadisticas-rivales", "gestion-equipo"]),
    async (req, res) => {
      try {
        const codacta = (req.query.codacta || "").toString().trim();
        if (!codacta || !/^\d{1,12}$/.test(codacta)) {
          return res.status(400).json({ error: "Parámetro codacta inválido (debe ser numérico)." });
        }
        const game = await fetchSingleActaDetail(codacta);
        res.json({ ok: true, game });
      } catch (err: any) {
        console.error("Error fetching single acta:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Sync all actas arbitrales in the category and extract all player disciplinary stats & rival metrics
  app.post(
    "/api/rffm/sync-actas-detailed",
    createRateLimiter(15),
    requireClubAuth(["estadisticas-rivales", "gestion-equipo"]),
    async (req, res) => {
      try {
        const databasePayload = await syncActasDetailedData({
          calendarUrl: (req.body?.calendarUrl || "").toString(),
          temporada: (req.body?.temporada || "").toString(),
          competicion: (req.body?.competicion || "").toString(),
          grupo: (req.body?.grupo || "").toString(),
          tipojuego: (req.body?.tipojuego || "").toString(),
          teamName: (req.body?.teamName || "INFANTIL B").toString(),
        });
        res.json({ ok: true, data: databasePayload });
      } catch (err: any) {
        console.error("Error in /api/rffm/sync-actas-detailed:", err);
        res.status(500).json({ error: err.message || "Error al procesar actas arbitrales." });
      }
    }
  );

  // Gemini AI Match Plan & Tactical Counter-Strategy endpoint (Protected & Rate-Limited)
  app.post(
    "/api/tactical-advice",
    createRateLimiter(10),
    requireClubAuth(["gestion-equipo"]),
    async (req, res) => {
      try {
        const rawTeamName = String(req.body?.teamName || "FUNDACION. AFE").slice(0, 80);
        const rawRivalName = String(req.body?.rivalName || "Rival").slice(0, 80);
        const rawRivalSystem = String(req.body?.rivalSystem || "").trim().slice(0, 40);
        const rawRivalNotes = String(req.body?.rivalNotes || "").slice(0, 1000);
        const safeRoster = Array.isArray(req.body?.myRoster)
          ? req.body.myRoster.slice(0, 30)
          : [];

        if (!rawRivalSystem) {
          return res.status(400).json({ error: "El sistema del equipo rival es requerido." });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          const fallback = generateFallbackTacticalAdvice(rawRivalSystem, rawRivalName, safeRoster);
          return res.json(fallback);
        }

        const { GoogleGenAI, Type } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const prompt = `Eres el Director Técnico y Analista Táctico Máster de fútbol para el equipo ${rawTeamName}.
Nos enfrentamos al rival "${rawRivalName}" que juega habitualmente con el sistema de juego / formación: ${rawRivalSystem}.
${rawRivalNotes ? `Información/Notas sobre el juego del rival: ${rawRivalNotes}` : ""}
${
  safeRoster.length > 0
    ? `Nuestra plantilla disponible incluye a: ${safeRoster
        .map((p: any) => `${String(p?.nombre || "").slice(0, 40)} (${String(p?.posicion || "Jugadora").slice(0, 30)})`)
        .join(", ")}.`
    : ""
}

Recomienda la mejor contra-estrategia táctica para que nuestro equipo venza a este rival. Proporciona la respuesta estrictamente en JSON con los campos:
{
  "sistemaRecomendado": "Sistema sugerido para nuestro equipo (ej. 1-4-3-3, 1-4-2-3-1, 1-3-5-2)",
  "razonamientoSistema": "Explicación táctica detallada de por qué este sistema neutraliza específicamente el ${rawRivalSystem} del rival (superioridades en campo, basculaciones, emparejamientos clave)",
  "objetivosTacticos": [
    "Objetivo 1 en fase de ataque y salida de balón",
    "Objetivo 2 en fase defensiva y presión",
    "Objetivo 3 en transiciones ofensiva/defensiva"
  ],
  "puntosFuertesRival": [
    "Punto fuerte / peligro principal 1 del sistema ${rawRivalSystem}",
    "Vigilancia o duelo clave 2"
  ],
  "instruccionesPorPuesto": "Instrucciones de alineación o roles clave para nuestras líneas (Portería, Defensa, Mediocampo, Delantera)",
  "estrategiaBalonParado": "Sugerencias tácticas para córners y faltas a balón parado (ABP)"
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
                objetivosTacticos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                puntosFuertesRival: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                instruccionesPorPuesto: { type: Type.STRING },
                estrategiaBalonParado: { type: Type.STRING },
              },
              required: [
                "sistemaRecomendado",
                "razonamientoSistema",
                "objetivosTacticos",
                "puntosFuertesRival",
                "instruccionesPorPuesto",
                "estrategiaBalonParado",
              ],
            },
          },
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
        const fallback = generateFallbackTacticalAdvice(
          req.body?.rivalSystem,
          req.body?.rivalName,
          req.body?.myRoster
        );
        return res.json(fallback);
      }
    }
  );

  function generateFallbackTacticalAdvice(rivalSystem: string, rivalName?: string, _myRoster?: any[]) {
    const normRival = (rivalSystem || "").trim();
    let sistemaRecomendado = "1-4-3-3";
    let razonamientoSistema = "";
    let objetivosTacticos: string[] = [];
    let puntosFuertesRival: string[] = [];

    if (normRival.includes("1-4-4-2")) {
      sistemaRecomendado = "1-4-3-3";
      razonamientoSistema = `El sistema 1-4-3-3 es idóneo para contra-restar el 1-4-4-2 de ${rivalName || "rival"}. Generamos superioridad numérica 3v2 en la medular con nuestro pivote y dos interiores. Además, nuestras dos extremas fijan a sus laterales, desprotegiendo los carriles interiores.`;
      objetivosTacticos = [
        "1. Dominar el carril central aprovechando la superioridad de 3 centrocampistas contra sus 2 pivotes.",
        "2. Fijar a sus laterales con nuestras extremas abiertas para generar pasillos interiores de ruptura.",
        "3. Presión tras pérdida inmediata en su primer pase para evitar envíos directos a sus 2 delanteras.",
      ];
      puntosFuertesRival = [
        "Su doble punta genera constante peligro en balones directos y segundas jugadas.",
        "Su banda doble (lateral + interior) puede generar centros peligrosos al área.",
      ];
    } else if (normRival.includes("1-4-3-3")) {
      sistemaRecomendado = "1-4-2-3-1";
      razonamientoSistema = `El 1-4-2-3-1 neutraliza el 1-4-3-3 de ${rivalName || "rival"} situando un doble pivote defensivo que tapa las recepciones interiores de sus interiores y extremo inverso. Nuestra mediapunta explota la espalda de su pivote.`;
      objetivosTacticos = [
        "1. Doble pivote en vigilancia estrecha para neutralizar las recepciones entre líneas del rival.",
        "2. Ataque rápido por bandas tras recuperar, atacando el espacio a la espalda de sus laterales desplegados.",
        "3. Basculación defensiva en bloque medio para cerrar vías de penetración.",
      ];
      puntosFuertesRival = [
        "Amplitud y peligro constante en el 1v1 por parte de sus dos extremas.",
        "Buen trato de balón y llegada de segunda línea con sus interiores.",
      ];
    } else if (normRival.includes("1-3-5-2") || normRival.includes("1-5-3-2")) {
      sistemaRecomendado = "1-4-3-3";
      razonamientoSistema = `Contra la defensa de 3 o 5 de ${rivalName || "rival"}, el 1-4-3-3 permite presionar alto a sus centrales laterales con nuestras extremas y forzar que su salida pase por balones divididos o zonas sin ventaja.`;
      objetivosTacticos = [
        "1. Presión alta orientada hacia la banda para atrapar a sus carrileros sin línea de pase clara.",
        "2. Circulación rápida de lado a lado para desorganizar la basculación de su línea defensiva.",
        "3. Disparos desde media distancia aprovechando el espacio por delante de su área.",
      ];
      puntosFuertesRival = [
        "Densidad defensiva en área propia con 3 centrales.",
        "Incorporación ofensiva profunda de sus carrileros.",
      ];
    } else if (normRival.includes("1-4-2-3-1")) {
      sistemaRecomendado = "1-4-3-3";
      razonamientoSistema = `Contra el 1-4-2-3-1 de ${rivalName || "rival"}, nuestro pivote fijará a su mediapunta mientras nuestros dos interiores presionan a su doble pivote, impidiendo que inicien juego cómodamente.`;
      objetivosTacticos = [
        "1. Marcaje estrecho de nuestro MCD sobre su enganche/mediapunta principal.",
        "2. Mover el balón en triángulo en el mediocampo para desgastar su doble pivote.",
        "3. Desmarques de ruptura de nuestras extremas a las espaldas de sus laterales.",
      ];
      puntosFuertesRival = [
        "Calidad técnica de su enganche entre líneas.",
        "Equilibrio defensivo que aporta su doble pivote.",
      ];
    } else {
      sistemaRecomendado = "1-4-3-3";
      razonamientoSistema = `Analizando la formación ${normRival} de ${rivalName || "rival"}, el sistema 1-4-3-3 nos garantiza flexibilidad, amplitud y control en el mediocampo para imponernos tácticamente.`;
      objetivosTacticos = [
        "1. Imponer nuestro ritmo de juego mediante posesión con sentido e intencionalidad.",
        "2. Coberturas y permutas constantes en línea defensiva para evitar despistes.",
        "3. Intensidad máxima en la presión tras pérdida durante los primeros 5 segundos.",
      ];
      puntosFuertesRival = [
        "Organización colectiva según su sistema característico.",
        "Capacidad de contraataque si les permitimos espacios libres.",
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
      estrategiaBalonParado,
    };
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    let viteInstance: ViteDevServer | null = null;
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    })
      .then((vite) => {
        viteInstance = vite;
        return vite;
      })
      .catch((err) => {
        console.error("Failed to initialize Vite dev server:", err);
        process.exit(1);
      });

    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      try {
        const vite = viteInstance ?? (await vitePromise);
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });

    // Fallback to index.html for SPA routes in development
    app.get("*", async (req, res, next) => {
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(req.path);
      if (req.path.startsWith("/api") || hasExtension) {
        return next();
      }
      try {
        const vite = viteInstance ?? (await vitePromise);
        let template = fs.readFileSync(path.resolve(myDirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err) {
        next(err);
      }
    });
  } else {
    // Production static serving
    const distPath = path.join(myDirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (
  process.env.VITEST !== "true" &&
  process.env.SKIP_SERVER_AUTOSTART !== "true" &&
  !process.env.NODE_TEST_CONTEXT &&
  !process.argv.includes("--test")
) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const EXPECTED_FIREBASE_PROJECT_ID = "gen-lang-client-0091658680";
export const ADMIN_AUTHORIZED_EMAIL = "angel.saguar@telefonica.net";
export const ALEJANDRO_AUTHORIZED_EMAIL = "asaguar04@gmail.com";
export const FIRESTORE_DATABASE_ID = "ai-studio-remixcaptacionys-b51f65a2-fce1-4849-a665-604b0915604c";
export const SCOUT_ACCESS_DOCUMENT = "club_access/alejandro_scout";

const VALID_MODULES = new Set([
  "scouting",
  "campograma",
  "needs",
  "gestion-equipo",
  "estadisticas-rivales",
]);

export interface FirebaseServiceAccountConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Parses the optional server-only service account JSON used by Vercel.
 * The private key is never logged or returned to client-facing code.
 */
export function parseFirebaseServiceAccount(raw: string): FirebaseServiceAccountConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON debe contener JSON válido.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no contiene una cuenta de servicio válida.");
  }

  const account = parsed as Record<string, unknown>;
  const projectId = typeof account.project_id === "string" ? account.project_id.trim() : "";
  const clientEmail = typeof account.client_email === "string" ? account.client_email.trim() : "";
  const privateKey = typeof account.private_key === "string"
    ? account.private_key.replace(/\\n/g, "\n").trim()
    : "";

  if (projectId !== EXPECTED_FIREBASE_PROJECT_ID) {
    throw new Error("La cuenta de servicio no pertenece al proyecto Firebase esperado.");
  }
  if (!clientEmail || !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
      !privateKey.includes("-----END PRIVATE KEY-----")) {
    throw new Error("La cuenta de servicio no contiene client_email y private_key válidos.");
  }

  return { projectId, clientEmail, privateKey };
}

if (getApps().length === 0) {
  const serviceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (serviceAccountJson) {
    const serviceAccount = parseFirebaseServiceAccount(serviceAccountJson);
    initializeApp({
      projectId: EXPECTED_FIREBASE_PROJECT_ID,
      credential: cert(serviceAccount),
    });
  } else {
    // Local environments may use Application Default Credentials.
    // Vercel must provide FIREBASE_SERVICE_ACCOUNT_JSON for Firestore access.
    initializeApp({ projectId: EXPECTED_FIREBASE_PROJECT_ID });
  }
}

const adminDb = getFirestore(undefined, FIRESTORE_DATABASE_ID);

export interface ServerScoutAccessState {
  email: string;
  uid: string;
  uidLocked: boolean;
  active: boolean;
  allowedModules: string[];
}

export type ClubApplicationRole = "admin" | "scout";

export interface ClubIdentity {
  uid: string;
  email: string;
  role: ClubApplicationRole;
}

export interface ClubTokenVerificationResult {
  allowed: boolean;
  statusCode: 200 | 401 | 403;
  error?: string;
  role?: ClubApplicationRole;
  email?: string;
  uid?: string;
}

export type AuthorizationResult =
  | { ok: true; identity: ClubIdentity }
  | { ok: false; statusCode: 401 | 403 | 503; error: string };

export async function readScoutAccessFromFirestore(): Promise<ServerScoutAccessState | null> {
  const snapshot = await adminDb.doc(SCOUT_ACCESS_DOCUMENT).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    email: typeof data.email === "string" ? data.email.trim().toLowerCase() : "",
    uid: typeof data.uid === "string" ? data.uid.trim() : "",
    uidLocked: data.uidLocked === true,
    active: data.active === true,
    allowedModules: Array.isArray(data.allowedModules)
      ? data.allowedModules.filter((module: unknown): module is string =>
          typeof module === "string" && VALID_MODULES.has(module)
        )
      : [],
  };
}

export function evaluateDecodedClubToken(
  decoded: DecodedIdToken | null | undefined,
  requiredModules: string[] = [],
  scoutAccess: ServerScoutAccessState | null = null,
  adminUid: string = (process.env.CLUB_ADMIN_FIREBASE_UID || "").trim()
): ClubTokenVerificationResult {
  if (!decoded || !decoded.uid) {
    return { allowed: false, statusCode: 401, error: "No autenticado: Token inválido o ausente." };
  }
  if (decoded.aud !== EXPECTED_FIREBASE_PROJECT_ID) {
    return { allowed: false, statusCode: 403, error: "Proyecto Firebase no coincidente." };
  }

  const email = (decoded.email || "").trim().toLowerCase();
  if (!decoded.email_verified || !email) {
    return { allowed: false, statusCode: 403, error: "Se requiere una cuenta con correo verificado." };
  }

  if (email === ADMIN_AUTHORIZED_EMAIL) {
    if (!adminUid || decoded.uid !== adminUid) {
      return {
        allowed: false,
        statusCode: 403,
        error: "Identidad de administrador no vinculada al UID autorizado del entorno.",
      };
    }
    return { allowed: true, statusCode: 200, role: "admin", email, uid: decoded.uid };
  }

  if (email !== ALEJANDRO_AUTHORIZED_EMAIL) {
    return { allowed: false, statusCode: 403, error: "Cuenta no autorizada en Captación y Scouting." };
  }
  if (!scoutAccess || scoutAccess.email !== ALEJANDRO_AUTHORIZED_EMAIL) {
    return { allowed: false, statusCode: 403, error: "Perfil de observador inexistente o no válido." };
  }
  if (!scoutAccess.active) {
    return { allowed: false, statusCode: 403, error: "La cuenta de observador está desactivada." };
  }
  if (!scoutAccess.uidLocked || !scoutAccess.uid || scoutAccess.uid !== decoded.uid) {
    return { allowed: false, statusCode: 403, error: "El UID no coincide con el vínculo autorizado y sellado." };
  }
  if (requiredModules.length > 0 && !requiredModules.some((module) => scoutAccess.allowedModules.includes(module))) {
    return {
      allowed: false,
      statusCode: 403,
      error: "No está habilitado ninguno de los módulos requeridos: " + requiredModules.join(" / "),
    };
  }

  return { allowed: true, statusCode: 200, role: "scout", email, uid: decoded.uid };
}

/**
 * Server-only authorization for Vercel API handlers.
 * Firestore failures fail closed and are reported as 503, not as an authenticated request.
 */
export async function authorizeClubRequest(
  authorizationHeader: string | string[] | undefined,
  requiredModules: string[] = []
): Promise<AuthorizationResult> {
  if (typeof authorizationHeader !== "string" || !authorizationHeader.startsWith("Bearer ")) {
    return { ok: false, statusCode: 401, error: "No autenticado: se requiere una sesión válida." };
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, statusCode: 401, error: "No autenticado: token vacío." };
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    return { ok: false, statusCode: 401, error: "Sesión no válida o caducada. Vuelve a iniciar sesión." };
  }

  let scoutAccess: ServerScoutAccessState | null = null;
  if ((decoded.email || "").trim().toLowerCase() === ALEJANDRO_AUTHORIZED_EMAIL) {
    try {
      scoutAccess = await readScoutAccessFromFirestore();
    } catch {
      return {
        ok: false,
        statusCode: 503,
        error: "No se pudo verificar el perfil de acceso. Inténtalo de nuevo.",
      };
    }
  }

  const evaluation = evaluateDecodedClubToken(decoded, requiredModules, scoutAccess);
  if (!evaluation.allowed || !evaluation.uid || !evaluation.email || !evaluation.role) {
    return {
      ok: false,
      statusCode: evaluation.statusCode === 200 ? 403 : evaluation.statusCode,
      error: evaluation.error || "Acceso no autorizado.",
    };
  }

  return {
    ok: true,
    identity: {
      uid: evaluation.uid,
      email: evaluation.email,
      role: evaluation.role,
    },
  };
}

export function getAllowedApiOrigins(): Set<string> {
  const configured = (process.env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([
    "https://captacion-y-scouting.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    ...configured,
  ]);
}

/** Applies an allow-list CORS policy. CORS is not a substitute for authentication. */
export function applyApiCors(req: any, res: any, methods: string[]): boolean {
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin : "";
  if (origin && !getAllowedApiOrigins().has(origin)) return false;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

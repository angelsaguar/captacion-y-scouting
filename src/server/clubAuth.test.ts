import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  evaluateDecodedClubToken,
  parseFirebaseServiceAccount,
  EXPECTED_FIREBASE_PROJECT_ID,
  ADMIN_AUTHORIZED_EMAIL,
  ALEJANDRO_AUTHORIZED_EMAIL,
  type ServerScoutAccessState,
} from "./clubAuth";

const adminUid = "admin-test-uid";
const scoutUid = "scout-test-uid";
const scoutAccess: ServerScoutAccessState = {
  email: ALEJANDRO_AUTHORIZED_EMAIL,
  uid: scoutUid,
  uidLocked: true,
  active: true,
  allowedModules: ["estadisticas-rivales", "gestion-equipo"],
};

function decoded(overrides: Record<string, unknown> = {}) {
  return {
    uid: scoutUid,
    aud: EXPECTED_FIREBASE_PROJECT_ID,
    email: ALEJANDRO_AUTHORIZED_EMAIL,
    email_verified: true,
    ...overrides,
  } as any;
}

test("shared auth denies a missing decoded token", () => {
  assert.equal(evaluateDecodedClubToken(null).allowed, false);
  assert.equal(evaluateDecodedClubToken(null).statusCode, 401);
});

test("shared auth rejects tokens from another Firebase project", () => {
  assert.equal(evaluateDecodedClubToken(decoded({ aud: "wrong-project" }), [], scoutAccess).allowed, false);
});

test("shared auth rejects unverified email", () => {
  assert.equal(evaluateDecodedClubToken(decoded({ email_verified: false }), [], scoutAccess).allowed, false);
});

test("shared auth accepts admin only with the configured UID", () => {
  const admin = decoded({ uid: adminUid, email: ADMIN_AUTHORIZED_EMAIL });
  assert.equal(evaluateDecodedClubToken(admin, [], null, adminUid).role, "admin");
  assert.equal(evaluateDecodedClubToken({ ...admin, uid: "other" }, [], null, adminUid).allowed, false);
  assert.equal(evaluateDecodedClubToken(admin, [], null, "").allowed, false);
});

test("shared auth requires active scout profile and sealed matching UID", () => {
  assert.equal(evaluateDecodedClubToken(decoded(), ["estadisticas-rivales"], scoutAccess).role, "scout");
  assert.equal(evaluateDecodedClubToken(decoded({ uid: "other" }), ["estadisticas-rivales"], scoutAccess).allowed, false);
  assert.equal(evaluateDecodedClubToken(decoded(), ["estadisticas-rivales"], { ...scoutAccess, active: false }).allowed, false);
  assert.equal(evaluateDecodedClubToken(decoded(), ["estadisticas-rivales"], { ...scoutAccess, uidLocked: false }).allowed, false);
  assert.equal(evaluateDecodedClubToken(decoded(), ["estadisticas-rivales"], null).allowed, false);
});

test("shared auth enforces required module intersection", () => {
  assert.equal(evaluateDecodedClubToken(decoded(), ["scouting"], scoutAccess).allowed, false);
  assert.equal(evaluateDecodedClubToken(decoded(), ["needs", "gestion-equipo"], scoutAccess).allowed, true);
});

test("Firebase service account parser accepts the expected project and escaped PEM newlines", () => {
  const parsed = parseFirebaseServiceAccount(JSON.stringify({
    project_id: EXPECTED_FIREBASE_PROJECT_ID,
    client_email: "firebase-admin@example.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\\nexample-key\\n-----END PRIVATE KEY-----\\n",
  }));
  assert.equal(parsed.projectId, EXPECTED_FIREBASE_PROJECT_ID);
  assert.equal(parsed.clientEmail, "firebase-admin@example.iam.gserviceaccount.com");
  assert.ok(parsed.privateKey.includes("\n"));
});

test("Firebase service account parser rejects malformed JSON and a different project", () => {
  assert.throws(() => parseFirebaseServiceAccount("{"), /JSON válido/);
  assert.throws(() => parseFirebaseServiceAccount(JSON.stringify({
    project_id: "another-project",
    client_email: "firebase-admin@example.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----",
  })), /proyecto Firebase esperado/);
});

test("Firebase service account parser rejects missing private key material", () => {
  assert.throws(() => parseFirebaseServiceAccount(JSON.stringify({
    project_id: EXPECTED_FIREBASE_PROJECT_ID,
    client_email: "firebase-admin@example.iam.gserviceaccount.com",
  })), /private_key válidos/);
});

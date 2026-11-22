import { test } from "node:test";
import * as assert from "node:assert/strict";

// Set the protected test UID before importing server.ts, where the environment is read.
process.env.CLUB_ADMIN_FIREBASE_UID = "admin-test-uid";
process.env.SKIP_SERVER_AUTOSTART = "true";

const {
  ADMIN_AUTHORIZED_EMAIL,
  ALEJANDRO_AUTHORIZED_EMAIL,
  EXPECTED_FIREBASE_PROJECT_ID,
  evaluateDecodedClubToken,
  buildClubCustomClaims,
} = await import("../../server.ts");

function token(overrides: Record<string, unknown> = {}) {
  return {
    uid: "scout-test-uid",
    aud: EXPECTED_FIREBASE_PROJECT_ID,
    email: ALEJANDRO_AUTHORIZED_EMAIL,
    email_verified: true,
    ...overrides,
  } as any;
}

const activeScout = {
  email: ALEJANDRO_AUTHORIZED_EMAIL,
  uid: "scout-test-uid",
  uidLocked: true,
  active: true,
  allowedModules: ["scouting", "needs"],
};

test("denies missing token", () => {
  assert.equal(evaluateDecodedClubToken(null).statusCode, 401);
});

test("denies token from another Firebase project", () => {
  assert.equal(evaluateDecodedClubToken(token({ aud: "another-project" })).allowed, false);
});

test("denies unverified email", () => {
  assert.equal(evaluateDecodedClubToken(token({ email_verified: false }), [], activeScout).allowed, false);
});

test("authorizes administrator only when protected UID matches", () => {
  const adminToken = token({ uid: "admin-test-uid", email: ADMIN_AUTHORIZED_EMAIL });
  assert.equal(evaluateDecodedClubToken(adminToken).role, "admin");
  assert.equal(evaluateDecodedClubToken({ ...adminToken, uid: "different-uid" }).allowed, false);
});

test("denies administrator if server UID configuration is absent", () => {
  const adminToken = token({ uid: "admin-test-uid", email: ADMIN_AUTHORIZED_EMAIL });
  assert.equal(evaluateDecodedClubToken(adminToken, [], null, "").allowed, false);
});

test("authorizes scout only for the sealed UID and active profile", () => {
  assert.equal(evaluateDecodedClubToken(token(), ["scouting"], activeScout).role, "scout");
  assert.equal(evaluateDecodedClubToken(token({ uid: "other-uid" }), ["scouting"], activeScout).allowed, false);
  assert.equal(evaluateDecodedClubToken(token(), ["gestion-equipo"], activeScout).allowed, false);
  assert.equal(evaluateDecodedClubToken(token(), ["scouting"], { ...activeScout, active: false }).allowed, false);
  assert.equal(evaluateDecodedClubToken(token(), ["scouting"], { ...activeScout, uidLocked: false }).allowed, false);
});

test("fails closed when Firestore access record is missing", () => {
  assert.equal(evaluateDecodedClubToken(token(), ["scouting"], null).allowed, false);
});

test("preserves unrelated custom claims and replaces managed claims", () => {
  const claims = buildClubCustomClaims(
    { tenant: "club-1", feature_flag: true, app_role: "admin", allowed_modules: ["all"] },
    "scout",
    true,
    ["scouting", "invalid-module", "needs", "scouting"]
  );
  assert.deepEqual(claims, {
    tenant: "club-1",
    feature_flag: true,
    role: "authenticated",
    app_role: "scout",
    app_active: true,
    allowed_modules: ["scouting", "needs"],
  });
});

test("removes module permissions when scout is inactive", () => {
  const claims = buildClubCustomClaims({}, "scout", false, ["scouting"]);
  assert.deepEqual(claims.allowed_modules, []);
  assert.equal(claims.app_active, false);
});

test("admin claim is authenticated and does not receive scout module list", () => {
  const claims = buildClubCustomClaims({ custom: "keep" }, "admin", true, ["scouting"]);
  assert.equal(claims.role, "authenticated");
  assert.equal(claims.app_role, "admin");
  assert.deepEqual(claims.allowed_modules, []);
  assert.equal(claims.custom, "keep");
});

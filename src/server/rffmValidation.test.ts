import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  validateRffmParams,
  validateRffmJornada,
  validateRffmActaCode,
  validateRffmTeamName,
  validateRffmCalendarUrl,
} from "./rffmValidation";

const validParams = {
  temporada: "22",
  competicion: "26738324",
  grupo: "27306559",
  tipojuego: "1",
};

test("RFFM accepts known numeric competition parameters", () => {
  assert.equal(validateRffmParams(validParams), null);
  assert.equal(validateRffmParams({ ...validParams, temporada: "2026" }), null);
  assert.equal(validateRffmParams({ ...validParams, tipojuego: "3" }), null);
});

test("RFFM rejects malformed or oversized competition parameters", () => {
  assert.notEqual(validateRffmParams({ ...validParams, temporada: "2026/2027" }), null);
  assert.notEqual(validateRffmParams({ ...validParams, competicion: "1&grupo=2" }), null);
  assert.notEqual(validateRffmParams({ ...validParams, grupo: "1234567890123" }), null);
  assert.notEqual(validateRffmParams({ ...validParams, tipojuego: "4" }), null);
});

test("RFFM validates jornada range", () => {
  assert.equal(validateRffmJornada("1"), null);
  assert.equal(validateRffmJornada("60"), null);
  assert.notEqual(validateRffmJornada("0"), null);
  assert.notEqual(validateRffmJornada("61"), null);
  assert.notEqual(validateRffmJornada("1&x=2"), null);
});

test("RFFM validates acta codes without assuming numeric-only identifiers", () => {
  assert.equal(validateRffmActaCode("123456789"), null);
  assert.equal(validateRffmActaCode("ACTA_123-ABC"), null);
  assert.notEqual(validateRffmActaCode("../admin"), null);
  assert.notEqual(validateRffmActaCode("a".repeat(41)), null);
});

test("RFFM limits free-text team name and calendar URL lengths", () => {
  assert.equal(validateRffmTeamName("INFANTIL B"), null);
  assert.notEqual(validateRffmTeamName("x".repeat(81)), null);
  assert.equal(validateRffmCalendarUrl("https://www.rffm.es/"), null);
  assert.notEqual(validateRffmCalendarUrl("x".repeat(2049)), null);
});

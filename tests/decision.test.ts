import { describe, expect, it } from "vitest";
import { isDecisionBriefing, isDecisionBriefingRequest } from "../lib/decision";

const request = {
  route: { name: "Karakoram route", distanceKm: 12.4, maximumElevationM: 8_126 },
  weather: null,
  hazards: null,
  satellite: null,
};

const briefing = {
  schemaVersion: "catalyst.decision.briefing.v1",
  generatedAt: "2026-09-01T12:00:00.000Z",
  assessment: "insufficient-evidence",
  engine: { kind: "rules-based", model: null, fallbackReason: "Groq API key is not configured." },
  title: "Karakoram route evidence briefing",
  summary: "More attached evidence is required before this briefing can support a leader review.",
  favorableFactors: [],
  limitingFactors: [],
  unknowns: ["Route weather has not been analyzed."],
  nextChecks: ["Run route weather analysis."],
  humanApprovalRequired: true,
  notice: "Decision support only.",
};

describe("decision briefing contract", () => {
  it("accepts bounded requests and human-reviewed responses", () => {
    expect(isDecisionBriefingRequest(request)).toBe(true);
    expect(isDecisionBriefing(briefing)).toBe(true);
  });

  it("rejects autonomous and unknown engine contracts", () => {
    expect(isDecisionBriefing({ ...briefing, humanApprovalRequired: false })).toBe(false);
    expect(isDecisionBriefing({ ...briefing, engine: { kind: "autonomous", model: null, fallbackReason: null } })).toBe(false);
  });
});

import type { HazardAnalysis } from "./hazard";
import type { RouteWeatherAnalysis } from "./route-weather";

export const DECISION_BRIEFING_SCHEMA_VERSION = "catalyst.decision.briefing.v1" as const;
export type DecisionAssessment = "favorable" | "mixed" | "unfavorable" | "insufficient-evidence";

export interface DecisionBriefingRequest {
  route: { name: string; distanceKm: number; maximumElevationM: number | null };
  weather: RouteWeatherAnalysis | null;
  hazards: HazardAnalysis | null;
  satellite: { sceneId: string; capturedAt: string; cloudCoverPercent: number; groundSampleDistanceM: number } | null;
}

export interface DecisionEvidence {
  label: string;
  evidence: string;
  source: string;
  observedAt: string | null;
}

export interface DecisionBriefing {
  schemaVersion: typeof DECISION_BRIEFING_SCHEMA_VERSION;
  generatedAt: string;
  assessment: DecisionAssessment;
  engine: { kind: "rules-based" | "groq"; model: string | null; fallbackReason: string | null };
  title: string;
  summary: string;
  favorableFactors: DecisionEvidence[];
  limitingFactors: DecisionEvidence[];
  unknowns: string[];
  nextChecks: string[];
  humanApprovalRequired: true;
  notice: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function evidence(value: unknown): value is DecisionEvidence {
  return record(value) && typeof value.label === "string" && typeof value.evidence === "string" && typeof value.source === "string" && (value.observedAt === null || typeof value.observedAt === "string");
}

export function isDecisionBriefingRequest(value: unknown): value is DecisionBriefingRequest {
  if (!record(value) || !record(value.route)) return false;
  const satellite = value.satellite;
  return typeof value.route.name === "string"
    && finite(value.route.distanceKm)
    && (value.route.maximumElevationM === null || finite(value.route.maximumElevationM))
    && (value.weather === null || (record(value.weather) && value.weather.schemaVersion === "catalyst.weather.route.v1"))
    && (value.hazards === null || (record(value.hazards) && value.hazards.schemaVersion === "catalyst.hazard.analysis.v1"))
    && (satellite === null || (record(satellite) && typeof satellite.sceneId === "string" && typeof satellite.capturedAt === "string" && finite(satellite.cloudCoverPercent) && finite(satellite.groundSampleDistanceM)));
}

export function isDecisionBriefing(value: unknown): value is DecisionBriefing {
  return record(value)
    && value.schemaVersion === DECISION_BRIEFING_SCHEMA_VERSION
    && typeof value.generatedAt === "string"
    && ["favorable", "mixed", "unfavorable", "insufficient-evidence"].includes(String(value.assessment))
    && record(value.engine)
    && ["rules-based", "groq"].includes(String(value.engine.kind))
    && (value.engine.model === null || typeof value.engine.model === "string")
    && (value.engine.fallbackReason === null || typeof value.engine.fallbackReason === "string")
    && typeof value.title === "string"
    && typeof value.summary === "string"
    && Array.isArray(value.favorableFactors)
    && value.favorableFactors.every(evidence)
    && Array.isArray(value.limitingFactors)
    && value.limitingFactors.every(evidence)
    && Array.isArray(value.unknowns)
    && value.unknowns.every((item) => typeof item === "string")
    && Array.isArray(value.nextChecks)
    && value.nextChecks.every((item) => typeof item === "string")
    && value.humanApprovalRequired === true
    && typeof value.notice === "string";
}

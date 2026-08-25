import { describe, expect, it } from "vitest";

import {
  QGPS_SCHEMA_VERSION,
  createSimulatedSnapshot,
  deriveFreshness,
  formatAge,
  formatCoordinate,
  isQgpsScenario,
  qgpsScenarios,
} from "../lib/qgps";

const NOW = new Date("2026-08-24T12:00:00.000Z");

describe("QGPS scenario validation", () => {
  it("exposes the supported fixture scenarios", () => {
    expect(qgpsScenarios).toEqual([
      "current",
      "stale",
      "offline",
      "unavailable",
      "empty",
    ]);
  });

  it.each(qgpsScenarios)("accepts the %s scenario", (scenario) => {
    expect(isQgpsScenario(scenario)).toBe(true);
  });

  it.each([null, "", "error", "live", "CURRENT", "unknown"])(
    "rejects unsupported scenario %s",
    (scenario) => {
      expect(isQgpsScenario(scenario)).toBe(false);
    },
  );
});

describe("simulated QGPS snapshots", () => {
  it.each([
    ["current", "connected", "current"],
    ["stale", "connected", "stale"],
    ["offline", "offline", "offline"],
    ["unavailable", "unavailable", "unavailable"],
    ["empty", "connected", "unknown"],
  ] as const)(
    "creates the expected %s state",
    (scenario, connectionState, freshness) => {
      const snapshot = createSimulatedSnapshot(scenario, NOW);

      expect(snapshot).toMatchObject({
        schemaVersion: QGPS_SCHEMA_VERSION,
        mode: "simulated",
        scenario,
        connection: { state: connectionState },
        freshness,
      });
    },
  );

  it.each(qgpsScenarios)(
    "never marks the %s simulated fixture as live",
    (scenario) => {
      const snapshot = createSimulatedSnapshot(scenario, NOW);

      expect(snapshot.mode).toBe("simulated");
      expect(snapshot.mode).not.toBe("live");
    },
  );

  it("creates a connected current position and ordered recent track", () => {
    const snapshot = createSimulatedSnapshot("current", NOW);

    expect(snapshot.connection).toEqual({
      state: "connected",
      receivedAt: NOW.toISOString(),
    });
    expect(snapshot.position).toMatchObject({
      latitude: 35.7486,
      longitude: 76.5296,
      altitudeM: 4_891,
      timestamp: "2026-08-24T11:59:00.000Z",
      accuracyM: 12,
      fixType: "3D",
      satellites: 11,
      hdop: 0.9,
    });
    expect(snapshot.track).toHaveLength(7);
    expect(snapshot.track[0]?.timestamp).toBe("2026-08-24T11:45:00.000Z");
    expect(snapshot.track.at(-1)?.timestamp).toBe("2026-08-24T11:57:00.000Z");
    expect(
      snapshot.track.every((point, index, track) =>
        index === 0
          ? true
          : new Date(point.timestamp).getTime() >
            new Date(track[index - 1]!.timestamp).getTime(),
      ),
    ).toBe(true);
  });

  it("keeps an old connected observation in the stale state", () => {
    const snapshot = createSimulatedSnapshot("stale", NOW);

    expect(snapshot.connection.state).toBe("connected");
    expect(snapshot.freshness).toBe("stale");
    expect(snapshot.position?.timestamp).toBe("2026-08-24T11:33:00.000Z");
    expect(snapshot.position).not.toBeNull();
    expect(snapshot.track).not.toHaveLength(0);
  });

  it("preserves the last-known position and track while offline", () => {
    const snapshot = createSimulatedSnapshot("offline", NOW);

    expect(snapshot.connection).toEqual({
      state: "offline",
      receivedAt: NOW.toISOString(),
    });
    expect(snapshot.freshness).toBe("offline");
    expect(snapshot.position?.timestamp).toBe("2026-08-24T11:42:00.000Z");
    expect(snapshot.position).not.toBeNull();
    expect(snapshot.track).not.toHaveLength(0);
  });

  it("represents an unavailable source without fabricated operational data", () => {
    const snapshot = createSimulatedSnapshot("unavailable", NOW);

    expect(snapshot.connection).toEqual({
      state: "unavailable",
      receivedAt: null,
    });
    expect(snapshot.position).toBeNull();
    expect(snapshot.track).toEqual([]);
    expect(snapshot.notice).toContain("No QGPS source is configured");
  });

  it("represents a connected but empty source without zero-value data", () => {
    const snapshot = createSimulatedSnapshot("empty", NOW);

    expect(snapshot.connection).toEqual({
      state: "connected",
      receivedAt: null,
    });
    expect(snapshot.freshness).toBe("unknown");
    expect(snapshot.position).toBeNull();
    expect(snapshot.track).toEqual([]);
    expect(snapshot.notice).toContain("has not supplied a position");
  });

  it("keeps unverified source metadata nullable instead of inventing values", () => {
    const snapshot = createSimulatedSnapshot("current", NOW);

    expect(snapshot.source).toEqual({
      name: "Catalyst QGPS fixture",
      adapter: "Catalyst backend API",
      project: null,
      repository: null,
      license: null,
      protocol: null,
    });
  });
});

describe("QGPS freshness derivation", () => {
  it("returns unknown when a connected source has no observation timestamp", () => {
    expect(deriveFreshness(null, "connected", NOW)).toBe("unknown");
  });

  it("treats an observation exactly ten minutes old as current", () => {
    expect(
      deriveFreshness("2026-08-24T11:50:00.000Z", "connected", NOW),
    ).toBe("current");
  });

  it("treats an observation older than ten minutes as stale", () => {
    expect(
      deriveFreshness("2026-08-24T11:49:59.999Z", "connected", NOW),
    ).toBe("stale");
  });

  it("treats a future observation as current", () => {
    expect(
      deriveFreshness("2026-08-24T12:01:00.000Z", "connected", NOW),
    ).toBe("current");
  });

  it("lets offline and unavailable connection states override timestamp age", () => {
    const recentTimestamp = "2026-08-24T11:59:00.000Z";

    expect(deriveFreshness(recentTimestamp, "offline", NOW)).toBe("offline");
    expect(deriveFreshness(null, "offline", NOW)).toBe("offline");
    expect(deriveFreshness(recentTimestamp, "unavailable", NOW)).toBe(
      "unavailable",
    );
    expect(deriveFreshness(null, "unavailable", NOW)).toBe("unavailable");
  });
});

describe("QGPS display formatting", () => {
  it.each([
    [35.7378, "N", "S", "35.73780° N"],
    [-76.5, "E", "W", "76.50000° W"],
    [0, "N", "S", "0.00000° N"],
  ] as const)(
    "formats coordinate %s with fixed precision and direction",
    (value, positive, negative, expected) => {
      expect(formatCoordinate(value, positive, negative)).toBe(expected);
    },
  );

  it.each([
    ["2026-08-24T12:00:00.000Z", "0 sec ago"],
    ["2026-08-24T11:59:15.000Z", "45 sec ago"],
    ["2026-08-24T11:58:30.000Z", "2 min ago"],
    ["2026-08-24T11:01:00.000Z", "59 min ago"],
    ["2026-08-24T11:00:00.000Z", "1 hr ago"],
    ["2026-08-24T10:30:00.000Z", "2 hr ago"],
  ])("formats age for %s as %s", (timestamp, expected) => {
    expect(formatAge(timestamp, NOW)).toBe(expected);
  });

  it("clamps future timestamps to zero seconds ago", () => {
    expect(formatAge("2026-08-24T12:05:00.000Z", NOW)).toBe("0 sec ago");
  });
});

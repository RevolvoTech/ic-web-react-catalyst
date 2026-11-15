import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { acknowledgeReports, clearFieldOwner, pendingReports, queueReport, readField, writeField } from "../lib/field-store";
import { positionState, type FieldPosition } from "../lib/field";

describe("durable field outbox", () => {
  it("keeps concurrent reports, removes only acknowledged IDs and isolates users and expeditions", async () => {
    const base = { recordedAt: "2026-11-15T12:00:00Z", text: "Observed wind", kind: "status" };
    await Promise.all([
      queueReport("alice:exp1", { ...base, clientRecordId: "one" }),
      queueReport("alice:exp1", { ...base, clientRecordId: "two" }),
      queueReport("bob:exp1", { ...base, clientRecordId: "one" }),
      queueReport("alice:exp2", { ...base, clientRecordId: "three" }),
    ]);
    await acknowledgeReports("alice:exp1", ["one"]);
    expect((await pendingReports("alice:exp1")).map((item) => item.clientRecordId)).toEqual(["two"]);
    expect(await pendingReports("bob:exp1")).toHaveLength(1);
    await writeField("alice:exp1", "snapshot", { version: 2 });
    expect(await readField("bob:exp1", "snapshot")).toBeNull();
    await clearFieldOwner("alice");
    expect(await pendingReports("alice:exp1")).toHaveLength(1);
    expect(await pendingReports("alice:exp2")).toHaveLength(1);
    expect(await readField("alice:exp1", "snapshot")).toBeNull();
    expect(await pendingReports("bob:exp1")).toHaveLength(1);
    await clearFieldOwner("alice", false);
    expect(await pendingReports("alice:exp1")).toEqual([]);
  });
  it("recomputes GPS freshness from original timestamps as a downloaded snapshot ages", () => {
    const position = { recorded_at: "2026-11-15T11:50:00Z", received_at: "2026-11-15T11:51:00Z", expected_interval_seconds: 1800 } as FieldPosition;
    expect(positionState(position, false, Date.parse("2026-11-15T12:00:00Z"))).toBe("live");
    expect(positionState(position, false, Date.parse("2026-11-15T12:10:00Z"))).toBe("stale");
    expect(positionState(position, false, Date.parse("2026-11-15T12:21:00Z"))).toBe("offline");
    expect(positionState(position, true, Date.parse("2026-11-15T12:00:00Z"))).toBe("offline");
  });
});

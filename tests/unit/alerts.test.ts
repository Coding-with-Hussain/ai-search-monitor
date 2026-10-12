import { describe, expect, it } from "vitest";

import { computeAlerts } from "@/services/alerts";
import { fixtureMetrics } from "@/tests/fixtures/metrics";
import type { ScanMetrics } from "@/types/domain";

const base = fixtureMetrics();
const withScore = (m: ScanMetrics, score: number, mentionRate = m.overall.mentionRate): ScanMetrics => ({
  ...m,
  overall: { ...m.overall, score, mentionRate },
});

describe("alert rules", () => {
  it("always reports scan completion, nothing else without history", () => {
    const alerts = computeAlerts({ projectName: "ABC", current: base, previous: null, isSimulation: false });
    expect(alerts.map((a) => a.type)).toEqual(["scan_completed"]);
  });

  it("flags drops of 10% or more", () => {
    const alerts = computeAlerts({ projectName: "ABC", current: withScore(base, 50), previous: withScore(base, 60), isSimulation: false });
    expect(alerts.some((a) => a.type === "visibility_drop" && a.severity === "warning")).toBe(true);
  });

  it("reports moderate score changes", () => {
    const alerts = computeAlerts({ projectName: "ABC", current: withScore(base, 66), previous: withScore(base, 60), isSimulation: false });
    expect(alerts.some((a) => a.type === "score_change")).toBe(true);
  });

  it("detects disappearance from AI answers", () => {
    const alerts = computeAlerts({ projectName: "ABC", current: withScore(base, 0, 0), previous: withScore(base, 40, 50), isSimulation: true });
    expect(alerts.find((a) => a.type === "visibility_lost")?.severity).toBe("critical");
    expect(alerts.find((a) => a.type === "scan_completed")?.body).toMatch(/simulation/);
  });

  it("detects a competitor overtaking the business", () => {
    const prev: ScanMetrics = { ...withScore(base, 60), competitors: base.competitors.map((c) => ({ ...c, metrics: { ...c.metrics, score: 40 } })) };
    const cur: ScanMetrics = {
      ...withScore(base, 55),
      competitors: base.competitors.map((c, i) => ({ ...c, metrics: { ...c.metrics, score: i === 0 ? 70 : 30 } })),
    };
    const alerts = computeAlerts({ projectName: "ABC", current: cur, previous: prev, isSimulation: false });
    const overtake = alerts.filter((a) => a.type === "competitor_overtake");
    expect(overtake).toHaveLength(1);
    expect(overtake[0].title).toContain(base.competitors[0].name);
  });
});

import { describe, expect, it } from "vitest";

import { resolveEntitlements, usagePeriod } from "@/lib/billing/entitlements";
import { ANNUAL_DISCOUNT, cyclePrice, displayMonthlyPrice, getPlan, nextPlan, PLAN_IDS, PLANS, stripeLookupKey } from "@/lib/billing/plans";

const now = new Date("2026-10-15T12:00:00Z");
const sub = (over: Partial<Parameters<typeof resolveEntitlements>[0] & object> = {}) => ({
  plan: "starter",
  status: "trialing" as const,
  trialEndsAt: new Date("2026-10-20T00:00:00Z"),
  currentPeriodStart: null,
  currentPeriodEnd: null,
  stripeSubscriptionId: null,
  cancelAtPeriodEnd: false,
  ...over,
});

describe("plan catalogue", () => {
  it("matches the published pricing and limits", () => {
    expect(PLANS.starter).toMatchObject({ monthlyPrice: 19, limits: { projects: 1, queriesPerMonth: 50, competitorsPerProject: 3 } });
    expect(PLANS.growth).toMatchObject({ monthlyPrice: 49, limits: { projects: 3, queriesPerMonth: 250, competitorsPerProject: 10 } });
    expect(PLANS.pro).toMatchObject({ monthlyPrice: 99, limits: { projects: 10, queriesPerMonth: 1000, competitorsPerProject: 20 } });
    expect(PLANS.agency).toMatchObject({ monthlyPrice: 149, limits: { projects: 25, queriesPerMonth: 2500, competitorsPerProject: null } });
  });

  it("limits increase monotonically across plans", () => {
    for (let i = 1; i < PLAN_IDS.length; i++) {
      const a = PLANS[PLAN_IDS[i - 1]].limits;
      const b = PLANS[PLAN_IDS[i]].limits;
      expect(b.projects).toBeGreaterThan(a.projects);
      expect(b.queriesPerMonth).toBeGreaterThan(a.queriesPerMonth);
    }
  });

  it("applies the annual discount", () => {
    expect(displayMonthlyPrice(PLANS.growth, "month")).toBe(49);
    expect(displayMonthlyPrice(PLANS.growth, "year")).toBeCloseTo(49 * (1 - ANNUAL_DISCOUNT), 2);
    expect(cyclePrice(PLANS.growth, "year")).toBe(Math.round(49 * 12 * (1 - ANNUAL_DISCOUNT)));
    expect(stripeLookupKey("pro", "year")).toBe("aivm_pro_yearly");
  });

  it("falls back to starter for unknown ids and finds the next plan", () => {
    expect(getPlan("nope").id).toBe("starter");
    expect(nextPlan("starter")?.id).toBe("growth");
    expect(nextPlan("agency")).toBeNull();
  });
});

describe("entitlements", () => {
  it("active trial grants plan limits", () => {
    const e = resolveEntitlements(sub(), now);
    expect(e.active).toBe(true);
    expect(e.isTrial).toBe(true);
    expect(e.plan.id).toBe("starter");
  });

  it("expired trial is inactive with a helpful reason", () => {
    const e = resolveEntitlements(sub({ trialEndsAt: new Date("2026-10-01T00:00:00Z") }), now);
    expect(e.active).toBe(false);
    expect(e.inactiveReason).toMatch(/trial has ended/i);
  });

  it("active and past_due subscriptions are active; canceled is not", () => {
    expect(resolveEntitlements(sub({ status: "active", plan: "pro" }), now)).toMatchObject({ active: true, plan: { id: "pro" } });
    expect(resolveEntitlements(sub({ status: "past_due" }), now).active).toBe(true);
    const canceled = resolveEntitlements(sub({ status: "canceled" }), now);
    expect(canceled.active).toBe(false);
    expect(canceled.inactiveReason).toMatch(/canceled/i);
  });

  it("uses the Stripe billing period when current, otherwise the calendar month", () => {
    const p = usagePeriod({ currentPeriodStart: new Date("2026-10-05T00:00:00Z"), currentPeriodEnd: new Date("2026-11-05T00:00:00Z") }, now);
    expect(p.start.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    const cal = usagePeriod(null, now);
    expect(cal.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(cal.end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    const stale = usagePeriod({ currentPeriodStart: new Date("2026-08-01T00:00:00Z"), currentPeriodEnd: new Date("2026-09-01T00:00:00Z") }, now);
    expect(stale.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("gives annual subscribers a monthly allowance window, not one for the whole year", () => {
    const yearly = { currentPeriodStart: new Date("2026-03-31T10:00:00Z"), currentPeriodEnd: new Date("2027-03-31T10:00:00Z") };
    const p = usagePeriod(yearly, now); // now = 2026-10-15
    expect(p.start.toISOString()).toBe("2026-09-30T10:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-10-31T10:00:00.000Z");
    const late = usagePeriod(yearly, new Date("2027-03-20T00:00:00Z"));
    expect(late.start.toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(late.end.toISOString()).toBe("2027-03-31T10:00:00.000Z");
  });
});

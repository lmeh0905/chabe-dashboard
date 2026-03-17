import { describe, it, expect } from "vitest";
import {
  computeDepreciation,
  formatAED,
  RESIDUAL_PCT,
  DEPRECIATION_MONTHS,
  MARGIN_PCT,
  VAT_PCT,
} from "./depreciation";

// ─── Constants ───────────────────────────────────────────────────────────────

describe("depreciation constants", () => {
  it("has expected residual percentage (30%)", () => {
    expect(RESIDUAL_PCT).toBe(0.3);
  });
  it("has 36-month depreciation period", () => {
    expect(DEPRECIATION_MONTHS).toBe(36);
  });
  it("has 10% margin", () => {
    expect(MARGIN_PCT).toBe(0.1);
  });
  it("has 5% VAT", () => {
    expect(VAT_PCT).toBe(0.05);
  });
});

// ─── computeDepreciation ─────────────────────────────────────────────────────

describe("computeDepreciation", () => {
  const price = 300_000;
  const purchaseDate = "2024-01-15";

  describe("basic calculation — standard 30/70 method", () => {
    const asOf = new Date("2025-01-15");
    const result = computeDepreciation(price, purchaseDate, asOf);

    it("returns the original purchase price", () => {
      expect(result.purchasePrice).toBe(price);
    });

    it("returns the purchase date unchanged", () => {
      expect(result.purchaseDate).toBe(purchaseDate);
    });

    it("computes residual value as 30% of purchase price", () => {
      expect(result.residualValue).toBeCloseTo(price * RESIDUAL_PCT, 2);
    });

    it("computes depreciable amount as 70% of purchase price", () => {
      expect(result.depreciableAmount).toBeCloseTo(price * (1 - RESIDUAL_PCT), 2);
    });

    it("computes monthly depreciation = depreciable / 36", () => {
      const expected = (price * 0.7) / 36;
      expect(result.monthlyDepreciation).toBeCloseTo(expected, 2);
    });

    it("is not overridden", () => {
      expect(result.isOverridden).toBe(false);
    });
  });

  describe("pro-rata first month", () => {
    it("handles purchase on the 1st (full month)", () => {
      const result = computeDepreciation(price, "2024-03-01", new Date("2024-04-01"));
      // March: 31 days, purchased day 1 → first month fraction = (31 - 1) / 31 = 30/31
      // + 1 full month (April) = 30/31 + 1 ≈ 1.968
      expect(result.monthEquivalent).toBeCloseTo(30 / 31 + 1, 3);
    });

    it("handles purchase mid-month — Dec 3, as of Jan 31", () => {
      const result = computeDepreciation(price, "2024-12-03", new Date("2025-01-31"));
      // Dec: 31 days, purchased day 3 → first month = (31 - 3) / 31 = 28/31
      // + 1 full month (Jan) = 28/31 + 1 ≈ 1.903
      expect(result.monthEquivalent).toBeCloseTo(28 / 31 + 1, 3);
    });

    it("handles same-month query (partial first month only)", () => {
      const result = computeDepreciation(price, "2024-06-10", new Date("2024-06-20"));
      // Same month: days depreciated = 20 - 10 = 10, month has 30 days
      expect(result.monthEquivalent).toBeCloseTo(10 / 30, 3);
    });

    it("returns 0 months if asOf is before purchase date", () => {
      const result = computeDepreciation(price, "2025-06-01", new Date("2025-01-01"));
      expect(result.monthEquivalent).toBe(0);
      expect(result.accumulatedDepreciation).toBe(0);
      expect(result.netAssetValue).toBe(price);
    });
  });

  describe("cap at 36 months", () => {
    it("caps month equivalent at 36", () => {
      const result = computeDepreciation(price, "2020-01-01", new Date("2025-01-01"));
      expect(result.monthEquivalent).toBe(DEPRECIATION_MONTHS);
      expect(result.fullyDepreciated).toBe(true);
    });

    it("accumulated depreciation equals depreciable amount when fully depreciated", () => {
      const result = computeDepreciation(price, "2020-01-01", new Date("2025-01-01"));
      expect(result.accumulatedDepreciation).toBeCloseTo(result.depreciableAmount, 2);
    });

    it("net asset value equals residual value when fully depreciated", () => {
      const result = computeDepreciation(price, "2020-01-01", new Date("2025-01-01"));
      expect(result.netAssetValue).toBeCloseTo(result.residualValue, 2);
    });

    it("depreciation percentage is 100 when fully depreciated", () => {
      const result = computeDepreciation(price, "2020-01-01", new Date("2025-01-01"));
      expect(result.depreciationPct).toBe(100);
    });
  });

  describe("selling price formula", () => {
    it("selling price = NAV × (1 + 10% margin) × (1 + 5% VAT)", () => {
      const result = computeDepreciation(price, purchaseDate, new Date("2024-07-15"));
      const expectedSelling = result.netAssetValue * (1 + MARGIN_PCT) * (1 + VAT_PCT);
      expect(result.sellingPrice).toBeCloseTo(expectedSelling, 2);
    });
  });

  describe("monthly override", () => {
    const override = 5000;
    const result = computeDepreciation(price, purchaseDate, new Date("2025-01-15"), override);

    it("uses override as monthly depreciation", () => {
      expect(result.monthlyDepreciation).toBe(override);
    });

    it("sets depreciable amount to override × 36", () => {
      expect(result.depreciableAmount).toBe(override * DEPRECIATION_MONTHS);
    });

    it("recalculates residual value", () => {
      expect(result.residualValue).toBe(price - override * DEPRECIATION_MONTHS);
    });

    it("marks as overridden", () => {
      expect(result.isOverridden).toBe(true);
    });

    it("ignores null override", () => {
      const r = computeDepreciation(price, purchaseDate, new Date("2025-01-15"), null);
      expect(r.isOverridden).toBe(false);
      expect(r.monthlyDepreciation).toBeCloseTo((price * 0.7) / 36, 2);
    });

    it("ignores zero override", () => {
      const r = computeDepreciation(price, purchaseDate, new Date("2025-01-15"), 0);
      expect(r.isOverridden).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles purchase date same as asOf", () => {
      const result = computeDepreciation(price, "2025-03-15", new Date("2025-03-15"));
      expect(result.monthEquivalent).toBe(0);
      expect(result.netAssetValue).toBe(price);
    });

    it("handles zero purchase price", () => {
      const result = computeDepreciation(0, "2024-01-01", new Date("2025-01-01"));
      expect(result.depreciableAmount).toBe(0);
      expect(result.monthlyDepreciation).toBe(0);
      expect(result.netAssetValue).toBe(0);
      expect(result.depreciationPct).toBe(0);
    });

    it("handles leap year February", () => {
      // Feb 2024 has 29 days (leap year)
      const result = computeDepreciation(price, "2024-02-10", new Date("2024-03-10"));
      // First month fraction = (29 - 10) / 29 = 19/29, + 1 month
      expect(result.monthEquivalent).toBeCloseTo(19 / 29 + 1, 3);
    });
  });
});

// ─── formatAED ───────────────────────────────────────────────────────────────

describe("formatAED", () => {
  it("formats with 2 decimal places", () => {
    const result = formatAED(1234.5);
    expect(result).toMatch(/1[,.]?234\.50/);
  });

  it("formats zero", () => {
    const result = formatAED(0);
    expect(result).toMatch(/0\.00/);
  });

  it("formats large numbers with thousand separators", () => {
    const result = formatAED(1_000_000);
    expect(result).toMatch(/1[,.]000[,.]000\.00/);
  });
});

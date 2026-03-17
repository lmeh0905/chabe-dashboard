/** Vehicle depreciation calculation — 30/70 method over 36 months with pro-rata */

export const RESIDUAL_PCT = 0.30;
export const DEPRECIATION_MONTHS = 36;
export const MARGIN_PCT = 0.10;
export const VAT_PCT = 0.05;

export interface DepreciationResult {
  purchasePrice: number;
  purchaseDate: string;
  residualValue: number;
  depreciableAmount: number;
  monthlyDepreciation: number;
  monthsElapsed: number;
  monthEquivalent: number;
  accumulatedDepreciation: number;
  netAssetValue: number;
  depreciationPct: number;
  sellingPrice: number;
  fullyDepreciated: boolean;
  isOverridden: boolean;
}

/**
 * Compute depreciation for a vehicle with pro-rata on the first month.
 *
 * First month: (daysInMonth - purchaseDay) / daysInMonth × monthlyDep
 * Subsequent months: full monthlyDep each
 * Capped at 36 month-equivalents total.
 *
 * If monthlyOverride is provided, it replaces the standard monthly amount.
 * depreciableAmount and residualValue are recalculated accordingly.
 *
 * Example: purchased Dec 3 → Dec pro-rata = 28/31
 *          as of Jan 31 → total = 28/31 + 1 = 1.903 months
 */
export function computeDepreciation(
  purchasePrice: number,
  purchaseDate: string,
  asOf?: Date,
  monthlyOverride?: number | null
): DepreciationResult {
  const now = asOf ?? new Date();
  const pDate = new Date(purchaseDate);

  const isOverridden = monthlyOverride != null && monthlyOverride > 0;
  const depreciableAmount = isOverridden
    ? monthlyOverride * DEPRECIATION_MONTHS
    : purchasePrice * (1 - RESIDUAL_PCT);
  const residualValue = purchasePrice - depreciableAmount;
  const monthlyDepreciation = isOverridden
    ? monthlyOverride
    : depreciableAmount / DEPRECIATION_MONTHS;

  let monthEquivalent = 0;

  if (now >= pDate) {
    const daysInPurchaseMonth = new Date(pDate.getFullYear(), pDate.getMonth() + 1, 0).getDate();
    const purchaseDay = pDate.getDate();

    // Month difference (0 = same month, 1 = next month, etc.)
    const monthDiff = (now.getFullYear() - pDate.getFullYear()) * 12
      + (now.getMonth() - pDate.getMonth());

    if (monthDiff === 0) {
      // Same month as purchase: pro-rata based on days elapsed
      const daysDepreciated = Math.max(0, now.getDate() - purchaseDay);
      monthEquivalent = daysDepreciated / daysInPurchaseMonth;
    } else {
      // First month pro-rata + full subsequent months
      const firstMonthFraction = (daysInPurchaseMonth - purchaseDay) / daysInPurchaseMonth;
      monthEquivalent = firstMonthFraction + monthDiff;
    }

    // Cap at depreciation period
    monthEquivalent = Math.min(monthEquivalent, DEPRECIATION_MONTHS);
  }

  const accumulatedDepreciation = monthlyDepreciation * monthEquivalent;
  const netAssetValue = purchasePrice - accumulatedDepreciation;

  const depreciationPct = depreciableAmount > 0
    ? Math.round((accumulatedDepreciation / depreciableAmount) * 100)
    : 0;

  const sellingPrice = netAssetValue * (1 + MARGIN_PCT) * (1 + VAT_PCT);

  // Display-friendly month count (rounded)
  const monthsElapsed = Math.round(monthEquivalent);

  return {
    purchasePrice,
    purchaseDate,
    residualValue,
    depreciableAmount,
    monthlyDepreciation,
    monthsElapsed,
    monthEquivalent,
    accumulatedDepreciation,
    netAssetValue,
    depreciationPct: Math.min(depreciationPct, 100),
    sellingPrice,
    fullyDepreciated: monthEquivalent >= DEPRECIATION_MONTHS,
    isOverridden,
  };
}

/** Format a number as AED with thousands separators and 2 decimals */
export function formatAED(n: number): string {
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const FINANCE_BASE_INCOME_CATEGORIES = ["Donations", "Contracts", "Sponsorship"] as const;

export const FINANCE_INCOME_CATEGORIES = [
  "Donation",
  "Training",
  "School Coaching visits and Follow Up",
  "Assessment",
  "Contracts",
  "Sponsorship",
] as const;

export const FINANCE_INCOME_CATEGORIES_ACCEPTED = [...FINANCE_INCOME_CATEGORIES, "Donations"] as const;

export type FinanceBaseIncomeCategory = (typeof FINANCE_BASE_INCOME_CATEGORIES)[number];
export type FinanceIncomeCategory = (typeof FINANCE_INCOME_CATEGORIES)[number];
export type FinanceIncomeCategoryInput = (typeof FINANCE_INCOME_CATEGORIES_ACCEPTED)[number];

export function normalizeFinanceIncomeCategory(category: string): FinanceIncomeCategory {
  const clean = String(category || "").trim();
  if (clean === "Donations") {
    return "Donation";
  }
  if ((FINANCE_INCOME_CATEGORIES as readonly string[]).includes(clean)) {
    return clean as FinanceIncomeCategory;
  }
  throw new Error(`Unsupported finance category: ${category}`);
}

export function mapFinanceIncomeToBaseCategory(category: string): FinanceBaseIncomeCategory {
  const normalized = normalizeFinanceIncomeCategory(category);
  if (normalized === "Donation") {
    return "Donations";
  }
  if (normalized === "Sponsorship") {
    return "Sponsorship";
  }
  return "Contracts";
}

export function createFinanceIncomeBreakdownZero() {
  return {
    Donation: 0,
    Training: 0,
    "School Coaching visits and Follow Up": 0,
    Assessment: 0,
    Contracts: 0,
    Sponsorship: 0,
  } as Record<FinanceIncomeCategory, number>;
}

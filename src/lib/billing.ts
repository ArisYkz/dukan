export function applyPercentDiscount(price: number, percent: number): number {
  return Math.round(price * (1 - percent / 100));
}

export function isPaidPlan(
  planType: string | null | undefined,
  subscriptionStatus: string | null | undefined,
): boolean {
  if (subscriptionStatus === "banned") return false;
  const plan = (planType || "").toLowerCase();
  return plan === "standard" || plan.includes("pro") || subscriptionStatus === "pre_authorized";
}

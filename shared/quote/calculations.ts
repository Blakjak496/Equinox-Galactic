import { getRouteTerms, Route } from "./route-rules";

export const contractPriceCalc = (
  route: Route | undefined,
  volume: number,
  rush: boolean,
  tier?: "public" | "corp",
  collateral?: number,
): number => {
  if (!route) return 0;

  const terms = getRouteTerms(route, tier ?? "public");

  const min = terms.minReward;
  const collateralFee = collateral
    ? (collateral / 100) * terms.collateralFeePercent
    : 0;
  const base =
    (terms.rate > 0 ? volume * terms.rate : terms.minReward) + collateralFee;

  const extra = rush ? terms.rushPrice : 0;

  return Math.max(min, base) + extra;
};

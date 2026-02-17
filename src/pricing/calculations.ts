import { ROUTE_RULES } from "./route-rules";

export const contractPriceCalc = (
  route: string,
  volume: number,
  rush: boolean,
): number => {
  const rules = ROUTE_RULES[route];

  const min = rules.minPrice;
  const base = rules.flatRate > 0 ? rules.flatRate : volume * rules.ratePerM3;
  const extra = rush ? rules.rushRate : 0;

  const total = Math.max(min, base) + extra;

  return total;
};

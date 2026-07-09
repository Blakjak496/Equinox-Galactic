export type RouteTerms = {
  maxVolume: number;
  minReward: number;
  rate: number;
  rushPrice: number;
  collateralFeePercent: number;
};

export type PricingTier = "public" | "corp";

export type PricingOverride = {
  tier: PricingTier;
  terms: Partial<RouteTerms>;
};

export type Route = {
  systems: [string, string];
  oneWay?: boolean;
  terms: RouteTerms;
  pricingOverrides?: PricingOverride[];
};

export const sanitizeLocation = (location: string): string => {
  let sanitizedLocation: string = location;
  if (location.includes(" - ")) sanitizedLocation = location.split(" - ")[0];
  if (sanitizedLocation.split(" ").length === 2)
    sanitizedLocation = sanitizedLocation.split(" ")[0];

  return sanitizedLocation;
};

export const getRoute = (
  routes: Route[],
  a: string,
  b: string,
): Route | undefined => {
  const route = routes.find(({ systems }) => {
    const [left, right] = systems;
    return (left === a && right === b) || (left === b && right === a);
  });

  if (!route) return undefined;

  if (!route.oneWay) return route;

  return routes.find(({ systems }) => {
    const [left, right] = systems;
    return left === a && right === b;
  });
};

export const getRouteTerms = (
  route: Route,
  tier: PricingTier = "public",
): RouteTerms => {
  const override = route.pricingOverrides?.find(
    (pricing) => pricing.tier === tier,
  );

  return {
    ...route.terms,
    ...override?.terms,
  };
};

export const getValidDestinations = (
  routes: Route[],
  origin: string,
): string[] => {
  const sanitized = sanitizeLocation(origin);
  const dests = new Set<string>();

  for (const route of routes) {
    const [a, b] = route.systems;
    if (a === sanitized) dests.add(b);
    if (b === sanitized && !route.oneWay) dests.add(a);
  }

  return Array.from(dests);
};

export type RouteRule = {
  ratePerM3: number;
  minPrice: number;
  rushRate: number;
  flatRate: number;
};

export const ROUTE_RULES: Record<string, RouteRule> = {
  "BKG-Q2|4-HWWF": {
    ratePerM3: 325,
    minPrice: 50000000,
    flatRate: 0,
    rushRate: 100000000,
  },
  "4-HWWF|BKG-Q2": {
    ratePerM3: 325,
    minPrice: 50000000,
    flatRate: 0,
    rushRate: 100000000,
  },
  "BKG-Q2|Branch": {
    ratePerM3: 0,
    minPrice: 0,
    flatRate: 45000000,
    rushRate: 50000000,
  },
  "Branch|BKG-Q2": {
    ratePerM3: 0,
    minPrice: 0,
    flatRate: 45000000,
    rushRate: 50000000,
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET!;

const adminHeaders = {
  "Content-Type": "application/json",
  "x-admin-secret": ADMIN_SECRET,
};

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...adminHeaders, ...options?.headers },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.message ?? `API error ${res.status}`);
  }

  return json;
}

export const api = {
  getStats: () =>
    apiFetch<{ ok: boolean; data: Record<string, number> }>("/admin/stats"),

  getConfig: () =>
    apiFetch<{
      ok: boolean;
      data: { maxCollateral: number; isotopePrice: number };
    }>("/admin/config"),

  updateConfig: (data: { maxCollateral?: number; isotopePrice?: number }) =>
    apiFetch<{ ok: boolean }>("/admin/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getRoutes: () =>
    apiFetch<{ ok: boolean; data: Route[] }>("/routes"),

  createRoute: (route: Omit<Route, "_id">) =>
    apiFetch<{ ok: boolean }>("/admin/routes", {
      method: "POST",
      body: JSON.stringify(route),
    }),

  updateRoute: (route: Partial<Route> & { systems: [string, string] }) =>
    apiFetch<{ ok: boolean }>("/admin/routes", {
      method: "PATCH",
      body: JSON.stringify(route),
    }),

  deleteRoute: (systems: [string, string]) =>
    apiFetch<{ ok: boolean }>("/admin/routes", {
      method: "DELETE",
      body: JSON.stringify({ systems }),
    }),

  resolveSystem: (name: string) =>
    apiFetch<{ ok: boolean; data: SystemLookup }>(
      `/admin/systems/resolve?name=${encodeURIComponent(name)}`,
    ),

  searchSystems: (query: string) =>
    apiFetch<{ ok: boolean; data: SystemNameMatch[] }>(
      `/admin/systems/search?q=${encodeURIComponent(query)}`,
    ),

  getSystem: (systemId: number) =>
    apiFetch<{ ok: boolean; data: SystemLookup }>(`/admin/systems/${systemId}`),

  calculateRouteCost: (
    pickupSystemName: string,
    dropoffSystemName: string,
    shipCategoryId: string,
  ) =>
    apiFetch<{ ok: boolean; data: RouteCostResult }>("/admin/routes/calculate", {
      method: "POST",
      body: JSON.stringify({
        pickupSystemName,
        dropoffSystemName,
        shipCategoryId,
      }),
    }),

  getMainRoutes: () =>
    apiFetch<{ ok: boolean; data: MainRoute[] }>("/admin/main-routes"),

  createMainRoute: (route: Omit<MainRoute, "_id">) =>
    apiFetch<{ ok: boolean; data: MainRoute }>("/admin/main-routes", {
      method: "POST",
      body: JSON.stringify(route),
    }),

  updateMainRoute: (id: string, route: Omit<MainRoute, "_id">) =>
    apiFetch<{ ok: boolean; data: MainRoute }>(`/admin/main-routes/${id}`, {
      method: "PUT",
      body: JSON.stringify(route),
    }),

  deleteMainRoute: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/main-routes/${id}`, {
      method: "DELETE",
    }),

  getShipCategories: () =>
    apiFetch<{ ok: boolean; data: ShipCategory[] }>("/admin/ship-categories"),

  createShipCategory: (shipCategory: Omit<ShipCategory, "_id">) =>
    apiFetch<{ ok: boolean; data: ShipCategory }>("/admin/ship-categories", {
      method: "POST",
      body: JSON.stringify(shipCategory),
    }),

  updateShipCategory: (id: string, shipCategory: Omit<ShipCategory, "_id">) =>
    apiFetch<{ ok: boolean; data: ShipCategory }>(
      `/admin/ship-categories/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(shipCategory),
      },
    ),

  deleteShipCategory: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/ship-categories/${id}`, {
      method: "DELETE",
    }),

  planJumpRoute: (waypointNames: string[], shipCategoryId: string) =>
    apiFetch<{ ok: boolean; data: JumpRoutePlan }>("/admin/jump-routes/plan", {
      method: "POST",
      body: JSON.stringify({ waypointNames, shipCategoryId }),
    }),
};

export type SystemNameMatch = {
  systemId: number;
  name: string;
};

export type SystemLookup = {
  systemId: number;
  name: string;
  position: { x: number; y: number; z: number } | null;
  securityStatus: number | null;
};

export type MainRoute = {
  _id?: string;
  name: string;
  waypoints: number[];
  active: boolean;
};

export type ShipCategory = {
  _id?: string;
  name: string;
  jumpRangeLY: number;
};

export type JumpRoutePlan = {
  path: string[];
  totalDistanceLY: number;
};

export type RouteCostResult = {
  mode: "detour" | "direct";
  pricePerM3: number;
  minimum: number;
  suggestChargeCollateral: boolean;
  detail: {
    mainRouteName?: string;
    insertBetween?: [string, string];
    extraDistanceLY?: number;
    path?: string[];
    directRoundTripLY?: number;
  };
};

export type Route = {
  _id?: string;
  systems: [string, string];
  oneWay: boolean;
  terms: {
    maxVolume: number;
    minReward: number;
    rate: number;
    rushPrice: number;
    collateralFeePercent: number;
  };
  pricingOverrides: {
    tier: "public" | "corp";
    terms: Partial<Route["terms"]>;
  }[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const ACCESS_TOKEN_KEY = "tools_access_token";
const REFRESH_TOKEN_KEY = "tools_refresh_token";

export type ToolsCharacter = {
  characterId: string;
  characterName: string | null;
  corporationId: string;
};

let accessToken: string | null = null;
let onSessionInvalid: ((message: string) => void) | null = null;

export function setOnSessionInvalid(cb: (message: string) => void) {
  onSessionInvalid = cb;
}

function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

function persistTokens(newAccessToken: string, refreshToken: string) {
  accessToken = newAccessToken;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

function clearTokens() {
  accessToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

// Restores the in-memory access token from localStorage on first load of a
// fresh tab (before any refresh has happened yet) - avoids a needless
// refresh round-trip if the previous access token hasn't expired.
export function loadPersistedAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return accessToken;
}

type LoginResponse = {
  ok: boolean;
  reason?: string;
  message?: string;
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
  character?: ToolsCharacter;
};

// Carries the backend's machine-readable `reason` (e.g. "corp_not_allowed")
// alongside the human-readable message, so callers can distinguish "the
// request itself failed" from "it succeeded in telling you no" without
// string-matching the message text.
export class ApiError extends Error {
  reason?: string;
  constructor(message: string, reason?: string) {
    super(message);
    this.reason = reason;
  }
}

async function rawPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.message ?? `API error ${res.status}`, json?.reason);
  }
  return json as T;
}

// De-duped so multiple concurrent 401s only trigger one refresh call.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return null;

    try {
      const result = await rawPost<LoginResponse>("/tools-auth/refresh", { refreshToken });
      if (!result.ok || !result.accessToken || !result.refreshToken) {
        clearTokens();
        onSessionInvalid?.(result.message ?? "Session expired - please log in again.");
        return null;
      }
      persistTokens(result.accessToken, result.refreshToken);
      return result.accessToken;
    } catch {
      clearTokens();
      onSessionInvalid?.("Session expired - please log in again.");
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function apiFetch<T>(path: string, options?: RequestInit, retried = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401 && !retried) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch<T>(path, options, true);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message ?? `API error ${res.status}`);
  }
  return json as T;
}

export const toolsAuth = {
  login: (code: string, codeVerifier: string, redirectUri: string) =>
    rawPost<LoginResponse>("/tools-auth/login", { code, codeVerifier, redirectUri }).then(
      (result) => {
        if (result.ok && result.accessToken && result.refreshToken) {
          persistTokens(result.accessToken, result.refreshToken);
        }
        return result;
      },
    ),

  refresh: refreshSession,

  logout: async () => {
    const refreshToken = readRefreshToken();
    clearTokens();
    if (refreshToken) {
      await rawPost("/tools-auth/logout", { refreshToken }).catch(() => {});
    }
  },

  logoutEverywhere: async () => {
    try {
      await apiFetch("/tools-auth/logout-everywhere", { method: "POST" });
    } finally {
      clearTokens();
    }
  },

  me: () => apiFetch<{ ok: boolean; data: ToolsCharacter }>("/tools-auth/me"),
};

export const api = {
  getShipCategories: () => apiFetch<{ ok: boolean; data: ShipCategory[] }>("/tools/ship-categories"),

  getAllSystems: () => apiFetch<{ ok: boolean; data: SystemNameMatch[] }>("/tools/systems/all"),

  searchSystems: (q: string) =>
    apiFetch<{ ok: boolean; data: SystemNameMatch[] }>(`/tools/systems/search?q=${encodeURIComponent(q)}`),

  getKnownJumpBridges: () => apiFetch<{ ok: boolean; data: JumpBridgePair[] }>("/tools/jump-bridges/known"),

  planJumpRoute: (
    waypointNames: string[],
    shipCategoryId: string,
    restrictToKeepstars: boolean,
    skillLevel: number,
  ) =>
    apiFetch<{ ok: boolean; message?: string; data?: JumpRoutePlan }>("/tools/jump-routes/plan", {
      method: "POST",
      body: JSON.stringify({ waypointNames, shipCategoryId, restrictToKeepstars, skillLevel }),
    }),

  searchItems: (q: string) =>
    apiFetch<{ ok: boolean; data: ItemSearchMatch[] }>(`/tools/build/items/search?q=${encodeURIComponent(q)}`),

  getBuildStructures: (activity: "manufacturing" | "reaction") =>
    apiFetch<{ ok: boolean; data: BuildStructureOption[] }>(`/tools/build/structures?activity=${activity}`),

  getStructurePreference: () =>
    apiFetch<{ ok: boolean; data: StructurePreference }>("/tools/build/structure-preference"),

  setStructurePreference: (activity: string, structureId: number) =>
    apiFetch<{ ok: boolean }>("/tools/build/structure-preference", {
      method: "PUT",
      body: JSON.stringify({ activity, structureId }),
    }),

  resolveBuild: (params: {
    targetItem: number;
    quantity: number;
    assumedME: number;
    buyPriceSource: "buy" | "split";
    haulRatePerM3: number;
  }) =>
    apiFetch<{ ok: boolean; message?: string; data?: BuildResolveResult }>("/tools/build/resolve", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // The export route returns a raw text file, not JSON, and needs the same
  // bearer header as every other tools request - a plain <a href> download
  // link can't carry that header, so this fetches the file client-side and
  // triggers the download itself via a temporary object URL.
  downloadJumpBridgeExport: async (format: "rift" | "smt") => {
    const res = await fetch(`${API_URL}/tools/jump-bridges/export?format=${format}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message ?? `API error ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jump-bridges-${format}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export type SystemNameMatch = {
  systemId: number;
  name: string;
};

export type ShipCategory = {
  _id?: string;
  name: string;
  baseRangeLY: number;
};

export type JumpRouteStop = {
  systemName: string;
  keepstarName: string | null;
};

export type JumpRoutePlan = {
  stops: JumpRouteStop[];
  totalDistanceLY: number;
  bounds: KeepstarMapBounds;
  systemsInView: KeepstarMapSystem[];
  routePath: KeepstarMapPoint[];
  regions: KeepstarMapRegion[];
};

export type KeepstarMapBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type KeepstarMapSystem = {
  systemId: number;
  name: string;
  x: number;
  z: number;
  securityStatus: number | null;
  regionId: number | null;
  isOnRoute: boolean;
  keepstarName: string | null;
};

export type KeepstarMapPoint = {
  x: number;
  z: number;
};

export type KeepstarMapRegion = {
  regionId: number;
  name: string;
  x: number;
  z: number;
};

export type JumpBridgePair = {
  systemAName: string;
  systemBName: string;
};

export type ItemSearchMatch = {
  typeId: number;
  name: string;
};

export type IndustryActivity = "manufacturing" | "reaction" | "research" | "copying" | "invention";

// The real bonus % behind a structure's rigs is item-dependent (category-
// scoped - see the backend's services/industryCategory.ts), so this only
// ever describes what's physically fitted (names), not a single flat
// number - the actual effective bonus only shows up once an item is
// resolved, in the Build Tree/Shopping List themselves.
export type DescribedIndustryProfile = {
  activity: IndustryActivity;
  securityClass: "highsec" | "lowsec" | "nullsec" | "wormhole";
  facilityTaxPercent: number;
  structureTypeId: number;
  structureTypeName: string | null;
  rigTypeIds: number[];
  rigNames: string[];
};

export type BuildStructureOption = {
  structureId: number;
  name: string | null;
  systemName: string | null;
  profile: DescribedIndustryProfile | null;
};

export type StructurePreferenceEntry = {
  structureId: number;
  name: string | null;
  systemName: string | null;
  profile: DescribedIndustryProfile | null;
} | null;

export type StructurePreference = Record<IndustryActivity, StructurePreferenceEntry>;

export type BuildTreeNode = {
  typeId: number;
  name: string;
  decision: "build" | "buy";
  quantity: number;
  unitCost: number;
  subtotal: number;
  children?: BuildTreeNode[];
};

export type ShoppingListEntry = {
  typeId: number;
  name: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  volumeM3: number;
};

export type BuildResolveResult = {
  target: { typeId: number; name: string; quantity: number };
  summary: {
    totalBuildCost: number;
    totalBuyEverythingCost: number;
    iskSaved: number;
    percentSaved: number;
    jobCount: number;
    totalBuyVolumeM3: number;
  };
  tree: BuildTreeNode;
  shoppingList: ShoppingListEntry[];
  warnings: string[];
};

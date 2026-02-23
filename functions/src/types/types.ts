export type EsiCorpContract = {
  acceptor_id: number;
  assignee_id: number;
  availability: "public" | "personal" | "corporation" | "alliance";
  buyout: number;
  collateral: number;
  contract_id: number;
  date_accepted: string;
  date_completed: string;
  date_expired: string;
  date_issued: string;
  days_to_complete: number;
  end_location_id: number;
  for_corporation: boolean;
  issuer_corporation_id: number;
  issuer_id: number;
  price: number;
  reward: number;
  start_location_id: number;
  status:
    | "outstanding"
    | "in_progress"
    | "finished_issuer"
    | "finished_contractor"
    | "finished"
    | "cancelled"
    | "rejected"
    | "failed"
    | "deleted"
    | "reversed";
  title: string;
  type: "unknown" | "item_exchange" | "auction" | "courier" | "loan";
  volume: number;
};

export type StructureDoc = {
  structureId: string;
  access: "ok" | "forbidden";
  name: string | null;
  ownerId: number | null;
  solarSystemId: number | null;
  solarSystemName: string | null;
  typeId: number | null;
  typeName: string | null;
  position: { x: number; y: number; z: number } | null;
  lastFetchedAt: unknown;
  lastError: string | null;
};

export type SystemDoc = {
  solarSystemId: number;
  name: string;
  lastFetchedAt: unknown;
};

export type TypeDoc = {
  typeId: number;
  name: string;
  lastFetchedAt: unknown;
};

export type QuoteDoc = {
  quoteId: string;
  routeKey: string;
  volumeM3: number;
  collateral: number;
  isRush: boolean;
  rushRate: number;
  flatRate: number;
  reward: number;
};

export type ValidationLevel = "ok" | "warning" | "fail";

export type Validation = {
  level: ValidationLevel;
  reasons: string[];
  message: string | null;
  evaluatedAt: unknown;
};

export type AuthConfig = {
  refreshToken: string;
  CorporationID: string;
  needsReconnect?: boolean;
};

export type ContractsWritePlanItem = {
  esiContract: EsiCorpContract;
  contractRef: FirebaseFirestore.DocumentReference;
  existingStatus?: string;
};

export type CompletionDelta = {
  completedDelta: number;
  completedRewardDelta: number;
  completedByMonthDelta: Record<string, number>;
};

export type CompletionWindowStats = {
  avgCompletionSeconds7d: number | null;
  avgCompletionSamples7d: number;
};

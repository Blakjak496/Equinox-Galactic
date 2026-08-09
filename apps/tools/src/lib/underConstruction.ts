// Gates a page that's still being built to a single corp while it's in
// progress, without touching the corp allow-list itself (Config.allowedCorpIds
// in the backend still controls who can log in at all - this only controls
// who can see an in-progress *page* once logged in). Applied via the
// <UnderConstruction> component and TopBar's per-tab `underConstruction`
// flag - see components/UnderConstruction/UnderConstruction.tsx.
export const UNDER_CONSTRUCTION_ALLOWED_CORP_ID = "98817732";

export function canViewUnderConstruction(corporationId: string | null | undefined): boolean {
  return corporationId === UNDER_CONSTRUCTION_ALLOWED_CORP_ID;
}

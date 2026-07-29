// A structure's in-game name commonly already has its system name baked in
// as a prefix (an owner naming convention, not something this app controls)
// - e.g. "1DQ1-A - Keepstar". Prepending the system name again
// unconditionally produces "1DQ1-A (1DQ1-A - Keepstar)". Only prepend it
// when the structure name doesn't already start with it.
export function formatStructureLabel(
  systemName: string,
  structureName: string | null,
): string {
  if (!structureName) return systemName;
  if (structureName.startsWith(systemName)) return structureName;
  return `${systemName} (${structureName})`;
}

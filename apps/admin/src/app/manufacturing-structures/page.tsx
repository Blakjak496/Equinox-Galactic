"use client";

import { useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import {
  api,
  IndustryActivity,
  IndustryBonusTypeOption,
  IndustryProfile,
  IndustryStructure,
  StructureSearchResult,
} from "@/lib/api";
import styles from "./ManufacturingStructures.module.css";

// Real industry bonus data (models/IndustryBonusType.ts) only ever gets
// seeded for the two activities the Manufacturing Planner actually
// resolves - research/copying/invention have no rig/structure bonus data
// to pick from, so they're not offered here.
const ACTIVITIES: IndustryActivity[] = ["manufacturing", "reaction"];

const EMPTY_FORM = {
  activity: "manufacturing" as IndustryActivity,
  structureTypeId: "" as number | "",
  rigTypeIds: [] as number[],
  facilityTaxPercent: "0",
};

function formatBonus(option: IndustryBonusTypeOption): string {
  const parts: string[] = [];
  if (option.materialBonusPercent) parts.push(`Mat ${option.materialBonusPercent}%`);
  if (option.timeBonusPercent) parts.push(`Time ${option.timeBonusPercent}%`);
  if (option.costBonusPercent) parts.push(`Cost ${option.costBonusPercent}%`);
  return parts.length > 0 ? parts.join(" · ") : "no bonus";
}

export default function ManufacturingStructures() {
  const [structures, setStructures] = useState<IndustryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const fetchStructures = () => {
    api
      .getIndustryStructures()
      .then(({ data }) => setStructures(data))
      .catch(() => setListError("Failed to load manufacturing structures"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchStructures, []);

  // --- Real structure/rig types to pick from, seeded from the SDE ---
  const [bonusTypes, setBonusTypes] = useState<IndustryBonusTypeOption[]>([]);

  useEffect(() => {
    // Fetched once each, unfiltered by activity - both structures and rigs
    // are offered as a full list regardless of which profile is being
    // edited; a type that doesn't apply to the activity at hand (a Raitaru
    // picked for a reaction profile, say) just contributes nothing.
    Promise.all([api.getIndustryBonusTypes("structure"), api.getIndustryBonusTypes("rig")])
      .then(([structures, rigs]) => {
        setBonusTypes([...structures.data, ...rigs.data]);
      })
      .catch(() => {});
  }, []);

  const bonusTypeById = useMemo(
    () => new Map(bonusTypes.map((b) => [b.typeId, b])),
    [bonusTypes],
  );

  // --- Find/select a real, ESI-backed structure to attach a profile to ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StructureSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualId, setManualId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{
    id: number;
    name: string | null;
    systemName: string | null;
  } | null>(null);

  const handleSearch = async () => {
    setFindError(null);
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchStructures(searchQuery.trim());
      setSearchResults(res.data);
    } catch {
      setFindError("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleFetchById = async () => {
    setFindError(null);
    const locationId = Number(manualId.trim());
    if (!Number.isFinite(locationId) || locationId <= 0) {
      setFindError("Enter a valid structure ID");
      return;
    }
    setFetching(true);
    try {
      const res = await api.fetchStructureById(locationId);
      if (!res.ok || !res.data) {
        setFindError(res.message ?? "Failed to fetch structure");
        return;
      }
      setSelected({ id: res.data.id, name: res.data.name, systemName: res.data.systemName });
      setManualId("");
    } catch (err) {
      setFindError(err instanceof Error ? err.message : "Failed to fetch structure");
    } finally {
      setFetching(false);
    }
  };

  // --- Add/edit an industry profile on the selected structure ---
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Neither list is filtered by activity - the full real structure/rig
  // roster is offered regardless of which profile is being edited (a
  // Raitaru picked for a reaction profile just contributes nothing, same
  // as a combat/EWAR rig picked for either).
  const structureOptions = useMemo(() => bonusTypes.filter((b) => b.kind === "structure"), [bonusTypes]);
  const rigOptions = useMemo(() => bonusTypes.filter((b) => b.kind === "rig"), [bonusTypes]);

  const handleActivityChange = (activity: IndustryActivity) => {
    // Switching activity starts a different profile on the same
    // structure, so the previous selection is cleared rather than carried
    // over silently.
    setForm({ ...form, activity, structureTypeId: "", rigTypeIds: [] });
  };

  const toggleRig = (typeId: number, checked: boolean) => {
    setForm({
      ...form,
      rigTypeIds: checked
        ? [...form.rigTypeIds, typeId]
        : form.rigTypeIds.filter((id) => id !== typeId),
    });
  };

  const handleEditProfile = (structure: IndustryStructure, profile: IndustryProfile) => {
    setSelected({ id: structure.structureId, name: structure.name, systemName: structure.systemName });
    setForm({
      activity: profile.activity,
      structureTypeId: profile.structureTypeId,
      rigTypeIds: profile.rigTypeIds,
      facilityTaxPercent: String(profile.facilityTaxPercent),
    });
    setFormError(null);
  };

  const handleSaveProfile = async () => {
    if (!selected) return;
    setFormError(null);

    if (form.structureTypeId === "") {
      setFormError("Select a structure type");
      return;
    }

    setSaving(true);
    try {
      await api.upsertIndustryProfile(selected.id, {
        activity: form.activity,
        structureTypeId: form.structureTypeId,
        rigTypeIds: form.rigTypeIds,
        facilityTaxPercent: form.facilityTaxPercent === "" ? 0 : Number(form.facilityTaxPercent),
      });
      setForm(EMPTY_FORM);
      setSelected(null);
      fetchStructures();
    } catch {
      setFormError("Failed to save industry profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (structureId: number, activity: IndustryActivity) => {
    if (!confirm(`Remove the ${activity} profile from this structure?`)) return;
    try {
      await api.deleteIndustryProfile(structureId, activity);
      fetchStructures();
    } catch {
      setListError("Failed to delete industry profile");
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Find a Structure</h2>
          <p className={styles.hint}>
            An industry profile attaches to a real, ESI-backed structure -
            search by name (already-known structures, e.g. from jump bridge
            or Keepstar discovery), or fetch a new one by ID the same way
            Structure Discovery does.
          </p>

          <div className={styles.discoverRow}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by structure name"
            />
            <Button callback={handleSearch} color="orange" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>System</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Name">{s.name ?? "Unknown"}</td>
                    <td data-label="System">{s.systemName ?? "Unknown"}</td>
                    <td className={styles.actions}>
                      <Button
                        callback={() =>
                          setSelected({ id: s.id, name: s.name, systemName: s.systemName })
                        }
                        color="blue"
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className={styles.discoverRow}>
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Or fetch by structure ID"
            />
            <Button callback={handleFetchById} color="orange" disabled={fetching}>
              {fetching ? "Fetching…" : "Fetch by ID"}
            </Button>
          </div>

          {findError && <p className={styles.error}>{findError}</p>}
        </div>
      </Panel>

      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            {selected
              ? `Industry Profile: ${selected.name ?? selected.id} (${selected.systemName ?? "Unknown system"})`
              : "Industry Profile"}
          </h2>

          {!selected ? (
            <p className={styles.muted}>Find or select a structure above first.</p>
          ) : (
            <>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Activity</label>
                  <select
                    value={form.activity}
                    onChange={(e) => handleActivityChange(e.target.value as IndustryActivity)}
                  >
                    {ACTIVITIES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Structure Type</label>
                  <select
                    value={form.structureTypeId}
                    onChange={(e) => setForm({ ...form, structureTypeId: Number(e.target.value) })}
                  >
                    <option value="" disabled>
                      — Select —
                    </option>
                    {structureOptions.map((opt) => (
                      <option key={opt.typeId} value={opt.typeId}>
                        {opt.name} ({formatBonus(opt)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Facility Tax %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.facilityTaxPercent}
                    onChange={(e) => setForm({ ...form, facilityTaxPercent: e.target.value })}
                    placeholder="e.g. 0"
                  />
                  <span className={styles.hint}>The profile tax rate set on the structure in-game.</span>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Rigs Fitted</label>
                <span className={styles.hint}>
                  Only rigs actually fitted to this structure - check its Structure Browser info
                  in-game if unsure. Each rig only bonuses its own production category, applied
                  automatically at resolve time.
                </span>
                {rigOptions.length === 0 ? (
                  <p className={styles.muted}>No known rigs yet - run seed:industry-bonuses.</p>
                ) : (
                  <div className={styles.checkboxList}>
                    {rigOptions.map((rig) => (
                      <label key={rig.typeId} className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={form.rigTypeIds.includes(rig.typeId)}
                          onChange={(e) => toggleRig(rig.typeId, e.target.checked)}
                        />
                        {rig.name} — {formatBonus(rig)}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {formError && <p className={styles.error}>{formError}</p>}

              <div className={styles.formButtons}>
                <Button callback={handleSaveProfile} color="green" disabled={saving}>
                  {saving ? "Saving…" : "Save Industry Profile"}
                </Button>
                <Button
                  callback={() => {
                    setSelected(null);
                    setForm(EMPTY_FORM);
                  }}
                  color="orange"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Panel>

      <Panel>
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Manufacturing Structures</h2>
          {listError && <p className={styles.error}>{listError}</p>}
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : structures.length === 0 ? (
            <p className={styles.muted}>
              No structures have an industry profile yet - find one above to add its first.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>System</th>
                  <th>Activity</th>
                  <th>Type</th>
                  <th>Rigs</th>
                  <th>Facility Tax</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {structures.flatMap((structure) =>
                  structure.industryProfiles.map((profile) => (
                    <tr key={`${structure.structureId}:${profile.activity}`}>
                      <td data-label="Structure">{structure.name ?? structure.structureId}</td>
                      <td data-label="System">{structure.systemName ?? "Unknown"}</td>
                      <td data-label="Activity">{profile.activity}</td>
                      <td data-label="Type">
                        {bonusTypeById.get(profile.structureTypeId)?.name ?? profile.structureTypeId}
                      </td>
                      <td data-label="Rigs">
                        {profile.rigTypeIds.length === 0
                          ? "—"
                          : profile.rigTypeIds
                              .map((id) => bonusTypeById.get(id)?.name ?? `Type ${id}`)
                              .join(", ")}
                      </td>
                      <td data-label="Facility Tax">{profile.facilityTaxPercent}%</td>
                      <td className={styles.actions}>
                        <IconButton
                          icon="edit"
                          ariaLabel={`Edit ${profile.activity} profile`}
                          callback={() => handleEditProfile(structure, profile)}
                          color="orange"
                        />
                        <IconButton
                          icon="delete"
                          ariaLabel={`Delete ${profile.activity} profile`}
                          callback={() => handleDeleteProfile(structure.structureId, profile.activity)}
                          color="red"
                        />
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}

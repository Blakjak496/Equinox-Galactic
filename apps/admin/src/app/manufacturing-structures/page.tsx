"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import {
  api,
  IndustryActivity,
  IndustryProfile,
  IndustryStructure,
  StructureSearchResult,
} from "@/lib/api";
import styles from "./ManufacturingStructures.module.css";

const ACTIVITIES: IndustryActivity[] = [
  "manufacturing",
  "reaction",
  "research",
  "copying",
  "invention",
];

const SECURITY_CLASSES = ["highsec", "lowsec", "nullsec", "wormhole"] as const;

const EMPTY_FORM = {
  activity: "manufacturing" as IndustryActivity,
  structureType: "",
  rigs: "",
  securityClass: "nullsec" as (typeof SECURITY_CLASSES)[number],
  materialReduction: "",
  timeReduction: "",
  costReduction: "",
};

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

  const handleEditProfile = (structure: IndustryStructure, profile: IndustryProfile) => {
    setSelected({ id: structure.structureId, name: structure.name, systemName: structure.systemName });
    setForm({
      activity: profile.activity,
      structureType: profile.structureType,
      rigs: profile.rigs.join(", "),
      securityClass: profile.securityClass,
      materialReduction: profile.materialReduction != null ? String(profile.materialReduction) : "",
      timeReduction: profile.timeReduction != null ? String(profile.timeReduction) : "",
      costReduction: profile.costReduction != null ? String(profile.costReduction) : "",
    });
    setFormError(null);
  };

  const handleSaveProfile = async () => {
    if (!selected) return;
    setFormError(null);

    if (!form.structureType.trim()) {
      setFormError("Structure type is required (e.g. Sotiyo, Athanor)");
      return;
    }

    setSaving(true);
    try {
      await api.upsertIndustryProfile(selected.id, {
        activity: form.activity,
        structureType: form.structureType.trim(),
        rigs: form.rigs
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
        securityClass: form.securityClass,
        materialReduction: form.materialReduction === "" ? null : Number(form.materialReduction),
        timeReduction: form.timeReduction === "" ? null : Number(form.timeReduction),
        costReduction: form.costReduction === "" ? null : Number(form.costReduction),
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
                    onChange={(e) => setForm({ ...form, activity: e.target.value as IndustryActivity })}
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
                  <input
                    type="text"
                    value={form.structureType}
                    onChange={(e) => setForm({ ...form, structureType: e.target.value })}
                    placeholder="e.g. Sotiyo, Azbel, Athanor, Tatara"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Security Class</label>
                  <select
                    value={form.securityClass}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        securityClass: e.target.value as (typeof SECURITY_CLASSES)[number],
                      })
                    }
                  >
                    {SECURITY_CLASSES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Rigs (comma-separated)</label>
                  <input
                    type="text"
                    value={form.rigs}
                    onChange={(e) => setForm({ ...form, rigs: e.target.value })}
                    placeholder="e.g. L-Set Basic Ship Manufacturing"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Material Reduction %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.materialReduction}
                    onChange={(e) => setForm({ ...form, materialReduction: e.target.value })}
                    placeholder="e.g. 2"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Time Reduction %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.timeReduction}
                    onChange={(e) => setForm({ ...form, timeReduction: e.target.value })}
                    placeholder="e.g. 20"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Cost Reduction %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.costReduction}
                    onChange={(e) => setForm({ ...form, costReduction: e.target.value })}
                    placeholder="e.g. 1"
                  />
                </div>
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
                  <th>ME / TE / Cost</th>
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
                      <td data-label="Type">{profile.structureType}</td>
                      <td data-label="Rigs">{profile.rigs.join(", ") || "—"}</td>
                      <td data-label="ME / TE / Cost">
                        {profile.materialReduction ?? 0}% / {profile.timeReduction ?? 0}% /{" "}
                        {profile.costReduction ?? 0}%
                      </td>
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

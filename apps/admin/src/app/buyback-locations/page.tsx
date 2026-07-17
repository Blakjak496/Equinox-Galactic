"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackLocation, StructureSearchResult } from "@/lib/api";
import styles from "./BuybackLocations.module.css";

const EMPTY_FORM = {
  name: "",
  isHub: false,
  distance: 0,
  pickupRatePerM3: "",
  stockLocationId: null as number | null,
  stockLocationName: null as string | null,
  stockLocationSystemName: null as string | null,
};

export default function BuybackLocations() {
  const [locations, setLocations] = useState<BuybackLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<BuybackLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structureQuery, setStructureQuery] = useState("");
  const [structureResults, setStructureResults] = useState<
    StructureSearchResult[]
  >([]);
  const [searchingStructures, setSearchingStructures] = useState(false);
  const [fetchIdInput, setFetchIdInput] = useState("");
  const [fetchingById, setFetchingById] = useState(false);
  const [fetchByIdError, setFetchByIdError] = useState<string | null>(null);

  const fetchLocations = () => {
    api
      .getBuybackLocations()
      .then(({ data }) => setLocations(data))
      .catch(() => setError("Failed to load buyback locations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (structureQuery.trim().length < 2) {
      setStructureResults([]);
      return;
    }

    setSearchingStructures(true);
    const timeout = setTimeout(() => {
      api
        .searchStructures(structureQuery.trim())
        .then(({ data }) => setStructureResults(data))
        .catch(() => setStructureResults([]))
        .finally(() => setSearchingStructures(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [structureQuery]);

  const handleEdit = (location: BuybackLocation) => {
    setEditTarget(location);
    setForm({
      name: location.name,
      isHub: location.isHub,
      distance: location.distance,
      pickupRatePerM3:
        location.pickupRatePerM3 != null
          ? String(location.pickupRatePerM3)
          : "",
      stockLocationId: location.stockLocationId,
      stockLocationName: location.stockLocationName,
      stockLocationSystemName: location.stockLocationSystemName,
    });
    setStructureQuery("");
    setStructureResults([]);
    setFetchIdInput("");
    setFetchByIdError(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setStructureQuery("");
    setStructureResults([]);
    setFetchIdInput("");
    setFetchByIdError(null);
    setError(null);
  };

  const handleSelectStructure = (result: StructureSearchResult) => {
    setForm({
      ...form,
      stockLocationId: result.id,
      stockLocationName: result.name,
      stockLocationSystemName: result.systemName,
    });
    setStructureQuery("");
    setStructureResults([]);
    setFetchIdInput("");
    setFetchByIdError(null);
  };

  const handleFetchStructureById = async () => {
    const locationId = Number(fetchIdInput.trim());
    if (!Number.isFinite(locationId) || locationId <= 0) {
      setFetchByIdError("Enter a valid numeric ID");
      return;
    }

    setFetchingById(true);
    setFetchByIdError(null);
    try {
      const { ok, data, message } = await api.fetchStructureById(locationId);
      if (!ok || !data) {
        setFetchByIdError(message ?? "Structure/station not found");
        return;
      }
      handleSelectStructure(data);
    } catch {
      setFetchByIdError("Failed to fetch from ESI");
    } finally {
      setFetchingById(false);
    }
  };

  const handleClearStructure = () => {
    setForm({
      ...form,
      stockLocationId: null,
      stockLocationName: null,
      stockLocationSystemName: null,
    });
  };

  const handleDelete = async (location: BuybackLocation) => {
    if (!confirm(`Delete location "${location.name}"?`)) return;

    setSaving(true);
    try {
      await api.deleteBuybackLocation(location._id);
      fetchLocations();
    } catch {
      setError("Failed to delete buyback location");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      isHub: form.isHub,
      distance: Number(form.distance),
      pickupRatePerM3:
        form.pickupRatePerM3.trim() === ""
          ? null
          : Number(form.pickupRatePerM3),
      stockLocationId: form.stockLocationId,
      stockLocationName: form.stockLocationName,
      stockLocationSystemName: form.stockLocationSystemName,
    };

    try {
      if (editTarget?._id) {
        await api.updateBuybackLocation(editTarget._id, payload);
      } else {
        await api.createBuybackLocation(payload);
      }
      setForm(EMPTY_FORM);
      setEditTarget(null);
      fetchLocations();
    } catch {
      setError(
        editTarget
          ? "Failed to update buyback location"
          : "Failed to create buyback location",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            {editTarget ? `Editing: ${editTarget.name}` : "Add Location"}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jita IV - Moon 4"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Distance</label>
              <input
                type="number"
                step="0.01"
                value={form.distance}
                onChange={(e) =>
                  setForm({ ...form, distance: Number(e.target.value) })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Pickup Rate (ISK/m³)</label>
              <input
                type="number"
                step="0.01"
                value={form.pickupRatePerM3}
                onChange={(e) =>
                  setForm({ ...form, pickupRatePerM3: e.target.value })
                }
                placeholder="Leave blank for no pickup service"
              />
            </div>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={form.isHub}
                  onChange={(e) => {
                    const isHub = e.target.checked;
                    setForm({
                      ...form,
                      isHub,
                      // A stock location only makes sense on a hub - clear
                      // it rather than let a save fail against the backend
                      // validation.
                      ...(isHub
                        ? {}
                        : {
                            stockLocationId: null,
                            stockLocationName: null,
                            stockLocationSystemName: null,
                          }),
                    });
                  }}
                />
                Trade hub
              </label>
            </div>
          </div>

          <p className={styles.hint}>
            Pickup Rate is charged per m³ of fee-eligible volume to collect a
            contract from this location and bring it back to the hub. Only
            set it for satellite locations with a pickup service - leave it
            blank for hubs or locations you don&apos;t offer pickup from.
          </p>

          <div className={styles.inputGroup}>
            <label>Stock Location (Division 6 hangar)</label>
            {!form.isHub ? (
              <span className={styles.hint}>
                Only hub locations can be a stock location - check
                &quot;Trade hub&quot; above first.
              </span>
            ) : form.stockLocationId != null ? (
              <div className={styles.structureSelected}>
                <span>
                  {form.stockLocationName ?? "Unnamed"}
                  {form.stockLocationSystemName
                    ? ` (${form.stockLocationSystemName})`
                    : ""}{" "}
                  <span className={styles.muted}>
                    ID: {form.stockLocationId}
                  </span>
                </span>
                <Button callback={handleClearStructure} color="red">
                  Clear
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={structureQuery}
                  onChange={(e) => setStructureQuery(e.target.value)}
                  placeholder="Search cached stations/structures by name…"
                />
                {searchingStructures && (
                  <span className={styles.muted}>Searching…</span>
                )}
                {structureResults.length > 0 && (
                  <div className={styles.structureResults}>
                    {structureResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className={styles.structureResult}
                        onClick={() => handleSelectStructure(result)}
                      >
                        {result.name ?? "Unnamed"}
                        {result.systemName ? ` (${result.systemName})` : ""}{" "}
                        <span className={styles.muted}>ID: {result.id}</span>
                      </button>
                    ))}
                  </div>
                )}
                <span className={styles.hint}>
                  Only needed for the location(s) holding sellable buyback
                  stock. Results come from stations/structures already seen
                  on a synced contract - if the right one isn&apos;t showing
                  up, it hasn&apos;t appeared on a contract yet. If a
                  structure was destroyed and rebuilt under the same name,
                  both the old (now-inaccessible) and new entries can show up
                  here with identical names - check the ID against what the
                  corp asset sync's diagnostic log reports if you&apos;re not
                  sure which is current.
                </span>

                <div className={styles.structureFetchById}>
                  <input
                    type="text"
                    value={fetchIdInput}
                    onChange={(e) => setFetchIdInput(e.target.value)}
                    placeholder="Or enter a known structure/station ID…"
                  />
                  <Button
                    callback={handleFetchStructureById}
                    color="orange"
                    disabled={fetchingById || !fetchIdInput.trim()}
                  >
                    {fetchingById ? "Fetching…" : "Fetch"}
                  </Button>
                </div>
                {fetchByIdError && (
                  <span className={styles.error}>{fetchByIdError}</span>
                )}
                <span className={styles.hint}>
                  Use this when the correct structure doesn&apos;t show up in
                  search above (e.g. a rebuilt structure whose new ID hasn't
                  appeared on any contract yet) - it queries ESI directly by
                  ID and caches the result, rather than relying on the
                  name-matched cache.
                </span>
              </>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formButtons}>
            <Button
              callback={handleSubmit}
              color="green"
              disabled={saving || !form.name}
            >
              {saving
                ? "Saving…"
                : editTarget
                  ? "Save Changes"
                  : "Add Location"}
            </Button>
            {editTarget && (
              <Button callback={handleCancelEdit} color="orange">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel>
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Locations</h2>
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : locations.length === 0 ? (
            <p className={styles.muted}>No locations configured.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Hub</th>
                  <th>Distance</th>
                  <th>Pickup Rate (ISK/m³)</th>
                  <th>Stock Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location._id}>
                    <td>{location.name}</td>
                    <td>{location.isHub ? "Yes" : "No"}</td>
                    <td>{location.distance}</td>
                    <td>{location.pickupRatePerM3 ?? "—"}</td>
                    <td>
                      {location.stockLocationId != null ? (
                        <>
                          {location.stockLocationName ?? "Unnamed"}{" "}
                          <span className={styles.muted}>
                            (ID: {location.stockLocationId})
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={styles.actions}>
                      <Button
                        callback={() => handleEdit(location)}
                        color="orange"
                      >
                        Edit
                      </Button>
                      <Button
                        callback={() => handleDelete(location)}
                        color="red"
                        disabled={saving}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}

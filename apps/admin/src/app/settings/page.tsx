"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import { api, EsiCharacter } from "@/lib/api";
import { startEveSso } from "@/lib/eveSso";
import styles from "./Settings.module.css";

export default function Settings() {
  const [maxCollateral, setMaxCollateral] = useState<number>(0);
  const [isotopePrice, setIsotopePrice] = useState<number>(0);
  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(0);
  const [marginFloorPercent, setMarginFloorPercent] = useState<number>(5);
  const [runnersEnabled, setRunnersEnabled] = useState<boolean>(true);
  const [cartelEnabled, setCartelEnabled] = useState<boolean>(true);
  const [businessCharacterId, setBusinessCharacterId] = useState<string | null>(null);
  const [structureCharacterId, setStructureCharacterId] = useState<string | null>(null);
  const [allowedCorpIds, setAllowedCorpIds] = useState<string[]>([]);
  const [newCorpId, setNewCorpId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [characters, setCharacters] = useState<EsiCharacter[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [removingCharacterId, setRemovingCharacterId] = useState<string | null>(null);

  const fetchCharacters = () => {
    setLoadingCharacters(true);
    api
      .getEsiCharacters()
      .then(({ data }) => setCharacters(data))
      .catch(() => {})
      .finally(() => setLoadingCharacters(false));
  };

  useEffect(() => {
    api
      .getConfig()
      .then(({ data }) => {
        setMaxCollateral(data.maxCollateral);
        // existing Config docs predate these fields, so they may come back
        // undefined until an admin saves a value here for the first time
        setIsotopePrice(data.isotopePrice ?? 650);
        setSalesTaxPercent((data.salesTaxRate ?? 0.042) * 100);
        setMarginFloorPercent(data.marginFloorPercent ?? 5);
        setRunnersEnabled(data.runnersEnabled ?? true);
        setCartelEnabled(data.cartelEnabled ?? true);
        setBusinessCharacterId(data.businessCharacterId ?? null);
        setStructureCharacterId(data.structureCharacterId ?? null);
        setAllowedCorpIds(data.allowedCorpIds ?? []);
      })
      .catch(() => setError("Failed to load config"))
      .finally(() => setLoading(false));

    fetchCharacters();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      await api.updateConfig({
        maxCollateral,
        isotopePrice,
        salesTaxRate: salesTaxPercent / 100,
        marginFloorPercent,
        runnersEnabled,
        cartelEnabled,
        businessCharacterId,
        structureCharacterId,
        allowedCorpIds,
      });
      setSaved(true);
    } catch {
      setError("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCorpId = () => {
    const id = newCorpId.trim();
    if (!id || !/^\d+$/.test(id) || allowedCorpIds.includes(id)) return;
    setAllowedCorpIds([...allowedCorpIds, id]);
    setNewCorpId("");
    setSaved(false);
  };

  const handleRemoveCorpId = (id: string) => {
    setAllowedCorpIds(allowedCorpIds.filter((existing) => existing !== id));
    setSaved(false);
  };

  const handleRemoveCharacter = async (character: EsiCharacter) => {
    if (
      !confirm(
        `Disconnect "${character.characterName ?? character.characterId}"? Any role currently assigned to it will fall back to whichever character is connected.`,
      )
    )
      return;

    setRemovingCharacterId(character.characterId);
    try {
      await api.deleteEsiCharacter(character.characterId);
      fetchCharacters();
      // A removed character can no longer be a valid role assignment - stay
      // in sync with the backend's own cleanup rather than waiting for a
      // page reload to notice.
      if (businessCharacterId === character.characterId) setBusinessCharacterId(null);
      if (structureCharacterId === character.characterId) setStructureCharacterId(null);
    } catch {
      setError("Failed to remove character");
    } finally {
      setRemovingCharacterId(null);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Config</h2>

          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : (
            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Max Collateral (ISK)</label>
                <input
                  type="number"
                  value={maxCollateral}
                  onChange={(e) => {
                    setMaxCollateral(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  {maxCollateral.toLocaleString()} ISK
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Isotope Price (ISK)</label>
                <input
                  type="number"
                  value={isotopePrice}
                  onChange={(e) => {
                    setIsotopePrice(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  {isotopePrice.toLocaleString()} ISK per isotope
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={salesTaxPercent}
                  onChange={(e) => {
                    setSalesTaxPercent(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  Used only for the buyback margin safety net, not a direct
                  deduction
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Margin Floor (percentage points)</label>
                <input
                  type="number"
                  step="0.1"
                  value={marginFloorPercent}
                  onChange={(e) => {
                    setMarginFloorPercent(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  Minimum headroom a buyback rate must leave below the
                  post-tax ceiling. Any rate that doesn&apos;t clear this is
                  automatically reduced to the ceiling minus this value.
                </span>
              </div>

              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={runnersEnabled}
                    onChange={(e) => {
                      setRunnersEnabled(e.target.checked);
                      setSaved(false);
                    }}
                  />
                  Runners in service
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={cartelEnabled}
                    onChange={(e) => {
                      setCartelEnabled(e.target.checked);
                      setSaved(false);
                    }}
                  />
                  Cartel in service
                </label>
                <span className={styles.hint}>
                  Unchecking a service hides it behind a &quot;Not Currently
                  In Service&quot; overlay on the home page and blocks direct
                  navigation to its pages.
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Business Character</label>
                <select
                  value={businessCharacterId ?? ""}
                  onChange={(e) => {
                    setBusinessCharacterId(e.target.value || null);
                    setSaved(false);
                  }}
                >
                  <option value="">Auto (currently connected)</option>
                  {characters.map((character) => (
                    <option key={character.characterId} value={character.characterId}>
                      {character.characterName ?? character.characterId} ({character.corporationName})
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>
                  Character used for contract sync, corp asset sync, and
                  buyback/purchase-order contract matching.
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Structure Discovery Character</label>
                <select
                  value={structureCharacterId ?? ""}
                  onChange={(e) => {
                    setStructureCharacterId(e.target.value || null);
                    setSaved(false);
                  }}
                >
                  <option value="">Auto (currently connected)</option>
                  {characters.map((character) => (
                    <option key={character.characterId} value={character.characterId}>
                      {character.characterName ?? character.characterId} ({character.corporationName})
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>
                  Character used for Structure Discovery&apos;s Keepstar/Jump
                  Bridge search and the Jump Planner&apos;s structure
                  lookups. ESI only lets a character resolve structures it
                  has personally docked at, regardless of corp roles - if a
                  structure won&apos;t resolve, try assigning a character
                  here that has actually been there.
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Allowed Corporations (Tools app)</label>
                <div className={styles.discoverRow}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newCorpId}
                    onChange={(e) => setNewCorpId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCorpId();
                      }
                    }}
                    placeholder="Corporation ID"
                  />
                  <Button callback={handleAddCorpId} color="blue">
                    Add
                  </Button>
                </div>
                {allowedCorpIds.length > 0 && (
                  <ul className={styles.corpIdList}>
                    {allowedCorpIds.map((id) => (
                      <li key={id}>
                        {id}
                        <IconButton
                          icon="delete"
                          ariaLabel={`Remove corporation ${id}`}
                          callback={() => handleRemoveCorpId(id)}
                          color="red"
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <span className={styles.hint}>
                  Corporation IDs allowed to log into the read-only Tools app
                  (tools.equinoxgalactic.com) via EVE SSO. Checked at login
                  and again on every session refresh.
                </span>
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {saved && <p className={styles.success}>Saved.</p>}

              <Button callback={handleSave} color="green" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Connected Characters</h2>

          {loadingCharacters ? (
            <p className={styles.muted}>Loading…</p>
          ) : characters.length === 0 ? (
            <p className={styles.muted}>
              No characters connected yet - add one below.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Character</th>
                  <th>Corporation</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => (
                  <tr key={character.characterId}>
                    <td data-label="Character">
                      {character.characterName ?? `Unknown (${character.characterId})`}
                    </td>
                    <td data-label="Corporation">{character.corporationName}</td>
                    <td data-label="Status">
                      {character.needsReconnect ? (
                        <span className={styles.error}>⚠ Needs reconnect</span>
                      ) : (
                        "Connected"
                      )}
                    </td>
                    <td className={styles.actions}>
                      <IconButton
                        icon="delete"
                        ariaLabel={`Disconnect ${character.characterName ?? character.characterId}`}
                        callback={() => handleRemoveCharacter(character)}
                        color="red"
                        disabled={removingCharacterId === character.characterId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Button callback={() => startEveSso()} color="orange">
            Add Character
          </Button>

          <span className={styles.hint}>
            Adding a character not already connected here adds it alongside
            the others - reconnecting a character already in the list just
            refreshes its token. A character needing docking access to a
            structure the current business/structure character can&apos;t
            see is the reason to add another one and assign it above.
          </span>
        </div>
      </Panel>
    </div>
  );
}

"use client";

import styles from "./page.module.css";
import Card from "../../../components/ui/Card/Card";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { contractPriceCalc } from "@shared/quote/calculations";
import PillCard from "../../../components/ui/PillCard/PillCard";
import {
  Route,
  getRoute,
  getRouteTerms,
  sanitizeLocation,
} from "@shared/quote/route-rules";
import {
  branchSystems,
  COALITION_STAGING_ORIGINS,
  copyTextToClipboard,
  extractQuoteInputsFromJanice,
  getDropdownOptions,
  INDUSTRY_PARKS,
} from "../../../utils";
import IconButton from "../../../components/ui/IconButton/IconButton";
import Button from "../../../components/ui/Button/Button";
import { handleGetAppraisal } from "@/app/api/janice";
import { JaniceAppraisal } from "@/types";
import { Switch } from "@mui/material";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { createTranslator, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "contract-calculator-locale";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const formatIsk = (n: number): string => {
  if (n >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(1)}b`;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
};

export default function Dashboard() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [pickup, setPickup] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [volume, setVolume] = useState<number>(0);
  const [collateral, setCollateral] = useState<number>(0);
  const [collateralFeePercent, setCollateralFeePercent] = useState<number>(0);
  const [rush, setRush] = useState(false);
  const [minimumFee, setMinimumFee] = useState<number>(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [iskm3, setIskm3] = useState<number>(0);
  const [manual, setManual] = useState<boolean>(false);
  const [appraisalInput, setAppraisalInput] = useState<string>("");
  const [appraisal, setAppraisal] = useState<JaniceAppraisal | null>(null);
  const [appraisalRef, setAppraisalRef] = useState<string>("");
  const [maxVolume, setMaxVolume] = useState<number>(375000);
  const [route, setRoute] = useState<Route | null>(null);
  const [locale, setLocale] = useState<Locale>("en");

  const MAX_COLLATERAL = 15_000_000_000;

  useEffect(() => {
    fetch(`${API_URL}/routes`)
      .then((res) => res.json())
      .then((json) => setRoutes(json.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;

    if (saved === "en" || saved === "ru" || saved === "zh") {
      setLocale(saved);
      return;
    }

    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith("ru")) {
      setLocale("ru");
      return;
    }

    if (browserLang.startsWith("zh")) {
      setLocale("zh");
      return;
    }

    setLocale("en");
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    if (route && destination) {
      setTotal(contractPriceCalc(route, volume, rush, undefined, collateral));
    }
  }, [destination, volume, rush, route, collateral]);

  useEffect(() => {
    if (route) {
      const terms = getRouteTerms(route);
      setIskm3(terms.rate);
      setMinimumFee(terms.minReward);
      setMaxVolume(terms.maxVolume);
      setCollateralFeePercent(terms.collateralFeePercent);
    }
  }, [route]);

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  const resetValues = (): void => {
    setMinimumFee(0);
    setTotal(0);
    setIskm3(0);
    setCollateralFeePercent(0);
    setRoute(null);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setVolume(raw === "" ? 0 : Math.ceil(Number(raw)));
  };

  const handleCollateralChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCollateral(Number(raw));
  };

  const handlePickupChange = (e: ChangeEvent<HTMLSelectElement>) => {
    resetValues();

    if (destination) {
      setDestination("");
    }

    setPickup(e.target.value);
  };

  const handleDropoffChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newDestination: string = e.target.value;

    const newRoute = getRoute(
      routes,
      sanitizeLocation(pickup),
      sanitizeLocation(newDestination),
    );

    setRoute(newRoute ?? null);

    if (newRoute) {
      const terms = getRouteTerms(newRoute);
      setIskm3(terms.rate);
      setMinimumFee(terms.minReward);
      setMaxVolume(terms.maxVolume);
      setCollateralFeePercent(terms.collateralFeePercent);
    }

    setDestination(newDestination);
  };

  const handleRushChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRush(e.target.checked);
  };


  const getRuleValue = (rule: string): number => {
    if (!pickup || !destination || !route) {
      return 0;
    }

    const terms = getRouteTerms(route);
    if (rule === "volume") return terms.rate;
    if (rule === "min") return terms.minReward;
    if (rule === "rush") return terms.rushPrice;

    return 0;
  };

  const handleCopyClick = (e: React.MouseEvent, text: string): void => {
    copyTextToClipboard(text);
    const target = e.currentTarget;
    const currentContent = target.innerHTML;

    e.currentTarget.innerHTML = "✓";

    setTimeout(() => {
      target.innerHTML = currentContent;
    }, 2000);
  };

  const getAppraisalPlaceholder = (): string => {
    return t("appraisalPlaceholder");
  };

  const handleAppraisalInputChange = (
    e: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    setAppraisalInput(e.target.value);
  };

  const handleManualChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setManual(e.target.checked);
  };

  const handleGetAppraisalClick = async (): Promise<void> => {
    setLoading(true);

    const janiceData = await handleGetAppraisal(appraisalInput);
    const data = extractQuoteInputsFromJanice(janiceData);

    const volumeM3 = data.volumeM3;
    const janiceCollateral = data.collateral;
    const janiceRef = data.appraisalRef;

    const roundedCollateral = parseFloat(
      (Math.ceil(janiceCollateral * 100) / 100).toFixed(2),
    );

    setVolume(volumeM3);
    setCollateral(roundedCollateral);
    setAppraisal(janiceData);
    setAppraisalRef(janiceRef);
    setLoading(false);
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.languageSelectWrapper}>
        <label htmlFor="language" className={styles.languageSelectLabel}>
          {t("language")}
        </label>
        <select
          id="language"
          name="languages"
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value as Locale)}
          className={styles.languageSelect}
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="zh">简体中文</option>
        </select>
      </div>
      <div className={styles.bannerWrapper}>
        <img src="/crest.png" alt="Equinox crest" className={styles.crest} />
        <span className={styles.wordmark}>
          Equinox
          <br />
          Runners
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.columnLeft}>
          <Card
            mainTitle={t("contractDetailsTitle")}
            subtitle={t("contractDetailsSubtitle")}
          >
            <div className={styles.cardContent}>
              <div className={styles.baseValues}>
                <div className={styles.baseValue}>
                  <span className={styles.baseValueName}>{t("ratePerM3")}</span>
                  <span className={styles.baseValueNumber}>{iskm3} ISK</span>
                </div>

                <div className={styles.baseValue}>
                  <span className={styles.baseValueName}>
                    {t("collateralPercent")}
                  </span>
                  <span className={styles.baseValueNumber}>
                    {collateralFeePercent}%
                  </span>
                </div>

                <div className={styles.baseValue}>
                  <span className={styles.baseValueName}>{t("minimum")}</span>
                  <span className={styles.baseValueNumber}>
                    {minimumFee.toLocaleString()} ISK
                  </span>
                </div>
              </div>

              <div className={styles.contractLocations}>
                <div className={styles.inputWrapper}>
                  <label htmlFor="pick-up">
                    {t("origin")}{" "}
                    <IconButton
                      alt={t("copyToClipboard")}
                      onClick={(e) => handleCopyClick(e, `${pickup}`)}
                    />
                  </label>

                  <select
                    id="pick-up"
                    name="locations"
                    value={pickup}
                    onChange={handlePickupChange}
                    className={pickup === "" ? styles.placeholder : ""}
                  >
                    <option value="" disabled>
                      {t("selectOrigin")}
                    </option>

                    <option value="Jita IV - Moon 4 - Caldari Navy Assembly Plant">
                      Jita IV - Moon 4 - Caldari Navy Assembly Plant
                    </option>

                    <optgroup label="WinterCo">
                      {COALITION_STAGING_ORIGINS.map((origin, idx) => {
                        return (
                          <option key={idx} value={origin.station}>
                            {origin.station}
                          </option>
                        );
                      })}
                    </optgroup>

                    <optgroup label="Industry">
                      {INDUSTRY_PARKS.map((origin, idx) => {
                        return (
                          <option key={idx} value={origin.station}>
                            {origin.station}
                          </option>
                        );
                      })}
                    </optgroup>

                    <optgroup label="Branch">
                      {branchSystems.sort().map((system, idx) => {
                        return (
                          <option key={idx} value={system}>
                            {system}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>

                <div className={styles.inputWrapper}>
                  <label htmlFor="drop-off">
                    {t("destination")}{" "}
                    <IconButton
                      alt={t("copyToClipboard")}
                      onClick={(e) => handleCopyClick(e, `${destination}`)}
                    />
                  </label>

                  <select
                    id="drop-off"
                    name="locations"
                    value={destination}
                    onChange={handleDropoffChange}
                    className={!destination ? styles.placeholder : ""}
                  >
                    <option value="" disabled>
                      {t("selectDestination")}
                    </option>
                    {getDropdownOptions(sanitizeLocation(pickup), routes)}
                  </select>
                </div>
              </div>

              <div
                className={`${styles.inputWrapper} ${styles.appraisalWrapper}`}
              >
                <textarea
                  name="appraisal"
                  id="appraisal"
                  placeholder={getAppraisalPlaceholder()}
                  disabled={manual}
                  onChange={handleAppraisalInputChange}
                />
              </div>

              <div className={styles.appraisalButtons}>
                <div className={styles.appraisalButtonWrapper}>
                  <Button
                    type={1}
                    onClick={handleGetAppraisalClick}
                    disabled={loading}
                  >
                    {loading ? t("loading") : t("getAppraisal")}
                  </Button>
                </div>

                {appraisal && appraisalRef && !loading && (
                  <span className={styles.appraisalLink}>
                    <a
                      href={`https://janice.e-351.com/a/${appraisalRef}`}
                      target="blank"
                      rel="noopener noreferrer"
                    >
                      <OpenInNewOutlinedIcon /> {t("viewAppraisalOnJanice")}
                    </a>
                  </span>
                )}
              </div>

              <div className={styles.manualEntryOption}>
                <span>{t("orEnterManually")}</span>
                <Switch
                  checked={manual}
                  onChange={handleManualChange}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "var(--primary)",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "var(--primary)",
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: "var(--text)",
                    },
                  }}
                />
              </div>

              {volume > maxVolume && (
                <PillCard type="warning">
                  <div className={styles.warningContent}>
                    <span>
                      <b>{t("volumeOverMaxTitle")}</b>
                    </span>
                    <span>{t("volumeOverMaxBody")}</span>
                  </div>
                </PillCard>
              )}

              {collateral > MAX_COLLATERAL && (
                <PillCard type="warning">
                  <div className={styles.warningContent}>
                    <span>
                      <b>{t("collateralOverMaxTitle")}</b>
                    </span>
                    <span>{t("collateralOverMaxBody")}</span>
                  </div>
                </PillCard>
              )}

              <div className={styles.contractValues}>
                <div className={styles.inputWrapper}>
                  <label htmlFor="volume">
                    {t("volume")} -{" "}
                    {t("volumeMax", { max: maxVolume.toLocaleString() })}
                  </label>
                  <input
                    id="volume"
                    type="number"
                    inputMode="numeric"
                    value={volume > 0 ? volume : ""}
                    placeholder={t("volumePlaceholder")}
                    onChange={handleVolumeChange}
                    disabled={!manual}
                    className={volume > maxVolume ? styles.invalidInput : ""}
                  />
                </div>

                <div className={styles.inputWrapper}>
                  <label htmlFor="collateral">
                    {t("collateralIsh")} - {t("collateralMax")}
                  </label>
                  <input
                    id="collateral"
                    type="number"
                    step={0.1}
                    inputMode="decimal"
                    value={collateral > 0 ? collateral : ""}
                    placeholder={`e.g ${MAX_COLLATERAL.toLocaleString()}`}
                    onChange={handleCollateralChange}
                    disabled={!manual}
                    className={
                      collateral > MAX_COLLATERAL ? styles.invalidInput : ""
                    }
                  />
                </div>
              </div>

              <span className={styles.note}>
                {t("note")}
                <ul>
                  <li>{t("noteNpcStations")}</li>
                  <li>{t("noteStructures")}</li>
                </ul>
              </span>

              <PillCard>
                <div className={styles.pillLabelWithSub}>
                  <span className={styles.pillLabel}>
                    {t("rush", {
                      amount: getRuleValue("rush").toLocaleString(),
                    })}
                  </span>
                  <span className={styles.pillSubLabel}>
                    {t("rushDescriptionShort")}
                  </span>
                </div>

                <Switch
                  checked={rush}
                  onChange={handleRushChange}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "var(--primary)",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "var(--primary)",
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: "var(--text)",
                    },
                  }}
                />
              </PillCard>
            </div>
          </Card>
        </div>

        <div className={styles.columnRight}>
          <Card mainTitle={t("contractSettings")}>
            <div className={styles.settingsList}>
              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>
                  {t("availability")}
                </span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>
                    {t("issuer")}
                  </span>
                  <IconButton
                    alt={t("copyToClipboard")}
                    onClick={(e) => handleCopyClick(e, "Equinox Galactic")}
                  />
                </div>
              </div>

              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>
                  {t("reward")}
                </span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>
                    {route ? `${total.toLocaleString()} ISK` : "—"}
                  </span>
                  {route && (
                    <IconButton
                      alt={t("copyToClipboard")}
                      onClick={(e) => handleCopyClick(e, `${total}`)}
                    />
                  )}
                </div>
              </div>

              {rush && (
                <div className={styles.contractSetting}>
                  <span className={styles.contractSettingLabel}>
                    {t("description")}
                  </span>
                  <div className={styles.contractSettingValueGroup}>
                    <span className={styles.contractSettingValue}>
                      {t("rushLabel")}
                    </span>
                    <IconButton
                      alt={t("copyToClipboard")}
                      onClick={(e) => handleCopyClick(e, t("rushLabel"))}
                    />
                  </div>
                </div>
              )}

              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>
                  {t("collateralLabel")}
                </span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>
                    {route ? `${(collateral || 0).toLocaleString()} ISK` : "—"}
                  </span>
                  {route && (
                    <IconButton
                      alt={t("copyToClipboard")}
                      onClick={(e) => handleCopyClick(e, `${collateral}`)}
                    />
                  )}
                </div>
              </div>

              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>
                  {t("expiration")}
                </span>
                <span className={styles.contractSettingValue}>
                  {t("expirationValue")}
                </span>
              </div>

              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>
                  {t("daysToComplete")}
                </span>
                <span className={styles.contractSettingValue}>
                  {t("daysToCompleteValue")}
                </span>
              </div>
            </div>

            <ul className={styles.contractRules}>
              <li>No fitted ships</li>
              <li>No containers</li>
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <div className={styles.routes}>
          <div className={styles.routesBanner}>
            <span className={styles.routesHeader}>{t("allRoutesTitle")}</span>
          </div>
          <div className={styles.tableScroll}>
            <table>
              <tbody>
                <tr className={styles.tableHead}>
                  <th>{t("route")}</th>
                  <th>{t("ratePerM3Table")}</th>
                  <th>{t("minimumReward")}</th>
                  <th>{t("rushPrice")}</th>
                  <th>{t("collateralFee")}</th>
                  <th>{t("maxVolume")}</th>
                </tr>
                {routes.map((r, idx) => {
                  const terms = getRouteTerms(r);
                  return (
                    <tr key={idx} className={idx % 2 === 1 ? styles.tableRowAlt : ""}>
                      <td>{`${r.systems[0]} ${r.oneWay ? "→" : "↔"} ${r.systems[1]}`}</td>
                      <td>{terms.rate > 0 ? `${terms.rate.toLocaleString()} ISK/m³` : "—"}</td>
                      <td>{formatIsk(terms.minReward)}</td>
                      <td>{formatIsk(terms.rushPrice)}</td>
                      <td>{terms.collateralFeePercent > 0 ? `${terms.collateralFeePercent}%` : "—"}</td>
                      <td>{formatIsk(terms.maxVolume)} m³</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

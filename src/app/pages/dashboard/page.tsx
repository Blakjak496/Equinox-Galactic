"use client";

import styles from "./page.module.css";
import Card from "../../../components/ui/Card/Card";
import SubCard from "@/components/ui/SubCard/SubCard";
import { ChangeEvent, useEffect, useState } from "react";
import { contractPriceCalc } from "@/pricing/calculations";
import PillCard from "@/components/ui/PillCard/PillCard";
import { ROUTE_RULES } from "@/pricing/route-rules";
import { copyTextToClipboard, numberWithCommas } from "@/utils";
import IconButton from "@/components/ui/IconButton/IconButton";

export default function Dashboard() {
  const [pickup, setPickup] = useState("BKG-Q2");
  const [dropoff, setDropoff] = useState("4-HWWF");
  const [volume, setVolume] = useState(0);
  const [collateral, setCollateral] = useState(0);
  const [rush, setRush] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let incompatible = false;
    const route = `${pickup}|${dropoff}`;

    switch (route) {
      case "Branch|Branch":
        incompatible = true;
        break;
      case "Branch|4-HWWF":
        incompatible = true;
        break;
      case "4-HWWF|Branch":
        incompatible = true;
        break;
      default:
        break;
    }
    if (!incompatible)
      setTotal(contractPriceCalc(`${pickup}|${dropoff}`, volume, rush));
  }, [pickup, dropoff, volume, rush]);

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value || "0"));
  };

  const handleCollateralChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCollateral(parseInt(e.target.value));
  };

  const handlePickupChange = (e: ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value);
    setPickup(e.target.value);
    if (e.target.value === dropoff) {
      switch (true) {
        case e.target.value === "BKG-Q2":
          setDropoff("4-HWWF");
          break;
        case e.target.value === "4-HWWF":
          setDropoff("BKG-Q2");
          break;
        case e.target.value === "Branch":
          setDropoff("BKG-Q2");
          break;
        default:
          break;
      }
    } else {
      if (e.target.value === "Branch" && dropoff === "4-HWWF")
        setDropoff("BKG-Q2");
    }
  };

  const handleDropoffChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDropoff(e.target.value);
    if (e.target.value === pickup) {
      switch (true) {
        case e.target.value === "BKG-Q2":
          setDropoff("4-HWWF");
          break;
        case e.target.value === "4-HWWF":
          setDropoff("BKG-Q2");
          break;
        case e.target.value === "Branch":
          setDropoff("BKG-Q2");
          break;
        default:
          break;
      }
    }
  };

  const handleRushChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRush(e.target.checked);
  };

  const getRuleValue = (rule: string): number => {
    const rules = ROUTE_RULES[`${pickup}|${dropoff}`];
    let ruleValue: number = 0;
    if (rules) {
      if (rule === "volume") ruleValue = rules.ratePerM3;
      if (rule === "min") ruleValue = rules.minPrice;
      if (rule === "flat") ruleValue = rules.flatRate;
      if (rule === "rush") ruleValue = rules.rushRate;
    }

    return ruleValue;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.grid}>
        <div className={styles.columnLeft}>
          <Card>
            <div className={styles.cardContent}>
              <div className={styles.banner}>
                <img
                  src="/banner-logo.png"
                  alt="Equinox Galaxtic Banner Logo"
                  className={styles.bannerLogo}
                />
              </div>
              <span className={styles.heading}>
                Courier Contract Calculator
              </span>
              <span className={styles.subheading}>
                Coalition Space Hauling For Therapy. Members
              </span>
            </div>
          </Card>
          <Card
            mainTitle="Contract Details"
            subtitle="Enter contract details to calculate a quote"
          >
            <div className={styles.cardContent}>
              <div className={styles.contractValues}>
                <div className={styles.inputWrapper}>
                  <label htmlFor="volume">Volume (m³) - max: 340,000</label>
                  <input
                    id="volume"
                    type="number"
                    max={340000}
                    placeholder={`e.g ${numberWithCommas(340000)}`}
                    onChange={handleVolumeChange}
                  />
                </div>
                <div className={styles.inputWrapper}>
                  <label htmlFor="collateral">
                    Collateral (isk) - max: 10,000,000,000
                  </label>
                  <input
                    id="collateral"
                    type="number"
                    max={10000000000}
                    placeholder={`e.g ${numberWithCommas(2000000000)}`}
                    onChange={handleCollateralChange}
                  />
                </div>
              </div>
              <div className={styles.contractLocations}>
                <div className={styles.inputWrapper}>
                  <label htmlFor="pick-up">Pick-up</label>
                  <select
                    id="pick-up"
                    name="locations"
                    defaultValue={pickup}
                    onChange={handlePickupChange}
                  >
                    <optgroup label="Alliance Staging">
                      <option value="BKG-Q2">BKG-Q2</option>
                    </optgroup>
                    <optgroup label="Coalition Staging">
                      <option value="4-HWWF">4-HWWF</option>
                    </optgroup>
                    <optgroup label="Branch">
                      <option value="Branch">Non-BKG Branch System</option>
                    </optgroup>
                  </select>
                </div>
                <div className={styles.inputWrapper}>
                  <label htmlFor="drop-off">Drop-off</label>
                  <select
                    id="drop-off"
                    name="locations"
                    defaultValue={dropoff}
                    onChange={handleDropoffChange}
                  >
                    {pickup !== "BKG-Q2" && (
                      <optgroup label="Alliance Staging">
                        <option value="BKG-Q2">BKG-Q2</option>
                      </optgroup>
                    )}
                    {pickup === "BKG-Q2" && (
                      <optgroup label="Coalition Staging">
                        <option value="4-HWWF">4-HWWF</option>
                      </optgroup>
                    )}
                    {pickup === "BKG-Q2" && (
                      <optgroup label="Branch">
                        <option value="Branch">Non-BKG Branch System</option>
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
              <PillCard>
                <div className={styles.pillLabelWithSub}>
                  <span className={styles.pillLabel}>
                    Rush (+
                    {`${numberWithCommas(getRuleValue("rush"))} ISK`})
                  </span>
                  <span className={styles.pillSubLabel}>
                    Priority contract. Aims to deliver within 24h where possible
                  </span>
                </div>
                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    onChange={handleRushChange}
                  />
                  <span className={styles.checkmark}></span>
                </label>
              </PillCard>
            </div>
          </Card>
        </div>
        <div className={styles.columnRight}>
          <Card mainTitle="Quote" subtitle="Total and breakdown">
            <div className={styles.cardContent}>
              <PillCard>
                <span className={styles.pillLabel}>Volume</span>
                <span className={styles.pillValue}>
                  {numberWithCommas(getRuleValue("volume") * volume)} ISK (
                  {getRuleValue("volume")}/m³)
                </span>
              </PillCard>
              <PillCard>
                <span className={styles.pillLabel}>Rush fee</span>
                <span className={styles.pillValue}>
                  {numberWithCommas(rush ? getRuleValue("rush") : 0)} ISK
                </span>
              </PillCard>
              <PillCard>
                <span className={styles.pillLabel}>
                  Minimum ({`${pickup} <-> ${dropoff}`})
                </span>
                <span className={styles.pillValue}>
                  {numberWithCommas(getRuleValue("min"))} ISK
                </span>
              </PillCard>
              {(pickup === "Branch" || dropoff === "Branch") && (
                <PillCard>
                  <span className={styles.pillLabel}>
                    Flat Fee ({`${pickup} <-> ${dropoff}`})
                  </span>
                  <span className={styles.pillValue}>
                    {numberWithCommas(getRuleValue("flat"))} ISK
                  </span>
                </PillCard>
              )}
              <SubCard mainTitle="Total reward">
                <span className={styles.totalPrice}>
                  {numberWithCommas(total)} ISK
                </span>
              </SubCard>
            </div>
          </Card>
          <Card mainTitle="Contract Settings">
            <div className={styles.cardContent}>
              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>Issue to:</span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>
                    Equinox Galactic
                  </span>
                  <IconButton
                    src="/copy-icon-secondary.png"
                    alt="Copy to clipboard"
                    onClick={() => copyTextToClipboard("Equinox Galactic")}
                  />
                </div>
              </div>
              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>Reward:</span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>
                    {numberWithCommas(total)} ISK
                  </span>
                  <IconButton
                    src="/copy-icon-secondary.png"
                    alt="Copy to clipboard"
                    onClick={() => copyTextToClipboard(`${total}`)}
                  />
                </div>
              </div>
              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>Collateral:</span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>
                    {numberWithCommas(collateral)} ISK
                  </span>
                  <IconButton
                    src="/copy-icon-secondary.png"
                    alt="Copy to clipboard"
                    onClick={() => copyTextToClipboard(`${collateral}`)}
                  />
                </div>
              </div>
              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>Expiration:</span>
                <span className={styles.contractSettingValue}>7 days</span>
              </div>
              <div className={styles.contractSetting}>
                <span className={styles.contractSettingLabel}>
                  Days to complete:
                </span>
                <span className={styles.contractSettingValue}>7</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

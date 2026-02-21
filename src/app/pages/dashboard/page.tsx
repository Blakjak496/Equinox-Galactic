"use client";

import styles from "./page.module.css";
import Card from "../../../components/ui/Card/Card";
import SubCard from "@/components/ui/SubCard/SubCard";
import { ChangeEvent, useState } from "react";
import { contractPriceCalc } from "@/pricing/calculations";
import PillCard from "@/components/ui/PillCard/PillCard";
import { ROUTE_RULES } from "@/pricing/route-rules";
import {
  branchSystems,
  checkRouteCompatibility,
  copyTextToClipboard,
  numberWithCommas,
} from "@/utils";
import IconButton from "@/components/ui/IconButton/IconButton";
import Button from "@/components/ui/Button/Button";
import { saveQuoteRecord } from "@/app/api/quotes";

export default function Dashboard() {
  const [pickup, setPickup] = useState("BKG-Q2");
  const [dropoff, setDropoff] = useState("4-HWWF");
  const [volume, setVolume] = useState<number>(0);
  const [collateral, setCollateral] = useState<number>(0);
  const [rush, setRush] = useState(false);
  const [volumeFee, setVolumeFee] = useState<number>(0);
  const [rushFee, setRushFee] = useState<number>();
  const [minimumFee, setMinimumFee] = useState<number>(0);
  const [flatFee, setFlatFee] = useState<number>(0);
  const [total, setTotal] = useState(0);
  const [quoteId, setQuoteId] = useState("");

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") setVolume(0);
    else {
      const inputVolume = parseInt(e.target.value);

      setVolume(
        parseInt(
          inputVolume
            ? inputVolume > 340000
              ? `${340000}`
              : inputVolume.toString()
            : "0",
        ),
      );
    }
  };

  const handleCollateralChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") setCollateral(0);
    else {
      const inputValue = parseInt(e.target.value);

      setCollateral(
        parseInt(
          inputValue
            ? inputValue > 10000000000
              ? `${10000000000}`
              : inputValue.toString()
            : "0",
        ),
      );
    }
  };

  const handlePickupChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPickup(e.target.value);
    switch (true) {
      case e.target.value === "BKG-Q2":
        setDropoff("4-HWWF");
        break;
      case e.target.value === "4-HWWF":
        setDropoff("BKG-Q2");
        break;
      default:
        setDropoff("BKG-Q2");
        break;
    }
  };

  const handleDropoffChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDropoff(e.target.value);
  };

  const handleRushChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRush(e.target.checked);
  };

  const getRuleValue = (rule: string): number => {
    const route = `BKG-Q2|${pickup !== "BKG-Q2" ? pickup : dropoff}`;
    const rules = ROUTE_RULES[route];
    let ruleValue: number = 0;
    if (rules) {
      if (rule === "volume") ruleValue = rules.ratePerM3;
      if (rule === "min") ruleValue = rules.minPrice;
      if (rule === "flat") ruleValue = rules.flatRate;
      if (rule === "rush") ruleValue = rules.rushRate;
    }

    return ruleValue;
  };

  const calculate = async (): Promise<void> => {
    const compatible = checkRouteCompatibility(pickup, dropoff);
    const route = `BKG-Q2|${pickup !== "BKG-Q2" ? pickup : dropoff}`;

    if (compatible) {
      const newVolumeFee = ROUTE_RULES[route].ratePerM3 * volume;
      const newRushFee = rush ? ROUTE_RULES[route].rushRate : 0;
      const newMinimumFee = ROUTE_RULES[route].minPrice;
      const newFlatFee = ROUTE_RULES[route].flatRate;
      const totalReward = contractPriceCalc(route, volume, rush);

      setVolumeFee(newVolumeFee);
      setRushFee(newRushFee);
      setMinimumFee(newMinimumFee);
      setFlatFee(newFlatFee);
      setTotal(totalReward);

      const payload = {
        routeKey: route,
        volumeM3: volume,
        collateral: collateral,
        isRush: rush,
        rushRate: newRushFee,
        flatRate: newFlatFee,
        reward: totalReward,
      };

      setQuoteId(await saveQuoteRecord(payload));
    }
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
                    value={volume > 0 ? volume : ""}
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
                    value={collateral > 0 ? collateral : ""}
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
                        {branchSystems.sort().map((system, idx) => {
                          return (
                            <option key={idx} value={system}>
                              {system}
                            </option>
                          );
                        })}
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
                <div className={styles.checkWrapper}>
                  <label className={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      onChange={handleRushChange}
                    />
                    <span className={styles.checkmark}></span>
                  </label>
                </div>
              </PillCard>
              <Button type={1} text="Calculate" onClick={calculate} />
            </div>
          </Card>
        </div>
        <div className={styles.columnRight}>
          <Card mainTitle="Quote" subtitle="Total and breakdown">
            <div className={styles.cardContent}>
              <PillCard>
                <span className={styles.pillLabel}>Volume</span>
                <span className={styles.pillValue}>
                  {getRuleValue("flat") === 0
                    ? `${numberWithCommas(volumeFee || 0)} ISK`
                    : "N/A"}
                </span>
              </PillCard>
              <PillCard>
                <span className={styles.pillLabel}>Rush fee</span>
                <span className={styles.pillValue}>
                  {numberWithCommas(rushFee || 0)} ISK
                </span>
              </PillCard>
              <PillCard>
                <span className={styles.pillLabel}>Minimum</span>
                <span className={styles.pillValue}>
                  {getRuleValue("flat") === 0
                    ? `${numberWithCommas(minimumFee || 0)} ISK`
                    : "N/A"}
                </span>
              </PillCard>
              <PillCard>
                <span className={styles.pillLabel}>
                  Flat Fee ({`${pickup} <-> ${dropoff}`})
                </span>
                <span className={styles.pillValue}>
                  {branchSystems.includes(pickup) ||
                  branchSystems.includes(dropoff)
                    ? `${numberWithCommas(flatFee || 0)} ISK`
                    : "N/A"}
                </span>
              </PillCard>
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
                <span className={styles.contractSettingLabel}>
                  Description:
                </span>
                <div className={styles.contractSettingValueGroup}>
                  <span className={styles.contractSettingValue}>{quoteId}</span>
                  <IconButton
                    src="/copy-icon-secondary.png"
                    alt="Copy to clipboard"
                    onClick={() => copyTextToClipboard(`${quoteId}`)}
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
                    {numberWithCommas(collateral || 0)} ISK
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

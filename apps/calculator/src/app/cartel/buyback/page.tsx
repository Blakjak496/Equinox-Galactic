"use client";

import { ChangeEvent, useEffect, useState } from "react";
import styles from "./page.module.css";
import Card from "@shared/ui/Card/Card";
import Button from "@shared/ui/Button/Button";
import IconButton from "@shared/ui/IconButton/IconButton";
import { getBuybackQuote, getBuybackLocations } from "@/app/api/buybackQuote";
import { BuybackLocation, BuybackQuoteResponse } from "@/types";
import { useLocale } from "@/lib/LocaleContext";

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

function formatVolume(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³`;
}

function copyTextToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

export default function BuybackDashboard() {
  const [itemsText, setItemsText] = useState("");
  const [locations, setLocations] = useState<BuybackLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuybackQuoteResponse | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    getBuybackLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setItemsText(e.target.value);
  };

  const handleGetQuote = async () => {
    if (!itemsText.trim() || !locationId) return;

    setLoading(true);
    setError(null);

    try {
      const quote = await getBuybackQuote(itemsText, locationId);
      setResult(quote);
    } catch {
      setError(t("buybackErrorGeneric"));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.dashboard}>

      <div className={styles.stack}>
        <Card
          mainTitle={t("buybackPageTitle")}
          subtitle={t("buybackPageSubtitle")}
        >
          <div className={styles.cardContent}>
            <div className={styles.locationWrapper}>
              <label htmlFor="pickup-location" className={styles.locationLabel}>
                {t("pickupLocation")}
              </label>
              <select
                id="pickup-location"
                className={styles.locationSelect}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">{t("selectLocation")}</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className={styles.itemsInput}
              placeholder={t("appraisalPlaceholder")}
              value={itemsText}
              onChange={handleTextChange}
            />
            <Button
              type={1}
              onClick={handleGetQuote}
              disabled={loading || !itemsText.trim() || !locationId}
            >
              {loading ? t("loading") : t("getQuote")}
            </Button>
            {error && <span className={styles.error}>{error}</span>}
          </div>
        </Card>

        {result && result.capExceeded && (
          <Card mainTitle={t("capExceededTitle")}>
            <p className={styles.capExceededNote}>{t("capExceededNote")}</p>
            <span className={styles.capExceededValue}>
              {formatIsk(result.netTotalPrice)}
            </span>
          </Card>
        )}

        {result && !result.capExceeded && (
          <>
            {(() => {
              const acceptedItems = result.items.filter(
                (item) => item.accepted,
              );
              const acceptedCount = acceptedItems.length;
              const rejectedCount = result.items.length - acceptedCount;
              const acceptedVolume = acceptedItems.reduce(
                (sum, item) => sum + item.volume,
                0,
              );

              return (
                <Card mainTitle={t("summaryTitle")}>
                  {result.janiceUrl && (
                    <div className={styles.janiceLinkRow}>
                      <a
                        className={styles.janiceLink}
                        href={result.janiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("janiceAppraisalLink")}
                      </a>
                    </div>
                  )}
                  {rejectedCount > 0 && (
                    <p className={styles.notAcceptedWarning}>
                      {t("notAcceptedWarning", { count: rejectedCount })}
                    </p>
                  )}
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {t("itemsNotAccepted")}
                    </span>
                    <span className={styles.summaryValue}>
                      {rejectedCount}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {t("itemsAccepted")}
                    </span>
                    <span className={styles.summaryValue}>
                      {acceptedCount}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {t("volumeAccepted")}
                    </span>
                    <span className={styles.summaryValue}>
                      {formatVolume(acceptedVolume)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {t("totalJbvAccepted")}
                    </span>
                    <span className={styles.summaryValue}>
                      {formatIsk(result.totalJbv)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {t("totalOfferValueGross")}
                    </span>
                    <span className={styles.summaryValue}>
                      {formatIsk(result.totalOfferValue)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {t("pickupFee")}
                    </span>
                    <span className={styles.summaryValue}>
                      {formatIsk(result.pickupFee)}
                    </span>
                  </div>
                  <div className={styles.summaryRowFinal}>
                    <span className={styles.summaryLabel}>
                      {t("totalOfferFinal")}
                    </span>
                    <span className={styles.summaryValueFinal}>
                      {formatIsk(result.netTotalPrice)}
                    </span>
                  </div>
                </Card>
              );
            })()}

            <Card mainTitle={t("contractDetailsTitle")}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("description")}</span>
                <div className={styles.valueGroup}>
                  <span className={styles.summaryValue}>
                    {result.referenceId}
                  </span>
                  <IconButton
                    alt={t("copyToClipboard")}
                    onClick={() => copyTextToClipboard(result.referenceId)}
                  />
                </div>
              </div>
              <span className={styles.referenceIdNote}>
                {t("referenceIdRejectedNote")}
              </span>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  {t("availability")}
                </span>
                <div className={styles.valueGroup}>
                  <span className={styles.summaryValue}>
                    {t("privateAvailability")}
                  </span>
                  <IconButton
                    alt={t("copyToClipboard")}
                    onClick={() => copyTextToClipboard(t("issuer"))}
                  />
                </div>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  {t("iWillReceive")}
                </span>
                <div className={styles.valueGroup}>
                  <span className={styles.summaryValue}>
                    {formatIsk(result.netTotalPrice)}
                  </span>
                  <IconButton
                    alt={t("copyToClipboard")}
                    onClick={() =>
                      copyTextToClipboard(
                        String(Math.round(result.netTotalPrice)),
                      )
                    }
                  />
                </div>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  {t("expiration")}
                </span>
                <span className={styles.summaryValue}>
                  {t("buybackExpirationValue")}
                </span>
              </div>
            </Card>

            <Card mainTitle={t("itemizedTitle")}>
              <div className={styles.tableScroll}>
                <table>
                  <tbody>
                    <tr className={styles.tableHead}>
                      <th>{t("colItem")}</th>
                      <th>{t("colVolume")}</th>
                      <th>{t("colQuantity")}</th>
                      <th>{t("colJbvPerUnit")}</th>
                      <th>{t("colTotalJbv")}</th>
                      <th>{t("colPercentOffered")}</th>
                      <th>{t("colOfferValue")}</th>
                      <th>{t("colAccepted")}</th>
                    </tr>
                    {result.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 1 ? styles.tableRowAlt : ""} ${!item.accepted ? styles.rejectedRow : ""}`}
                      >
                        <td data-label={t("colItem")}>{item.name}</td>
                        <td data-label={t("colVolume")}>{formatVolume(item.volume)}</td>
                        <td data-label={t("colQuantity")}>{item.quantity.toLocaleString()}</td>
                        <td data-label={t("colJbvPerUnit")}>{formatIsk(item.jbvPerUnit)}</td>
                        <td data-label={t("colTotalJbv")}>{formatIsk(item.totalJbv)}</td>
                        <td data-label={t("colPercentOffered")}>{item.accepted ? `${item.percentOffered}%` : "—"}</td>
                        <td data-label={t("colOfferValue")}>{item.accepted ? formatIsk(item.offerValue) : "—"}</td>
                        <td data-label={t("colAccepted")}>
                          <span
                            className={
                              item.accepted
                                ? styles.statusIconAccepted
                                : styles.statusIconRejected
                            }
                            title={
                              item.accepted
                                ? t("statusAccepted")
                                : (item.rejectReason ?? t("statusNotAccepted"))
                            }
                          >
                            {item.accepted ? "✓" : "✗"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

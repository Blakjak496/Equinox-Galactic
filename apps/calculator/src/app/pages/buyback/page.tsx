"use client";

import { ChangeEvent, useState } from "react";
import styles from "./page.module.css";
import Card from "@shared/ui/Card/Card";
import Button from "@shared/ui/Button/Button";
import IconButton from "@shared/ui/IconButton/IconButton";
import { getBuybackQuote } from "../../api/buybackQuote";
import { BuybackQuoteResponse } from "@/types";
import { createTranslator } from "@/lib/i18n";

const t = createTranslator("en");

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

function copyTextToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

export default function BuybackDashboard() {
  const [itemsText, setItemsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuybackQuoteResponse | null>(null);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setItemsText(e.target.value);
  };

  const handleGetQuote = async () => {
    if (!itemsText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const quote = await getBuybackQuote(itemsText);
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
      <div className={styles.bannerWrapper}>
        <img src="/crest.png" alt="Equinox crest" className={styles.crest} />
        <span className={styles.wordmark}>
          Equinox
          <br />
          Cartel
        </span>
      </div>

      <div className={styles.stack}>
        <Card
          mainTitle={t("buybackPageTitle")}
          subtitle={t("buybackPageSubtitle")}
        >
          <div className={styles.cardContent}>
            <textarea
              className={styles.itemsInput}
              placeholder={t("appraisalPlaceholder")}
              value={itemsText}
              onChange={handleTextChange}
            />
            <Button
              type={1}
              onClick={handleGetQuote}
              disabled={loading || !itemsText.trim()}
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
              {formatIsk(result.totalOfferValue)}
            </span>
          </Card>
        )}

        {result && !result.capExceeded && (
          <>
            <Card mainTitle={t("itemizedTitle")}>
              <div className={styles.tableScroll}>
                <table>
                  <tbody>
                    <tr className={styles.tableHead}>
                      <th>{t("colItem")}</th>
                      <th>{t("colCategory")}</th>
                      <th>{t("colQuantity")}</th>
                      <th>{t("colJbvPerUnit")}</th>
                      <th>{t("colTotalJbv")}</th>
                      <th>{t("colPercentOffered")}</th>
                      <th>{t("colOfferValue")}</th>
                      <th>{t("colStatus")}</th>
                    </tr>
                    {result.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 1 ? styles.tableRowAlt : ""} ${!item.accepted ? styles.rejectedRow : ""}`}
                      >
                        <td>{item.name}</td>
                        <td>{item.categoryName}</td>
                        <td>{item.quantity.toLocaleString()}</td>
                        <td>{formatIsk(item.jbvPerUnit)}</td>
                        <td>{formatIsk(item.totalJbv)}</td>
                        <td>{item.accepted ? `${item.percentOffered}%` : "—"}</td>
                        <td>{item.accepted ? formatIsk(item.offerValue) : "—"}</td>
                        <td
                          className={
                            !item.accepted ? styles.rejectedStatus : undefined
                          }
                        >
                          {item.accepted
                            ? t("statusAccepted")
                            : (item.rejectReason ?? t("statusNotAccepted"))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card mainTitle={t("summaryTitle")}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("totalJbv")}</span>
                <span className={styles.summaryValue}>
                  {formatIsk(result.totalJbv)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  {t("totalOfferValue")}
                </span>
                <span className={styles.summaryValue}>
                  {formatIsk(result.totalOfferValue)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  {t("blendedPercent")}
                </span>
                <span className={styles.summaryValue}>
                  {result.blendedPercent.toFixed(1)}%
                </span>
              </div>
            </Card>

            <Card mainTitle={t("contractDetailsTitle")}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("referenceId")}</span>
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
                {t("referenceIdNote")}
              </span>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t("finalValue")}</span>
                <div className={styles.valueGroup}>
                  <span className={styles.summaryValue}>
                    {formatIsk(result.totalOfferValue)}
                  </span>
                  <IconButton
                    alt={t("copyToClipboard")}
                    onClick={() =>
                      copyTextToClipboard(
                        String(Math.round(result.totalOfferValue)),
                      )
                    }
                  />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

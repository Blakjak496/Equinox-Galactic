"use client";

import { Fragment, useEffect, useState } from "react";
import styles from "./page.module.css";
import Card from "@shared/ui/Card/Card";
import Button from "@shared/ui/Button/Button";
import IconButton from "@shared/ui/IconButton/IconButton";
import {
  getStock,
  getStockLocations,
  quoteCart,
  submitBuyOrder,
} from "@/app/api/stock";
import {
  BuyOrderResponse,
  CartQuote,
  StockItem,
  StockLocation,
} from "@/types";
import { useLocale } from "@/lib/LocaleContext";

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

function groupByCategory(
  items: StockItem[],
): { categoryName: string; items: StockItem[] }[] {
  const groups = new Map<string, StockItem[]>();
  for (const item of items) {
    const group = groups.get(item.categoryName);
    if (group) group.push(item);
    else groups.set(item.categoryName, [item]);
  }
  return Array.from(groups.entries())
    .map(([categoryName, items]) => ({ categoryName, items }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

type CartLine = {
  typeId: number;
  name: string;
  // "" is a distinct, valid state for "the input is currently empty" -
  // treating it as the number 0 while the user is typing would force the
  // input to redisplay "0" mid-edit, breaking the normal clear-then-type
  // flow for entering a new quantity. Only resolved to 0 when a request
  // payload is actually built (see toPayloadQuantity).
  quantity: number | "";
  availableQuantity: number;
};

function toPayloadQuantity(quantity: number | ""): number {
  return quantity === "" ? 0 : quantity;
}

export default function PurchaseStock() {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationId, setLocationId] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<BuyOrderResponse | null>(
    null,
  );
  const { t } = useLocale();

  useEffect(() => {
    getStockLocations()
      .then((data) => {
        setLocations(data);
        // Most setups only ever have one purchase location - skip the extra
        // click when there's nothing to actually choose between.
        if (data.length === 1) setLocationId(data[0]._id);
      })
      .catch(() => setLocations([]))
      .finally(() => setLoadingLocations(false));
  }, []);

  useEffect(() => {
    // Cart contents are tied to one location's stock - switching locations
    // mid-shop would leave stale quantities behind.
    setCart([]);
    setQuote(null);

    if (!locationId) {
      setStock([]);
      return;
    }

    setLoadingStock(true);
    getStock(locationId)
      .then(setStock)
      .catch(() => setStock([]))
      .finally(() => setLoadingStock(false));
  }, [locationId]);

  const cartCount = cart.reduce(
    (sum, line) => sum + toPayloadQuantity(line.quantity),
    0,
  );

  // Any change to what's in the cart invalidates a previously fetched
  // quote - pricing only ever runs on an explicit "Get Cart Total" click,
  // never automatically, so a stale quote must not be shown as current.
  const invalidateQuote = () => {
    setQuote(null);
    setQuoteError(null);
  };

  const addToCart = (item: StockItem) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.typeId === item.typeId);
      if (existing) {
        const nextQty = Math.min(
          toPayloadQuantity(existing.quantity) + 1,
          item.availableQuantity,
        );
        return prev.map((line) =>
          line.typeId === item.typeId ? { ...line, quantity: nextQty } : line,
        );
      }
      return [
        ...prev,
        {
          typeId: item.typeId,
          name: item.name,
          quantity: 1,
          availableQuantity: item.availableQuantity,
        },
      ];
    });
    invalidateQuote();
    setCartOpen(true);
  };

  // raw is the input's literal text - kept as "" rather than coerced to 0
  // so the field can sit empty while the user is mid-edit (e.g. backspacing
  // before typing a new multi-digit quantity) without the input fighting
  // back with a forced "0". A line is never removed just because its
  // quantity dropped to 0/empty - only the explicit Remove button does that.
  const updateQuantity = (typeId: number, raw: string) => {
    setCart((prev) =>
      prev.map((line) => {
        if (line.typeId !== typeId) return line;
        if (raw === "") return { ...line, quantity: "" };

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return line;

        return {
          ...line,
          quantity: Math.max(0, Math.min(parsed, line.availableQuantity)),
        };
      }),
    );
    invalidateQuote();
  };

  const removeFromCart = (typeId: number) => {
    setCart((prev) => prev.filter((line) => line.typeId !== typeId));
    invalidateQuote();
  };

  const handleGetCartTotal = async () => {
    if (!locationId || cart.length === 0) return;

    setQuoteLoading(true);
    setQuoteError(null);

    const result = await quoteCart(
      locationId,
      cart.map((line) => ({
        typeId: line.typeId,
        quantity: toPayloadQuantity(line.quantity),
      })),
    );

    if (!result.ok) {
      setQuoteError(result.message);
      setQuoteLoading(false);
      return;
    }

    setQuote(result.data);
    setQuoteLoading(false);
  };

  const handleSubmit = async () => {
    if (!characterName.trim() || !locationId || !quote) return;

    setSubmitting(true);
    setSubmitError(null);

    const result = await submitBuyOrder(
      characterName.trim(),
      locationId,
      cart.map((line) => ({
        typeId: line.typeId,
        quantity: toPayloadQuantity(line.quantity),
      })),
    );

    if (!result.ok) {
      setSubmitError(result.message);
      setSubmitting(false);
      return;
    }

    setOrderResult(result.data);
    setCart([]);
    setQuote(null);
    setCartOpen(false);
    setSubmitting(false);
  };

  if (orderResult) {
    return (
      <div className={styles.page}>
        <div className={styles.stack}>
          <Card mainTitle={t("orderConfirmedTitle")}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{t("description")}</span>
              <div className={styles.valueGroup}>
                <span className={styles.summaryValue}>
                  {orderResult.referenceId}
                </span>
                <IconButton
                  alt={t("copyToClipboard")}
                  onClick={() =>
                    navigator.clipboard.writeText(orderResult.referenceId)
                  }
                />
              </div>
            </div>
            <span className={styles.referenceIdNote}>
              {t("orderReferenceNote")}
            </span>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                {t("purchaseLocation")}
              </span>
              <span className={styles.summaryValue}>
                {orderResult.locationName}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                {t("orderTotalPrice")}
              </span>
              <span className={styles.summaryValue}>
                {formatIsk(orderResult.totalPrice)}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                {t("orderExpiresNote")}
              </span>
              <span className={styles.summaryValue}>
                {new Date(orderResult.expiresAt).toLocaleString()}
              </span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.cartToggle} onClick={() => setCartOpen(true)}>
        {t("cartButton", { count: cartCount })}
      </button>

      <div className={styles.stack}>
        <Card
          mainTitle={t("purchasePageTitle")}
          subtitle={t("purchasePageSubtitle")}
        >
          <p className={styles.pricingNote}>{t("purchasePricingNote")}</p>

          {loadingLocations ? (
            <p className={styles.muted}>{t("loading")}</p>
          ) : locations.length === 0 ? (
            <p className={styles.muted}>{t("purchaseNoLocations")}</p>
          ) : (
            <>
              <div className={styles.locationWrapper}>
                <label
                  htmlFor="purchase-location"
                  className={styles.locationLabel}
                >
                  {t("purchaseLocation")}
                </label>
                <select
                  id="purchase-location"
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

              {!locationId ? null : loadingStock ? (
                <p className={styles.muted}>{t("loading")}</p>
              ) : stock.length === 0 ? (
                <p className={styles.muted}>{t("purchaseNoStock")}</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <tbody>
                      <tr className={styles.tableHead}>
                        <th>{t("colItem")}</th>
                        <th>{t("colAvailable")}</th>
                        <th></th>
                      </tr>
                      {groupByCategory(stock).map((group) => (
                        <Fragment key={group.categoryName}>
                          <tr className={styles.categoryRow}>
                            <td colSpan={3}>{group.categoryName}</td>
                          </tr>
                          {group.items.map((item) => (
                            <tr key={item.typeId}>
                              <td data-label={t("colItem")}>{item.name}</td>
                              <td data-label={t("colAvailable")}>
                                {item.availableQuantity.toLocaleString()}
                              </td>
                              <td className={styles.actionCell}>
                                <Button
                                  type={2}
                                  onClick={() => addToCart(item)}
                                  disabled={item.availableQuantity <= 0}
                                >
                                  {t("addToCart")}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {cartOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setCartOpen(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <Card mainTitle={t("cartTitle")}>
              {cart.length === 0 ? (
                <p className={styles.muted}>{t("cartEmpty")}</p>
              ) : (
                <>
                  <div className={styles.cartLines}>
                    {cart.map((line) => {
                      const quoteItem = quote?.items.find(
                        (i) => i.typeId === line.typeId,
                      );
                      return (
                        <div key={line.typeId} className={styles.cartLine}>
                          <span className={styles.cartLineName}>
                            {line.name}
                          </span>
                          <label className={styles.qtyGroup}>
                            <span className={styles.qtyLabel}>
                              {t("colQuantity")}
                            </span>
                            <input
                              type="number"
                              className={styles.qtyInput}
                              min={0}
                              max={line.availableQuantity}
                              value={line.quantity}
                              onChange={(e) =>
                                updateQuantity(line.typeId, e.target.value)
                              }
                            />
                          </label>
                          {quoteItem && (
                            <span className={styles.cartLinePrice}>
                              {formatIsk(quoteItem.totalPrice)}
                            </span>
                          )}
                          <button
                            className={styles.removeButton}
                            onClick={() => removeFromCart(line.typeId)}
                          >
                            {t("removeFromCart")}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {!quote ? (
                    <div className={styles.quotePending}>
                      <span className={styles.muted}>
                        {t("cartTotalPending")}
                      </span>
                      <Button
                        type={2}
                        onClick={handleGetCartTotal}
                        disabled={quoteLoading}
                      >
                        {quoteLoading ? t("loading") : t("getCartTotal")}
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.summaryRowFinal}>
                      <span className={styles.summaryLabel}>
                        {t("cartTotal")}
                      </span>
                      <span className={styles.summaryValueFinal}>
                        {formatIsk(quote.totalPrice)}
                      </span>
                    </div>
                  )}
                  {quoteError && (
                    <span className={styles.error}>{quoteError}</span>
                  )}

                  <div className={styles.locationWrapper}>
                    <label
                      htmlFor="character-name"
                      className={styles.locationLabel}
                    >
                      {t("characterName")}
                    </label>
                    <input
                      id="character-name"
                      type="text"
                      className={styles.characterInput}
                      placeholder={t("characterNamePlaceholder")}
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                    />
                  </div>
                  {submitError && (
                    <span className={styles.error}>{submitError}</span>
                  )}
                  <div className={styles.modalButtons}>
                    <Button
                      type={1}
                      onClick={handleSubmit}
                      disabled={
                        submitting ||
                        !characterName.trim() ||
                        !quote ||
                        cart.length === 0
                      }
                    >
                      {submitting ? t("loading") : t("submitOrder")}
                    </Button>
                    <Button
                      type={3}
                      onClick={() => setCartOpen(false)}
                      disabled={false}
                    >
                      {t("closeCart")}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

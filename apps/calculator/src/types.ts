export type JaniceAppraisal = {
  id: number;
  created: string;
  expires: string;
  datasetTime: string;
  code: string;
  designation: "appraisal" | "wtb" | "sell";
  pricing: "buy" | "split" | "sell" | "purchase";
  pricingVariant: "immediate" | "top5percent";
  pricePercentage: number;
  comment: string;
  isCompactized: boolean;
  input: string;
  failures: string;
  market: {
    id: number;
    name: string;
  };
  totalVolume: number;
  totalPackagedVolume: number;
  effectivePrices: {
    totalBuyPrice: number;
    totalSplitPrice: number;
    totalSellPrice: number;
  };
  immediatePrices: {
    totalBuyPrice: number;
    totalSplitPrice: number;
    totalSellPrice: number;
  };
  top5AveragePrices: {
    totalBuyPrice: number;
    totalSplitPrice: number;
    totalSellPrice: number;
  };
  items: {
    id: number;
    amount: number;
    buyOrderCount: number;
    buyVolume: number;
    sellOrderCount: number;
    sellVolume: number;
    effectivePrices: {
      buyPrice: number;
      splitPrice: number;
      sellPrice: number;
      buyPriceTotal: number;
      splitPriceTotal: number;
      sellPriceTotal: number;
      buyPrice5DayMedian: number;
      splitPrice5DayMedian: number;
      sellPrice5DayMedian: number;
      buyPrice30DayMedian: number;
      splitPrice30DayMedian: number;
      sellPrice30DayMedian: number;
    };
    immediatePrices: {
      buyPrice: number;
      splitPrice: number;
      sellPrice: number;
      buyPriceTotal: number;
      splitPriceTotal: number;
      sellPriceTotal: number;
      buyPrice5DayMedian: number;
      splitPrice5DayMedian: number;
      sellPrice5DayMedian: number;
      buyPrice30DayMedian: number;
      splitPrice30DayMedian: number;
      sellPrice30DayMedian: number;
    };
    top5AveragePrices: {
      buyPrice: number;
      splitPrice: number;
      sellPrice: number;
      buyPriceTotal: number;
      splitPriceTotal: number;
      sellPriceTotal: number;
      buyPrice5DayMedian: number;
      splitPrice5DayMedian: number;
      sellPrice5DayMedian: number;
      buyPrice30DayMedian: number;
      splitPrice30DayMedian: number;
      sellPrice30DayMedian: number;
    };
    totalVolume: number;
    totalPackagedVolume: number;
    itemType: {
      eid: number;
      name: string;
      volume: number;
      packagedVolume: number;
    };
  }[];
};

export type BuybackQuoteItem = {
  typeId: number;
  name: string;
  categoryName: string;
  quantity: number;
  jbvPerUnit: number;
  totalJbv: number;
  volume: number;
  percentOffered: number;
  offerValue: number;
  accepted: boolean;
  rejectReason: string | null;
};

export type BuybackQuoteResponse =
  | {
      capExceeded: true;
      netTotalPrice: number;
      message: string;
    }
  | {
      capExceeded: false;
      referenceId: string;
      items: BuybackQuoteItem[];
      totalJbv: number;
      totalOfferValue: number;
      blendedPercent: number;
      pickupFee: number;
      netTotalPrice: number;
    };

export type BuybackLocation = {
  _id: string;
  name: string;
  isHub: boolean;
};

export type StockLocation = {
  _id: string;
  name: string;
};

export type StockItem = {
  typeId: number;
  name: string;
  categoryName: string;
  availableQuantity: number;
};

export type CartQuoteItem = {
  typeId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type CartQuote = {
  items: CartQuoteItem[];
  totalPrice: number;
};

export type BuyOrderResponse = {
  referenceId: string;
  locationName: string;
  items: {
    typeId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalPrice: number;
  expiresAt: string;
};

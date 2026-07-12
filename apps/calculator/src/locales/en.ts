const en = {
  language: "Language",
  contractDetailsTitle: "Contract Details",
  contractDetailsSubtitle: "Enter contract details to calculate a quote",
  ratePerM3: "ISK/m³",
  collateralPercent: "Collateral",
  minimum: "Minimum",
  origin: "Origin",
  destination: "Destination",
  selectOrigin: "Select Origin",
  selectDestination: "Select Destination",
  copyToClipboard: "Copy to clipboard",
  appraisalPlaceholder:
    "Enter your list of items for appraisal\n\neg.\n\nTritanium 22222\nPyerite 8000\nMexallon 2444",
  getAppraisal: "Get Appraisal",
  loading: "Loading...",
  viewAppraisalOnJanice: "View appraisal on Janice",
  orEnterManually: "Or enter manually",
  volumeOverMaxTitle:
    "Volume is over the maximum volume for the selected route.",
  volumeOverMaxBody: "Split the cargo into multiple contracts.",
  collateralOverMaxTitle:
    "The collateral is greater than the maximum allowed for a single contract.",
  collateralOverMaxBody:
    "You can still split the cargo into multiple contracts.",
  volume: "Volume (m³)",
  volumeMax: "max: {max}",
  volumePlaceholder: "e.g 375,000",
  collateralIsh: "Collateral (ISK)",
  collateralMax: "max: 15,000,000,000",
  note: "NOTE:",
  noteNpcStations:
    "Not currently servicing NPC stations. Contracts with an NPC pickup or drop-off station will be rejected",
  noteStructures:
    "Structures must be WinterCo owned structures to ensure docking is possible",
  rush: "Rush (+{amount} ISK)",
  rushDescriptionShort:
    "Priority contract. Loaded ahead of standard contracts.",
  quoteTitle: "Quote",
  quoteSubtitle: "Total and breakdown",
  quoteRushFee: "Rush fee",
  totalReward: "Total reward",
  contractSettings: "Contract Settings",
  availability: "Availability:",
  issuer: "Equinox Galactic",
  reward: "Reward:",
  description: "Description:",
  rushLabel: "Rush",
  collateralLabel: "Collateral:",
  expiration: "Expiration:",
  expirationValue: "2 Weeks",
  daysToComplete: "Days to complete:",
  daysToCompleteValue: "7",
  allRoutesTitle: "All Routes",
  route: "Route",
  ratePerM3Table: "Rate (ISK/m³)",
  minimumReward: "Minimum Reward (ISK)",
  collateralFee: "Collateral Fee",
  rushPrice: "Rush Price (ISK)",
  maxVolume: "Max Volume (m³)",

  buybackPageTitle: "Buyback Quote",
  buybackPageSubtitle: "Paste your item list to get an itemised buyback offer",
  pickupLocation: "Pickup Location",
  selectLocation: "Select Location",
  getQuote: "Get Quote",

  itemizedTitle: "Itemised Results",
  colItem: "Item",
  colCategory: "Category",
  colQuantity: "Qty",
  colJbvPerUnit: "JBV / Unit",
  colTotalJbv: "Total JBV",
  colPercentOffered: "% Offered",
  colOfferValue: "Offer Value",
  colStatus: "Status",
  statusAccepted: "Accepted",
  statusNotAccepted: "Not currently accepted",

  summaryTitle: "Quote Summary",
  notAcceptedWarning:
    "{count} item(s) in your list are not currently accepted. Check the itemised results below.",
  itemsNotAccepted: "Items Not Accepted",
  itemsAccepted: "Items Accepted",
  totalJbvAccepted: "Total JBV (Accepted)",
  haulingFee: "Hauling Fee",
  pickupFee: "Pickup Fee",
  totalOfferFinal: "Total Offer",

  referenceIdRejectedNote:
    "Paste this reference ID into your contract's description. Contracts missing it will be rejected.",
  privateAvailability: "Private to Equinox Galactic",
  iWillReceive: "I will receive",
  buybackExpirationValue: "4 Weeks",

  capExceededTitle: "Submission Too Large",
  capExceededNote:
    "This submission's net total exceeds the 20,000,000,000 ISK cap. Please split it into multiple submissions and submit each separately.",

  buybackErrorGeneric:
    "Something went wrong getting your quote. Please try again.",
} as const;

export default en;

import { JSX } from "react/jsx-runtime";
import { JaniceAppraisal } from "./types";
import { Route, sanitizeLocation, getValidDestinations } from "@shared/quote/route-rules";

export const copyTextToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text);
};

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function toBase32Crockford(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export const createUniqueId = (): string => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  const token = toBase32Crockford(bytes).slice(0, 12);

  return `NOXG-${token.slice(0, 6)}-${token.slice(6, 12)}`;
};


function pickJanicePriceBlock(appraisal: JaniceAppraisal) {
  // Prefer immediate (most “now”), then effective, then top5Average
  return (
    appraisal.immediatePrices ??
    appraisal.effectivePrices ??
    appraisal.top5AveragePrices ??
    null
  );
}

export function extractQuoteInputsFromJanice(appraisal: JaniceAppraisal) {
  const rawVolume =
    Number(appraisal.totalPackagedVolume) || Number(appraisal.totalVolume) || 0;

  const volumeM3 = Math.ceil(rawVolume);

  const prices = pickJanicePriceBlock(appraisal);
  const collateral =
    prices && Number.isFinite(prices.totalSellPrice)
      ? prices.totalSellPrice
      : 0;

  return {
    volumeM3,
    collateral: collateral,
    appraisalRef: appraisal.code || String(appraisal.id),
    appraisalId: appraisal.id,
    appraisalExpires: appraisal.expires,
  };
}

export const branchSystems = [
  "Z-K495",
  "LXWN-W",
  "XM-4L0",
  "8-4GQM",
  "C-LP3N",
  "QCWA-Z",
  "LRWD-B",
  "1G-MJE",
  "KV-8SN",
  "52G-NZ",
  "T-Q2DD",
  "S-B7IT",
  "5LJ-MD",
  "6-O5GY",
  "O-JPKH",
  "B8O-KJ",
  "9F-7PZ",
  "B-GC1T",
  "I-7RIS",
  "UB-UQZ",
  "0P9Z-I",
  "QXQ-BA",
  "WO-AIJ",
  "HB7R-F",
  "CS-ZGD",
  "A-G1FM",
  "V8W-QS",
  "X7R-JW",
  "JRZ-B9",
  "C-HCGU",
  "YG-82V",
  "4DTQ-K",
  "XW-2XP",
  "P7Z-R3",
  "4-BE0M",
  "OJ-A8M",
  "NTV0-1",
  "ZIU-EP",
  "M-HU4V",
  "3-N3OO",
  "Q-FEEJ",
  "F-9F6Q",
  "2B7A-3",
  "MA-VDX",
  "JTAU-5",
  "4-48K1",
  "J9-5MQ",
  "X4UV-Z",
  "R4O-I6",
  "3F-JZF",
  "EQI2-2",
  "KL3O-J",
  "D4R-H7",
  "RO90-H",
  "C-4ZOS",
  "Q-4DEC",
  "Q-NJZ4",
  "BWI1-9",
  "J7YR-1",
  "313I-B",
  "O94U-A",
  "NEH-CS",
  "C-VGYO",
  "C-LBQS",
  "3-TD6L",
  "J52-BH",
  "K-8SQS",
  "CX-1XF",
  "5-0WB9",
  "XW-JHT",
  "EWN-2U",
  "NLPB-0",
  "PKG4-7",
  "PUWL-4",
  "DCI7-7",
  "5-P1Y2",
  "VL3I-M",
  "UQ9-3C",
  "1IX-C0",
  "Y-1918",
  "KMC-WI",
  "KMQ4-V",
  "KJ-QWL",
  "9-B1DS",
  "SVB-RE",
  "CH9L-K",
  "I-7JR4",
  "BU-IU4",
  "3KNA-N",
  "QYZM-W",
];

export const COALITION_STAGING_ORIGINS: {
  station: string;
  region: string;
}[] = [
  { station: "BKG-Q2 - Insidious Prime", region: "Branch" },
  {
    station: "4-HWWF - WinterCo. Central Station",
    region: "Vale of the Silent",
  },
  { station: "AH-B84 - Reichstag of Synergy", region: "Branch" },
  { station: "G06-8Y - Tenal Trade Tower", region: "Tenal" },
  { station: "M-UC0S - Mucus Aurelius", region: "Tenal" },
  { station: "X47L-Q - Rogue Threshold", region: "Pure Blind" },
  { station: "B-9C24 - Maginot Line", region: "Pure Blind" },
  { station: "VFK-IV - Suslik North Home", region: "Deklein" },
  { station: "3T7-M8 - Citadel of the Holy Procurer", region: "Deklein" },
  { station: "UMI-KK - War of Interesting Times", region: "Tribute" },
  { station: "BWF-ZZ - BWFour Time WWB ChampZZ", region: "Geminate" },
  { station: "ZXA-V6 - Rifa Dian Rorquals Memorial", region: "Tenal" },
];

export const INDUSTRY_PARKS: { station: string; region: string }[] = [
  { station: "DBT-GB - Unprofitable Construction", region: "Tribute" },
  { station: "NL6V-7 - Nuclear Assembly", region: "Tribute" },
  { station: "GKP-YT - TittyTara", region: "Tribute" },
  { station: "KQK1-2 - Workshop", region: "Pure Blind" },
  { station: "NV-3KA - Mimir's House of Wisdom", region: "Tenal" },
  { station: "W-4FA9 - Totoro's Forge", region: "Branch" },
  { station: "ME-4IU - Krusty Krab", region: "Branch" },
];

export const getDropdownOptions = (
  origin: string,
  routes: Route[],
): JSX.Element[] | undefined => {
  if (!origin) return;

  const validDests = new Set(getValidDestinations(routes, origin));

  const coalitionOptions: JSX.Element[] = [];
  COALITION_STAGING_ORIGINS.forEach((location, idx) => {
    if (validDests.has(sanitizeLocation(location.station))) {
      coalitionOptions.push(
        <option key={"winterco-" + idx} value={location.station}>
          {location.station}
        </option>,
      );
    }
  });

  const industryOptions: JSX.Element[] = [];
  INDUSTRY_PARKS.forEach((location, idx) => {
    if (validDests.has(sanitizeLocation(location.station))) {
      industryOptions.push(
        <option key={"industry-" + idx} value={location.station}>
          {location.station}
        </option>,
      );
    }
  });

  const branchOptions: JSX.Element[] = [];
  branchSystems.forEach((location, idx) => {
    if (validDests.has(location)) {
      branchOptions.push(
        <option key={"branch-" + idx} value={location}>
          {location}
        </option>,
      );
    }
  });

  const optGroups = [];
  if (coalitionOptions.length) {
    optGroups.push(
      <optgroup key={0} label="WinterCo">
        {coalitionOptions.map((option) => option)}
      </optgroup>,
    );
  }

  if (industryOptions.length) {
    optGroups.push(
      <optgroup key={1} label="Industry">
        {industryOptions.map((option) => option)}
      </optgroup>,
    );
  }

  if (branchOptions.length) {
    optGroups.push(
      <optgroup key={2} label="Branch">
        {branchOptions.map((option) => option)}
      </optgroup>,
    );
  }

  return optGroups;
};

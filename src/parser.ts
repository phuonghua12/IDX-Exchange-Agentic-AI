import type { PropertyFilters } from "./types.js";

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const NUM = "(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)";
const toNum = (s: string) => WORD_NUM[s.toLowerCase()] ?? Number(s);

/** "$1.5M" | "900k" | "1,200,000" | "1.2 million" -> number */
function parseMoney(raw: string, suffix?: string): number {
  let n = Number(raw.replace(/,/g, ""));
  const s = (suffix ?? "").toLowerCase();
  if (s === "k" || s === "thousand") n *= 1_000;
  if (s === "m" || s === "million") n *= 1_000_000;
  return n;
}

// NOTE: values must match what is really stored in rets_property.L_Type_.
// Verify with:  SELECT DISTINCT L_Type_ FROM rets_property;
const TYPE_MAP: Array<[RegExp, string]> = [
  [/\b(condo|condos|condominium|condominiums)\b/i, "Condominium"],
  [/\b(townhome|townhomes|townhouse|townhouses)\b/i, "Townhouse"],
  [/\b(single[\s-]family|sfr|house|houses)\b/i, "SingleFamilyResidence"],
  [/\b(land|vacant lot)\b/i, "UnimprovedLand"],
];

const STOP = "instead|now|please|too|also|only|under|below|over|above|with|at|for|that|and|priced|less|max|min|having|without|no|near|around|within|up|\\$|\\d";

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function parsePropertyQuery(query: string): PropertyFilters {
  let q = ` ${query} `;
  const take = (re: RegExp) => {
    const m = q.match(re);
    if (m) q = q.replace(m[0], " ");
    return m;
  };

  // 1) HOA first (otherwise "HOA under $500" is mistaken for the price cap)
  const hoaM = take(new RegExp(`\\bhoa\\s*(?:fees?\\s*)?(?:under|below|<|max|less than|up to)?\\s*\\$?([\\d,.]+)\\s*(k)?(?:\\s*(?:/|a|per)\\s*(?:mo|month))?`, "i"))
    ?? take(/\b(?:under|below|less than)\s*\$?([\d,.]+)\s*(k)?\s*(?:\/|a|per)?\s*(?:mo|month)\s*(?:hoa)?/i);
  const maxHoa = hoaM ? parseMoney(hoaM[1], hoaM[2]) : null;

  // 2) Max price
  const priceM = take(/\b(?:under|below|less than|up to|at most|max(?:imum)?(?: price)?(?: of)?|budget(?: of)?|<=?)\s*\$?\s*([\d][\d,.]*)\s*(k|m|million|thousand)?\b/i);
  const maxPrice = priceM ? parseMoney(priceM[1].replace(/[.,]$/, ""), priceM[2]) : null;

  // 3) Bedrooms / bathrooms / sqft
  const bedsM = take(new RegExp(`${NUM}\\s*[- ]?\\s*\\+?\\s*(?:bedrooms?|beds?|br|bd)\\b`, "i"));
  const bathsM = take(new RegExp(`${NUM}\\s*[- ]?\\s*\\+?\\s*(?:bathrooms?|baths?|ba)\\b`, "i"));
  const sqftM = take(/\b([\d][\d,]*)\s*\+?\s*(?:sq\.?\s?ft\.?|sqft|square\s?(?:feet|foot)|sf)\b/i);

  // 4) City: "in Irvine", "in Newport Beach, CA"
  const cityM = q.match(new RegExp(`\\b(?:in|near|around)\\s+([A-Za-z][A-Za-z.' ]*?)(?=\\s+(?:${STOP})|\\s*,|\\s*\\.|\\s*$)`, "i"));
  let city = cityM ? cityM[1].trim() : null;
  if (city && /^(the|a|an|my|your)$/i.test(city)) city = null;
  if (city) city = titleCase(city);

  const lower = query.toLowerCase();
  const type = TYPE_MAP.find(([re]) => re.test(query))?.[1] ?? null;
  const pool = /\bpool\b/.test(lower) && !/\b(no|without)\s+(?:a\s+)?pool\b/.test(lower) ? "True" : null;
  const hasView = /\bviews?\b/.test(lower) && !/\b(no|without)\s+(?:a\s+)?views?\b/.test(lower) ? "True" : null;

  return {
    city,
    maxPrice,
    beds: bedsM ? toNum(bedsM[1]) : null,
    baths: bathsM ? toNum(bathsM[1]) : null,
    sqft: sqftM ? Number(sqftM[1].replace(/,/g, "")) : null,
    type,
    pool,
    hasView,
    maxHoa,
  };
}

export function hasAnyFilter(f: PropertyFilters): boolean {
  return Object.values(f).some((v) => v !== null && v !== undefined);
}

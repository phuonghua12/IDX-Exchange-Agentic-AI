import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePropertyQuery } from "../src/parser.ts";

import type { PropertyFilters } from "../src/types.ts";
const base: Required<PropertyFilters> = { city: null, maxPrice: null, beds: null, baths: null, sqft: null, type: null, pool: null, hasView: null, maxHoa: null };
const cases: Array<[string, PropertyFilters]> = [
  ["Show me 3-bedroom condos in Irvine under $1.5M with a pool.", { city: "Irvine", maxPrice: 1_500_000, beds: 3, type: "Condominium", pool: "True" }],
  ["homes in Newport Beach under 2,000,000", { city: "Newport Beach", maxPrice: 2_000_000 }],
  ["4 bed 2.5 bath single family in San Diego under $900k", { city: "San Diego", maxPrice: 900_000, beds: 4, baths: 2.5, type: "SingleFamilyResidence" }],
  ["townhomes in Pasadena with a view", { city: "Pasadena", type: "Townhouse", hasView: "True" }],
  ["2br condo in Los Angeles, CA below $750k", { city: "Los Angeles", maxPrice: 750_000, beds: 2, type: "Condominium" }],
  ["at least 1800 sq ft house in Riverside under 1.2 million", { city: "Riverside", sqft: 1800, maxPrice: 1_200_000, type: "SingleFamilyResidence" }],
  ["condos in Irvine with HOA under $500", { city: "Irvine", maxHoa: 500, type: "Condominium", maxPrice: null }],
  ["three bedroom house in Temecula less than $850k with pool and view", { city: "Temecula", beds: 3, maxPrice: 850_000, type: "SingleFamilyResidence", pool: "True", hasView: "True" }],
  ["land in Murrieta under $400k", { city: "Murrieta", maxPrice: 400_000, type: "UnimprovedLand" }],
  ["3 bed in Irvine under $1.5M no pool", { city: "Irvine", beds: 3, maxPrice: 1_500_000, pool: null }],
  ["5 bedroom 3 bath 3,200 sqft in Anaheim Hills", { city: "Anaheim Hills", beds: 5, baths: 3, sqft: 3200 }],
  ["condo in Irvine under $800k and HOA max $450 a month", { city: "Irvine", maxPrice: 800_000, maxHoa: 450, type: "Condominium" }],
  ["homes in Palm Springs", { city: "Palm Springs" }],
  ["hello there", {}],
];

cases.forEach(([q, expected], i) => {
  test(`#${i + 1} ${q}`, () => {
    assert.deepEqual(parsePropertyQuery(q), { ...base, ...expected });
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildActiveListingsQuery, monthsBefore } from "../src/search.ts";
import { formatListingCard } from "../src/format.ts";

test("every filter becomes a bound parameter (no values in SQL text)", () => {
  const q = buildActiveListingsQuery({ city: "Irvine'; DROP TABLE rets_property;--", maxPrice: 1_500_000, beds: 3, baths: 2, sqft: 1800, type: "Condominium", pool: "True", hasView: "True", maxHoa: 500 });
  assert.equal((q.sql.match(/\?/g) ?? []).length, q.params.length);
  assert.equal(q.params.length, 9);
  assert.ok(!q.sql.includes("DROP TABLE"));
});
test("no filters -> only Active status", () => {
  const q = buildActiveListingsQuery({});
  assert.deepEqual(q.params, []);
  assert.match(q.sql, /WHERE L_Status = 'Active' ORDER BY/);
});
test("pagination math + clamping (injection-safe LIMIT/OFFSET)", () => {
  assert.match(buildActiveListingsQuery({}, 3, 10).sql, /LIMIT 10 OFFSET 20$/);
  assert.match(buildActiveListingsQuery({}, -5, 9999).sql, /LIMIT 50 OFFSET 0$/);
  assert.match(buildActiveListingsQuery({}, "2; DROP" as any, 10).sql, /LIMIT 10 OFFSET 0$/);
});
test("monthsBefore anchors to data date", () => {
  assert.equal(monthsBefore("2025-12-31", 12), "2024-12-31");
  assert.equal(monthsBefore("2025-03-15", 6), "2024-09-15");
});
test("listing card renders", () => {
  const c = formatListingCard({ L_ListingID: "1", L_DisplayId: "OC123", L_Address: "1 Main St", L_City: "Irvine", L_Zip: "92618", price: 1_250_000, beds: 3, baths: 2.5, sqft: 1800, type: "Condominium", status: "Active", lat: 0, lng: 0, YearBuilt: 2015, AssociationFee: 450, DaysOnMarket: 12, PoolPrivateYN: "True", ViewYN: null, FireplaceYN: null, PhotoCount: 24, LA1_UserFirstName: "Jane", LA1_UserLastName: "Doe", LO1_OrganizationName: "IDX Realty" }, 1);
  assert.match(c, /\$1,250,000/); assert.match(c, /24 photos/); assert.match(c, /HOA \$450/);
});

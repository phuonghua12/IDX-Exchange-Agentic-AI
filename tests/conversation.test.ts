import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handleMessage, type Deps } from "../src/conversation.ts";
import { clearAllSessions, getSession, SESSION_TTL_MS } from "../src/session.ts";
import type { ListingRow, PropertyFilters } from "../src/types.ts";

const row = (i: number): ListingRow => ({ L_ListingID: `${i}`, L_DisplayId: `OC${i}`, L_Address: `${i} Test St`, L_City: "Irvine", L_Zip: "92618", price: 1_000_000 + i, beds: 3, baths: 2, sqft: 1800, type: "SingleFamilyResidence", status: "Active", lat: 0, lng: 0, YearBuilt: 2000, AssociationFee: null, DaysOnMarket: 5, PoolPrivateYN: null, ViewYN: null, FireplaceYN: null, PhotoCount: 10, LA1_UserFirstName: "A", LA1_UserLastName: "B", LO1_OrganizationName: "X" });

let calls: Array<{ f: PropertyFilters; page: number }> = [];
let total = 12;
const deps: Deps = {
  search: async (f, page, limit) => {
    calls.push({ f, page });
    const start = (page - 1) * limit;
    const rows = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => row(start + i + 1));
    return { rows, page, limit, total, hasMore: page * limit < total };
  },
  comps: async () => [],
};
const say = (u: string, m: string, now?: number) => handleMessage(u, m, deps, now);
beforeEach(() => { clearAllSessions(); calls = []; total = 12; });

test("handbook example: city -> budget -> type -> results", async () => {
  assert.match(await say("u1", "Find homes in Irvine"), /budget/i);
  assert.equal(calls.length, 0);
  assert.match(await say("u1", "Under $1.2M"), /condo, townhome, or single family/i);
  const r = await say("u1", "Single family with at least 3 beds");
  assert.equal(calls.length, 1);
  assert.deepEqual({ ...calls[0].f }, { city: "Irvine", maxPrice: 1_200_000, beds: 3, baths: undefined, sqft: undefined, type: "SingleFamilyResidence", pool: undefined, hasView: undefined, maxHoa: undefined });
  assert.match(r, /Irvine • under \$1,200,000 • single family • 3\+ beds/);
  assert.match(r, /photos/);
  assert.equal(getSession("u1").conversationStep, 4);
  assert.equal(getSession("u1").lastResults?.length, 5);
});

test("rich first message searches immediately", async () => {
  await say("u1", "3-bedroom condos in Irvine under $1.5M with a pool");
  assert.equal(calls.length, 1);
});

test("bare answers: 'Irvine' for city, '900k' for budget", async () => {
  assert.match(await say("u1", "hi"), /which city/i);
  assert.match(await say("u1", "irvine, CA"), /budget/i);
  assert.equal(getSession("u1").city, "Irvine");
  await say("u1", "900k");
  assert.equal(getSession("u1").maxPrice, 900_000);
});

test("'any' skips budget and type, and they are not asked again", async () => {
  await say("u1", "homes in Pasadena");
  assert.match(await say("u1", "any"), /condo, townhome/i);
  await say("u1", "no preference");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].f.maxPrice, undefined);
});

test("refinement after results re-searches with merged filters", async () => {
  await say("u1", "3-bedroom condos in Irvine under $1.5M");
  await say("u1", "make it 4 beds with a pool");
  const f = calls.at(-1)!.f;
  assert.equal(f.beds, 4); assert.equal(f.pool, "True"); assert.equal(f.city, "Irvine"); assert.equal(f.maxPrice, 1_500_000);
  await say("u1", "no pool");
  assert.equal(calls.at(-1)!.f.pool, undefined);
  await say("u1", "in Pasadena instead");
  assert.equal(calls.at(-1)!.f.city, "Pasadena");
});

test("'more' pages through results and stops at the end", async () => {
  await say("u1", "3 bed condos in Irvine under $2M");
  await say("u1", "more");
  assert.equal(calls.at(-1)!.page, 2);
  await say("u1", "more");
  assert.equal(calls.at(-1)!.page, 3);
  assert.match(await say("u1", "more"), /all the matches/i);
  assert.equal(getSession("u1").page, 3);
});

test("start over clears memory", async () => {
  await say("u1", "3 bed condos in Irvine under $2M");
  assert.match(await say("u1", "start over"), /fresh start/i);
  assert.equal(getSession("u1").city, undefined);
});

test("sessions are isolated per user", async () => {
  await say("alice", "homes in Irvine"); await say("bob", "homes in Pasadena");
  assert.equal(getSession("alice").city, "Irvine"); assert.equal(getSession("bob").city, "Pasadena");
});

test("session expires after idle TTL", async () => {
  const t0 = 1_000_000;
  await say("u1", "homes in Irvine", t0);
  assert.match(await say("u1", "Under $1M", t0 + SESSION_TTL_MS + 1), /which city/i);
});

test("zero results gives helpful suggestion; unrelated chatter after search gets help", async () => {
  total = 0;
  assert.match(await say("u1", "3 bed condos in Irvine under $100k"), /No active listings match/);
  assert.match(await say("u1", "thanks!"), /didn't catch a change/);
});

test("database failure returns a friendly message instead of crashing", async () => {
  const broken: Deps = { ...deps, search: async () => { throw new Error("ECONNREFUSED"); } };
  const orig = console.error; console.error = () => {};
  try { assert.match(await handleMessage("u9", "3 bed condos in Irvine under $2M", broken), /couldn't reach the listings database/); }
  finally { console.error = orig; }
});

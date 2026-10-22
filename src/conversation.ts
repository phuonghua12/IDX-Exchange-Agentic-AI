import { parsePropertyQuery } from "./parser.js";
import { searchActiveListings, getSoldComps } from "./search.js";
import { formatListingPage, formatSoldList } from "./format.js";
import { clearSession, getSession, updateSession, type UserSession } from "./session.js";
import type { ListingRow, Page, PropertyFilters } from "./types.js";

export interface Deps {
  search: (f: PropertyFilters, page: number, limit: number) => Promise<Page<ListingRow>>;
  comps: typeof getSoldComps;
}
const defaultDeps: Deps = { search: searchActiveListings, comps: getSoldComps };

const PAGE_SIZE = 5;
const RESET = /^\s*(reset|start over|new search|clear|restart)\b/i;
const MORE = /^\s*(more|next|show more|next page|see more)\W*$/i;
const SKIP = /^\s*(any|anything|no preference|doesn'?t matter|don'?t care|no limit|no budget|skip|not sure|either|all)\b/i;
const GREETING = /^\s*(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i;

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const TYPE_LABEL: Record<string, string> = { SingleFamilyResidence: "single family", Condominium: "condo", Townhouse: "townhome", UnimprovedLand: "land" };

export function describeFilters(s: PropertyFilters): string {
  return [
    s.city,
    s.maxPrice && `under ${usd(s.maxPrice)}`,
    s.type && (TYPE_LABEL[s.type] ?? s.type),
    s.beds && `${s.beds}+ beds`,
    s.baths && `${s.baths}+ baths`,
    s.sqft && `${s.sqft.toLocaleString("en-US")}+ sqft`,
    s.pool && "pool",
    s.hasView && "view",
    s.maxHoa != null && `HOA ≤ ${usd(s.maxHoa)}/mo`,
  ].filter(Boolean).join(" • ");
}

const filtersOf = (s: UserSession): PropertyFilters => ({
  city: s.city, maxPrice: s.maxPrice, beds: s.beds, baths: s.baths, sqft: s.sqft,
  type: s.type, pool: s.pool, hasView: s.hasView, maxHoa: s.maxHoa,
});

/** A bare answer to "which city?" such as "Irvine", "irvine, ca", "in San Diego please". */
function bareCity(text: string): string | null {
  const t = text.replace(/^\s*(in|near|around)\s+/i, "").replace(/\b(please|pls|thanks?)\b/gi, "").replace(/,?\s*(CA|California)\.?\s*$/i, "").replace(/[.!?]+$/, "").trim();
  if (!/^[A-Za-z][A-Za-z.' -]*$/.test(t) || t.split(/\s+/).length > 4) return null;
  return t.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** A bare budget such as "1.2m", "$900k", "under 1,200,000". */
function bareBudget(text: string): number | null {
  const m = text.match(/^\s*(?:about|around|up to|max)?\s*\$?\s*(\d[\d,.]*)\s*(k|m|million|thousand)?\s*$/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  const u = (m[2] ?? "").toLowerCase();
  if (u === "k" || u === "thousand") n *= 1e3;
  if (u === "m" || u === "million") n *= 1e6;
  return n >= 10_000 ? n : null; // "3" is not a budget
}

/** Main entry point: one WhatsApp message in, one reply out. */
export async function handleMessage(userId: string, message: string, deps: Deps = defaultDeps, now = Date.now()): Promise<string> {
  const text = message.trim();
  if (!text) return "Send me a message like “find homes in Irvine” to get started.";

  if (RESET.test(text)) {
    clearSession(userId);
    return "Fresh start! Which city would you like to search in?";
  }

  const s = getSession(userId, now);

  /* ---- paging ---- */
  if (MORE.test(text) && s.conversationStep >= 4) {
    return runSearch(userId, { ...s, page: s.page + 1 }, deps, now);
  }

  /* ---- sold comps ---- */
  if (/\b(sold|comps?|closed|recent sales)\b/i.test(text)) {
    const city = parsePropertyQuery(text).city ?? s.city;
    if (!city) return 'Which city should I pull sold comps for? (e.g. "sold homes in Irvine")';
    updateSession(userId, { city }, now);
    return formatSoldList(await deps.comps(city), city);
  }

  /* ---- merge what the user said into the session ---- */
  const p = parsePropertyQuery(text);
  const patch: Partial<UserSession> = {};
  const skipped = new Set(s.skipped);
  let understood = false;

  if (p.city) { patch.city = p.city; understood = true; }
  if (p.maxPrice) { patch.maxPrice = p.maxPrice; understood = true; }
  for (const k of ["beds", "baths", "sqft", "type", "pool", "hasView", "maxHoa"] as const) {
    if (p[k] != null) { (patch as any)[k] = p[k]; understood = true; }
  }

  // answers to the question we just asked
  if (s.awaiting === "city" && !patch.city) {
    const c = bareCity(text);
    if (c) { patch.city = c; understood = true; }
  }
  if (s.awaiting === "budget" && !patch.maxPrice) {
    const b = bareBudget(text);
    if (b) { patch.maxPrice = b; understood = true; }
    else if (SKIP.test(text)) { skipped.add("budget"); understood = true; }
  }
  if (s.awaiting === "type" && !patch.type && SKIP.test(text)) { skipped.add("type"); understood = true; }

  // removing a requirement: "no pool", "drop the view", "any budget", "any type"
  if (/\b(no|without|drop|remove|skip)\b[^.]*\bpool\b/i.test(text)) { patch.pool = undefined; understood = true; }
  if (/\b(no|without|drop|remove|skip)\b[^.]*\bviews?\b/i.test(text)) { patch.hasView = undefined; understood = true; }
  if (/\b(any|no)\s+(budget|price)( limit)?\b|\bremove (the )?(budget|price)/i.test(text)) { patch.maxPrice = undefined; skipped.add("budget"); understood = true; }
  if (/\bany (type|kind)\b/i.test(text)) { patch.type = undefined; skipped.add("type"); understood = true; }

  // if we asked a question and got an unrelated answer, stop asking about budget/type again
  if ((s.awaiting === "budget" || s.awaiting === "type") && !understood) skipped.add(s.awaiting === "budget" ? "budget" : "type");

  const merged = updateSession(userId, { ...patch, skipped: [...skipped], awaiting: undefined, page: 1 }, now);

  /* ---- nothing useful in the message ---- */
  if (!understood && s.conversationStep === 0 && !merged.city) {
    const hi = GREETING.test(text) ? "Hi! 👋 I can search California listings for you. " : "";
    return updateAsk(userId, "city", 1, now, `${hi}Which city would you like to search in?`);
  }
  if (!understood && s.conversationStep >= 4) {
    return 'I didn\'t catch a change to your search. Try “under $1M”, “4 beds”, “add a pool”, “more”, or “start over”.';
  }

  /* ---- already searched: refine immediately ---- */
  if (merged.conversationStep >= 4) return runSearch(userId, merged, deps, now);

  /* ---- decide the next question ---- */
  if (!merged.city) return updateAsk(userId, "city", 1, now, "Which city would you like to search in?");

  const extras = [merged.maxPrice, merged.type, merged.beds, merged.baths, merged.sqft, merged.pool, merged.hasView, merged.maxHoa].filter((v) => v != null).length;
  const detailed = extras >= 3; // user already gave a rich query; don't interrogate them

  if (!detailed) {
    if (!merged.maxPrice && !skipped.has("budget")) {
      return updateAsk(userId, "budget", 2, now, `Great, ${merged.city}! What's your budget? (e.g. “under $1.2M”, or say “any”)`);
    }
    if (!merged.type && !skipped.has("type")) {
      return updateAsk(userId, "type", 3, now, "Any preference — condo, townhome, or single family? (or say “any”)");
    }
  }
  return runSearch(userId, merged, deps, now);
}

function updateAsk(userId: string, awaiting: UserSession["awaiting"], step: number, now: number, question: string): string {
  updateSession(userId, { awaiting, conversationStep: step }, now);
  return question;
}

async function runSearch(userId: string, s: UserSession, deps: Deps, now: number): Promise<string> {
  const filters = filtersOf(s);
  let result: Page<ListingRow>;
  try {
    result = await deps.search(filters, s.page, PAGE_SIZE);
  } catch (err) {
    console.error("[conversation] search failed:", err);
    return "Sorry, I couldn't reach the listings database just now. Please try again in a moment.";
  }
  updateSession(userId, { lastResults: result.rows, total: result.total, page: s.page, conversationStep: 4, awaiting: undefined }, now);

  const header = `🔎 ${describeFilters(filters)}`;
  if (s.page > 1 && result.rows.length === 0) {
    updateSession(userId, { page: s.page - 1 }, now);
    return `${header}\n\nThat's all the matches (${result.total}). Try refining, or say “start over”.`;
  }
  if (result.total === 0) {
    return `${header}\n\nNo active listings match. Try raising the budget, lowering beds/baths, or dropping a feature (e.g. “no pool”).`;
  }
  const tip = s.page === 1 && !result.hasMore
    ? "\n\nWant to refine? Try “under $1M”, “4 beds”, “add a pool”, or “start over”."
    : result.hasMore ? "\n\nRefine anytime (“4 beds”, “add a pool”, “under $1M”) or reply “more”." : "";
  return `${header}\n\n${formatListingPage(result)}${tip}`.replace('\n\nReply "more" to see the next page.', "");
}

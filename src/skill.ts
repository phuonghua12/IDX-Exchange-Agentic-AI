import { parsePropertyQuery, hasAnyFilter } from "./parser.js";
import { searchActiveListings, getSoldComps } from "./search.js";
import { formatListingPage, formatSoldList } from "./format.js";

export interface SkillResult { text: string; filters: ReturnType<typeof parsePropertyQuery>; }

/** OpenClaw tool: free-text message -> filters -> parameterized MySQL -> formatted cards. */
export async function handlePropertySearch(message: string, opts: { page?: number } = {}): Promise<SkillResult> {
  const filters = parsePropertyQuery(message);

  if (/\b(sold|comps?|closed|recent sales)\b/i.test(message)) {
    if (!filters.city) return { filters, text: 'Which city should I pull sold comps for? (e.g. "sold homes in Irvine")' };
    return { filters, text: formatSoldList(await getSoldComps(filters.city), filters.city) };
  }
  if (!hasAnyFilter(filters)) {
    return { filters, text: 'Tell me what you\'re looking for, e.g. "3-bedroom condos in Irvine under $1.5M with a pool".' };
  }
  const page = await searchActiveListings(filters, opts.page ?? 1, 5);
  return { filters, text: formatListingPage(page) };
}

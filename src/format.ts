import type { ListingRow, Page, SoldRow } from "./types.js";

const usd = (n: number | null | undefined) => (n == null ? "n/a" : `$${Math.round(Number(n)).toLocaleString("en-US")}`);
const num = (n: number | null | undefined) => (n == null ? "?" : Number(n).toLocaleString("en-US"));

/** WhatsApp-friendly card (*bold* is WhatsApp markup). */
export function formatListingCard(r: ListingRow, i?: number): string {
  const agent = [r.LA1_UserFirstName, r.LA1_UserLastName].filter(Boolean).join(" ");
  const features = [r.PoolPrivateYN === "True" && "Pool", r.ViewYN === "True" && "View", r.FireplaceYN === "True" && "Fireplace"].filter(Boolean).join(", ");
  return [
    `${i != null ? `${i}. ` : ""}*${r.L_Address}*, ${r.L_City} ${r.L_Zip ?? ""}`.trim(),
    `💰 ${usd(r.price)}  •  🛏 ${num(r.beds)} bd  •  🛁 ${num(r.baths)} ba  •  📐 ${num(r.sqft)} sqft`,
    `🏠 ${r.type ?? "n/a"}${r.YearBuilt ? `, built ${r.YearBuilt}` : ""}  •  ${num(r.DaysOnMarket)} days on market`,
    r.AssociationFee ? `HOA ${usd(r.AssociationFee)}/mo` : null,
    features ? `✨ ${features}` : null,
    `📷 ${num(r.PhotoCount)} photos  •  MLS# ${r.L_DisplayId}`,
    agent || r.LO1_OrganizationName ? `👤 ${[agent, r.LO1_OrganizationName].filter(Boolean).join(" — ")}` : null,
  ].filter(Boolean).join("\n");
}

export function formatListingPage(p: Page<ListingRow>): string {
  if (p.total === 0) return "I couldn't find any active listings matching that. Try loosening the price, bedrooms, or features.";
  const start = (p.page - 1) * p.limit;
  const header = `Found *${p.total.toLocaleString("en-US")}* active listings (showing ${start + 1}–${start + p.rows.length}, cheapest first):`;
  const cards = p.rows.map((r, i) => formatListingCard(r, start + i + 1)).join("\n\n");
  return `${header}\n\n${cards}${p.hasMore ? '\n\nReply "more" to see the next page.' : ""}`;
}

export function formatSoldCard(r: SoldRow, i?: number): string {
  const ratio = r.ListPrice ? ` (${((r.ClosePrice / r.ListPrice) * 100).toFixed(1)}% of list)` : "";
  return [
    `${i != null ? `${i}. ` : ""}*${r.UnparsedAddress}*, ${r.City}`,
    `✅ Sold ${usd(r.ClosePrice)}${ratio} on ${r.CloseDate}`,
    `🛏 ${num(r.BedroomsTotal)} bd  •  🛁 ${num(r.BathroomsTotalInteger)} ba  •  📐 ${num(r.LivingArea)} sqft  •  ${num(r.DaysOnMarket)} DOM`,
    `🏠 ${r.PropertySubType ?? r.PropertyType}${r.YearBuilt ? `, built ${r.YearBuilt}` : ""}`,
  ].join("\n");
}

export function formatSoldList(rows: SoldRow[], city: string, max = 5): string {
  if (!rows.length) return `No recent sold comps found for ${city}.`;
  return `Recent sold comps in *${city}* (${rows.length} found, showing ${Math.min(max, rows.length)}):\n\n` +
    rows.slice(0, max).map((r, i) => formatSoldCard(r, i + 1)).join("\n\n");
}

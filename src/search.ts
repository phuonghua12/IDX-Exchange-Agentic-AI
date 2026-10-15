import { query } from "./db.js";
import type { ListingRow, Page, PropertyFilters, SoldRow } from "./types.js";

const LISTING_COLUMNS = `
  L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
  L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
  LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
  LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
  YearBuilt, AssociationFee, DaysOnMarket,
  PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
  LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName`;

/** Build the WHERE clause. Pure function -> unit-testable without a database. */
export function buildActiveWhere(f: PropertyFilters): { where: string; params: unknown[] } {
  const clauses = [`L_Status = 'Active'`];
  const params: unknown[] = [];
  const add = (cond: string, v: unknown) => { clauses.push(cond); params.push(v); };

  if (f.city)     add("L_City = ?", f.city);
  if (f.maxPrice) add("L_SystemPrice <= ?", f.maxPrice);
  if (f.beds)     add("L_Keyword2 >= ?", f.beds);
  if (f.baths)    add("LM_Dec_3 >= ?", f.baths);
  if (f.sqft)     add("LM_Int2_3 >= ?", f.sqft);
  if (f.type)     add("L_Type_ = ?", f.type);
  if (f.pool)     add("PoolPrivateYN = ?", f.pool);
  if (f.hasView)  add("ViewYN = ?", f.hasView);
  if (f.maxHoa != null) add("AssociationFee <= ?", f.maxHoa);

  return { where: clauses.join(" AND "), params };
}

/** LIMIT/OFFSET are validated integers inlined into the SQL: mysql2's execute() (prepared
 *  statements) rejects bound LIMIT params on MySQL >= 8.0.22 ("Incorrect arguments to mysqld_stmt_execute"). */
const int = (n: number, min: number, max: number) => Math.min(Math.max(Math.trunc(Number(n)) || min, min), max);

export function buildActiveListingsQuery(f: PropertyFilters, page = 1, limit = 10) {
  const p = int(page, 1, 10_000);
  const l = int(limit, 1, 50);
  const { where, params } = buildActiveWhere(f);
  return {
    sql: `SELECT ${LISTING_COLUMNS} FROM rets_property WHERE ${where} ORDER BY L_SystemPrice ASC, id ASC LIMIT ${l} OFFSET ${(p - 1) * l}`,
    countSql: `SELECT COUNT(*) AS n FROM rets_property WHERE ${where}`,
    params, page: p, limit: l,
  };
}

export async function searchActiveListings(f: PropertyFilters, page = 1, limit = 10): Promise<Page<ListingRow>> {
  const q = buildActiveListingsQuery(f, page, limit);
  const [rows, count] = await Promise.all([
    query<ListingRow>(q.sql, q.params),
    query<{ n: number }>(q.countSql, q.params),
  ]);
  const total = Number(count[0]?.n ?? 0);
  return { rows, page: q.page, limit: q.limit, total, hasMore: q.page * q.limit < total };
}

/* ---------- Sold comps ---------- */

let latestCloseDate: string | null = null;
/** california_sold covers 2021-2025, so CURDATE()-12 months would return nothing today.
 *  Anchor "last N months" to the newest CloseDate in the data instead. */
export async function getDataAsOf(): Promise<string> {
  if (!latestCloseDate) {
    const r = await query<{ d: string }>("SELECT MAX(CloseDate) AS d FROM california_sold WHERE CloseDate <> ''");
    latestCloseDate = r[0]?.d ?? new Date().toISOString().slice(0, 10);
  }
  return latestCloseDate;
}

export function monthsBefore(isoDate: string, months: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export async function getSoldComps(city: string, months = 12, limit = 50): Promise<SoldRow[]> {
  const cutoff = monthsBefore(await getDataAsOf(), int(months, 1, 120));
  const l = int(limit, 1, 200);
  return query<SoldRow>(
    `SELECT ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
            OriginalListPrice, ListPrice, DaysOnMarket,
            BedroomsTotal, BathroomsTotalInteger, LivingArea,
            PropertyType, PropertySubType, YearBuilt,
            ListAgentFullName, ListOfficeName, BuyerOfficeName
       FROM california_sold
      WHERE City = ? AND CloseDate >= ? AND PropertyType = 'Residential'
      ORDER BY CloseDate DESC LIMIT ${l}`,
    [city, cutoff],
  );
}

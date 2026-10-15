export interface PropertyFilters {
  city?: string | null;
  maxPrice?: number | null;
  beds?: number | null;        // minimum bedrooms  -> rets_property.L_Keyword2
  baths?: number | null;       // minimum bathrooms -> rets_property.LM_Dec_3
  sqft?: number | null;        // minimum sq ft     -> rets_property.LM_Int2_3
  type?: string | null;        // L_Type_
  pool?: "True" | null;        // PoolPrivateYN
  hasView?: "True" | null;     // ViewYN
  maxHoa?: number | null;      // AssociationFee
}

export interface ListingRow {
  L_ListingID: string; L_DisplayId: string; L_Address: string; L_City: string; L_Zip: string;
  price: number; beds: number | null; baths: number | null; sqft: number | null;
  type: string; status: string; lat: number | null; lng: number | null;
  YearBuilt: number | null; AssociationFee: number | null; DaysOnMarket: number | null;
  PoolPrivateYN: string | null; ViewYN: string | null; FireplaceYN: string | null;
  PhotoCount: number | null;
  LA1_UserFirstName: string | null; LA1_UserLastName: string | null; LO1_OrganizationName: string | null;
}

export interface SoldRow {
  ListingKey: number; UnparsedAddress: string; City: string; CloseDate: string; ClosePrice: number;
  OriginalListPrice: number | null; ListPrice: number | null; DaysOnMarket: number | null;
  BedroomsTotal: number | null; BathroomsTotalInteger: number | null; LivingArea: number | null;
  PropertyType: string; PropertySubType: string | null; YearBuilt: number | null;
  ListAgentFullName: string | null; ListOfficeName: string | null; BuyerOfficeName: string | null;
}

export interface Page<T> { rows: T[]; page: number; limit: number; total: number; hasMore: boolean; }

/**
 * ListMyNest — shared TypeScript types (PRD / TRD / README API contracts).
 * Public property payloads never include seller_phone or agent_phone.
 */

/** Property lifecycle & visibility (README / TRD) */
export type PropertyStatus =
  | "NEW"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "SOLD"
  | "INACTIVE"
  | "ARCHIVED";

export type PropertyType =
  | "RESIDENTIAL"
  | "PLOT"
  | "COMMERCIAL"
  | "AGRICULTURAL";

/** Lead logging (TRD POST /leads) */
export type LeadActionType =
  | "CALL"
  | "WHATSAPP"
  | "VISIT_REQUEST"
  | "NOTIFY_ME";

export type VisitStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "VISITED"
  | "NOT_VISITED"
  | "CANCELLED"
  | "RESCHEDULED";

export type WaIntent = "HOT" | "WARM" | "COLD";

export type UserRole = "SELLER" | "AGENT" | "BUYER" | "ADMIN";

/** Paginated list wrapper (TRD GET /properties) */
export type PaginationMeta = {
  page: number;
  size: number;
  total: number;
  total_pages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

/**
 * Card / list row — GET /properties, /featured, /search.
 * agent_id may appear on detail (TRD); never agent_phone.
 */
export type PropertyListItem = {
  id: string;
  title: string;
  type: PropertyType | string;
  city: string;
  locality: string;
  price_min: number;
  price_max: number;
  area_sqft: number;
  configuration: string;
  verified: boolean;
  status: PropertyStatus | string;
  primary_photo: string | null;
  photo_count: number;
  view_count: number;
  created_at: string;
  agent_id?: string;
};

/** Alias for UI cards — API list row (never includes seller_phone / agent_phone). */
export type Property = PropertyListItem;

export type PropertyPhoto = {
  id: string;
  url: string;
  storage_path?: string;
  is_primary: boolean;
  gps_flagged?: boolean;
  sort_order?: number;
};

/**
 * Full detail — superset for GET /properties/{id}.
 * Backend may omit optional fields; adjust as OpenAPI lands.
 */
export type PropertyDetail = PropertyListItem & {
  description?: string | null;
  bathrooms?: number | null;
  possession_status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** E.164 voice number from GET /properties/{id} (agent, else seller). */
  contact_phone?: string | null;
  /** Public code e.g. LMN-BDR-00142 */
  property_code?: string | null;
  photos?: PropertyPhoto[];
  enquiry_count?: number;
  visits_this_week?: number;
  floor?: string | null;
  facing?: string | null;
};

export type PropertyListQuery = {
  city?: string;
  type?: string;
  price_min?: number;
  price_max?: number;
  page?: number;
  size?: number;
};

export type PropertySearchQuery = {
  q: string;
  city?: string;
  page?: number;
  size?: number;
};

export type CreatePropertyPayload = {
  title: string;
  type: PropertyType | string;
  city: string;
  locality: string;
  price_min: number;
  price_max: number;
  area_sqft: number;
  configuration: string;
  bathrooms?: number;
  possession_status?: string;
  description?: string;
  address?: string;
};

export type UpdatePropertyPayload = Partial<CreatePropertyPayload>;

export type UpdatePropertyStatusPayload = {
  status: PropertyStatus | string;
};

export type RecordPropertyViewPayload = {
  session_hash: string;
  city: string;
};

export type PhotoUploadUrlResponse = {
  upload_url: string;
  storage_path: string;
};

export type RegisterPhotoPayload = {
  storage_url: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  is_primary?: boolean;
};

export type CreateLeadPayload = {
  property_id: string;
  action_type: LeadActionType;
  session_hash: string;
  city: string;
  buyer_phone?: string;
};

export type WhatsAppLinkResponse = {
  wa_url: string;
};

/**
 * POST /visits — README/TRD: visit_date, visit_time, buyer_phone.
 * preferred_* duplicates the same values when the API expects those names.
 */
export type ScheduleVisitPayload = {
  property_id: string;
  visit_date: string;
  visit_time: string;
  buyer_phone: string;
  session_hash?: string;
  preferred_date?: string;
  preferred_time?: string;
};

export type Visit = {
  id: string;
  property_id: string;
  buyer_phone: string;
  visit_date: string;
  visit_time: string;
  status: VisitStatus | string;
  notes?: string | null;
  post_visit_wa_sent?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UpdateVisitStatusPayload = {
  status: VisitStatus | string;
  notes?: string;
};

export type RescheduleVisitPayload = {
  visit_date: string;
  visit_time: string;
};

export type VisitListQuery = {
  date?: string;
  status?: string;
};

export type SaveListingPayload = {
  property_id: string;
};

export type SavedListing = {
  id: string;
  property_id: string;
  saved_at: string;
};

export type NotifyMePayload = {
  phone: string;
  city: string;
};

export type NotifyMeResponse = {
  success?: boolean;
  message?: string;
};

export type SendOtpPayload = {
  phone: string;
};

export type VerifySellerAgentOtpPayload = {
  phone: string;
  otp: string;
};

export type AuthVerifyResponse = {
  access_token: string;
  refresh_token?: string;
  role: UserRole | string;
  user_id: string;
  expires_in?: number;
};

export type VerifyBuyerOtpPayload = VerifySellerAgentOtpPayload;

export type BuyerAuthResponse = {
  buyer_token: string;
  buyer_id: string;
  expires_in?: number;
};

export type AdminLoginPayload =
  | { email: string; password: string }
  | { phone: string; otp: string };

export type AdminAuthResponse = {
  access_token: string;
  expires_in?: number;
  admin_id?: string;
};

export type AgentMeProfile = {
  id: string;
  name?: string;
  phone?: string;
  active?: boolean;
  assigned_cities?: string[];
  /** Never rely on this for buyer-facing UI */
  stats?: Record<string, unknown>;
};

export type SellerMeProfile = {
  id: string;
  name?: string;
  phone?: string;
  listing_count?: number;
};

export type AgentDashboard = Record<string, unknown>;

/** GET /sellers/me/dashboard — field names may vary by backend. */
export type SellerDashboard = {
  active_listings?: number;
  total_enquiries?: number;
  month_views?: number;
  views_this_month?: number;
  this_month_views?: number;
} & Record<string, unknown>;

export type AgentStatusPayload = {
  active: boolean;
};

export type AgentFcmTokenPayload = {
  fcm_token: string;
};

export type Lead = {
  id: string;
  property_id: string;
  action_type: LeadActionType | string;
  city?: string;
  session_hash?: string;
  created_at?: string;
  /** Present in some feeds — never render in UI (workspace rules). */
  buyer_phone?: string | null;
  wa_intent?: WaIntent | null;
  buyer_id?: string | null;
  property_title?: string;
};

export type LeadListQuery = {
  property_id?: string;
  action_type?: string;
  date_from?: string;
};

export type SellerEnquirySummary = Record<string, unknown>;

export type AdminPropertyQuery = {
  status?: string;
  city?: string;
  agent_id?: string;
};

export type AdminPatchPropertyStatusPayload = {
  status: PropertyStatus | string;
};

export type CreateAdminAgentPayload = {
  name: string;
  phone: string;
  whatsapp_number: string;
  assigned_cities: string[];
};

export type PatchAdminAgentPayload = Partial<
  Pick<CreateAdminAgentPayload, "assigned_cities"> & { active: boolean }
>;

export type CreateAdminSellerPayload = {
  name: string;
  phone: string;
};

export type AdminAuditLogQuery = {
  admin_id?: string;
  entity_type?: string;
  date_from?: string;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  status?: number;
  [key: string]: unknown;
};

export type ImpersonateSellerResponse = {
  access_token: string;
  seller_id: string;
  expires_in?: number;
};

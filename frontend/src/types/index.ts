export interface ProductConfig {
  id: string;
  product_id: string;
  step: number;
  floor_price: number;
  auto_reprice: boolean;
  check_interval_minutes: number;
  updated_at: string;
}

export interface Product {
  id: string;
  omarket_url: string;
  omarket_sku_id: string | null;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  config: ProductConfig | null;
  our_price: number | null;
  min_competitor_price: number | null;
  last_checked_at: string | null;
  status: "winning" | "losing" | "floor" | "error" | "unknown" | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface Competitor {
  seller: string;
  price: number;
  in_stock: boolean;
}

export interface PriceSnapshot {
  id: string;
  product_id: string;
  captured_at: string;
  our_price: number | null;
  min_competitor_price: number | null;
  competitor_count: number | null;
  raw_competitors: Competitor[] | null;
  scan_duration_ms: number | null;
  error: string | null;
}

export interface PriceChange {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  reason: string;
  status: "pending" | "success" | "failed" | "skipped";
  error_message: string | null;
  attempted_at: string;
  completed_at: string | null;
}

export interface PriceHistoryPoint {
  captured_at: string;
  our_price: number | null;
  min_competitor_price: number | null;
}

export interface DashboardSummary {
  total_products: number;
  winning_products: number;
  changes_today: number;
  floor_products: number;
  error_products: number;
  paused_products: number;
}

export interface Notification {
  id: string;
  product_id: string | null;
  type: "price_updated" | "floor_reached" | "scan_error" | "login_required";
  message: string;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
}

export interface SessionStatus {
  is_valid: boolean;
  account_login: string | null;
  last_login_at: string | null;
  last_used_at: string | null;
}

export interface AnalyticsOverview {
  win_rate_pct: number;
  avg_reprice_response_min: number;
  competitors_tracked: number;
  total_price_changes_30d: number;
  revenue_impact_tenge: number;
  products_winning: number;
  products_total_with_data: number;
}

export interface WinRatePoint {
  date: string;
  win_rate: number;
  winning: number;
  total: number;
}

export interface PriceChangeTrendPoint {
  date: string;
  changes: number;
  price_movement: number;
}

export interface CompetitorEntry {
  seller: string;
  appearances: number;
  avg_price: number;
  products_count: number;
  times_undercut: number;
  last_seen: string | null;
  aggression: "low" | "medium" | "high";
}

export interface ActivityFeedItem {
  id: string;
  product_id: string;
  product_name: string;
  old_price: number;
  new_price: number;
  reason: string;
  attempted_at: string;
}

export interface WsEvent {
  type: string;
  product_id: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  notification_id: string | null;
  created_at: string;
}

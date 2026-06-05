export const productKeys = {
  all: ["products"] as const,
  list: (filters: Record<string, unknown> = {}) => ["products", "list", filters] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  config: (id: string) => ["products", id, "config"] as const,
  snapshots: (id: string) => ["products", id, "snapshots"] as const,
  history: (id: string, days: number) => ["products", id, "history", days] as const,
  changes: (id: string) => ["products", id, "changes"] as const,
};

export const dashboardKeys = {
  summary: ["dashboard", "summary"] as const,
};

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: Record<string, unknown> = {}) => ["notifications", "list", params] as const,
};

export const sessionKeys = {
  status: ["session", "status"] as const,
};

export const analyticsKeys = {
  overview: ["analytics", "overview"] as const,
  winRateTrend: ["analytics", "win-rate-trend"] as const,
  priceChangesTrend: ["analytics", "price-changes-trend"] as const,
  competitors: ["analytics", "competitors"] as const,
  activityFeed: ["analytics", "activity-feed"] as const,
};

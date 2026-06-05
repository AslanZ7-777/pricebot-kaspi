import { apiClient } from "./client";
import type {
  DashboardSummary,
  SessionStatus,
  AnalyticsOverview,
  WinRatePoint,
  PriceChangeTrendPoint,
  CompetitorEntry,
  ActivityFeedItem,
} from "@/types";

export const dashboardApi = {
  getSummary: () =>
    apiClient.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
};

export const analyticsApi = {
  getOverview: () =>
    apiClient.get<AnalyticsOverview>("/analytics/overview").then((r) => r.data),
  getWinRateTrend: () =>
    apiClient.get<WinRatePoint[]>("/analytics/win-rate-trend").then((r) => r.data),
  getPriceChangesTrend: () =>
    apiClient.get<PriceChangeTrendPoint[]>("/analytics/price-changes-trend").then((r) => r.data),
  getCompetitors: () =>
    apiClient.get<CompetitorEntry[]>("/analytics/competitors").then((r) => r.data),
  getActivityFeed: () =>
    apiClient.get<ActivityFeedItem[]>("/analytics/activity-feed").then((r) => r.data),
  seedDemo: () =>
    apiClient.post("/demo/seed").then((r) => r.data),
  clearDemo: () =>
    apiClient.post("/demo/clear").then((r) => r.data),
};

export const sessionApi = {
  getStatus: () =>
    apiClient.get<SessionStatus>("/session/status").then((r) => r.data),

  login: () =>
    apiClient.post("/session/login").then((r) => r.data),

  logout: () =>
    apiClient.post("/session/logout").then((r) => r.data),
};

import axios from "axios";

const API_KEY = import.meta.env.VITE_API_KEY ?? "dev_api_key_change_in_production";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export const apiClient = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
});

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
      error.message = detail.map((d: { msg: string }) => d.msg).join("; ");
    } else if (typeof detail === "string") {
      error.message = detail;
    }
    return Promise.reject(error);
  }
);

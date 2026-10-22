const apiUrl = import.meta.env.VITE_API_URL?.trim();
const wsUrl = import.meta.env.VITE_WS_URL?.trim();

export const API_BASE_URL = apiUrl ? apiUrl.replace(/\/+$/, "") : "";
export const WS_BASE_URL = wsUrl
  ? wsUrl.replace(/\/+$/, "")
  : API_BASE_URL.replace(/^http/, "ws");

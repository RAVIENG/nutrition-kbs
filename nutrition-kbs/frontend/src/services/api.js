import axios from "axios";
import { createReadRequestManager, formatApiError } from "./readRequestManager";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
const baseURL = configuredApiUrl
  ? configuredApiUrl.toLowerCase().endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : "/api";
const api = axios.create({
  baseURL,
  withCredentials: true,
});
const readRequests = createReadRequestManager();
const rawGet = api.get.bind(api);

const serializeParams = (params) => {
  if (!params) return "";
  if (params instanceof URLSearchParams) return JSON.stringify([...params.entries()].sort());
  return JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
};

// Share in-flight GETs (including React StrictMode's development replay) and
// briefly cache successful reads. A mutation clears the cache below.
api.get = (url, config = {}) => {
  if (config.signal || config.cache === false) return rawGet(url, config);
  const { cache: _cache, ...axiosConfig } = config;
  const key = `${url}?${serializeParams(config.params)}`;
  return readRequests.get(key, () => rawGet(url, axiosConfig));
};

let csrfToken = "";
let csrfRequest = null;

const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get(`${baseURL}/auth/csrf`, { withCredentials: true })
      .then(({ data }) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
};

api.interceptors.request.use(async (config) => {
  if (
    ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
  ) {
    config.headers.set("X-CSRF-Token", await getCsrfToken());
  }
  return config;
});

// Use the server's message while keeping Axios response/status details available.
api.interceptors.response.use(
  (response) => {
    if (response.config.method?.toLowerCase() !== "get") {
      readRequests.clear();
      if (response.config.url?.startsWith("/tracking/entries")) {
        window.dispatchEvent(new Event("nutrition-log-updated"));
      }
    }
    return response;
  },
  (error) => {
    const body = error.response?.data;
    const objectBody = body && typeof body === "object" ? body : null;
    const message = objectBody?.message;
    if (objectBody && message) objectBody.backendMessage = message;
    const userMessage = formatApiError(error);
    if (objectBody) objectBody.message = userMessage;
    error.userMessage = userMessage;
    error.message = userMessage;
    return Promise.reject(error);
  },
);

export default api;

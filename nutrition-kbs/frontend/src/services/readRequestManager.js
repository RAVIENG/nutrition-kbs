const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryAfterMilliseconds = (error) => {
  const headers = error.response?.headers;
  const value = headers?.get?.("retry-after") ?? headers?.["retry-after"];
  if (value == null) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
};

export const createReadRequestManager = ({
  ttlMs = 10_000,
  maxEntries = 100,
  maxRetries = 2,
  maxRetryDelayMs = 2_000,
  baseDelayMs = 250,
  sleep = wait,
} = {}) => {
  const cache = new Map();
  const inFlight = new Map();
  let generation = 0;

  const requestWithBackoff = async (request) => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        if (error.response?.status !== 429 || attempt >= maxRetries) throw error;
        const serverDelay = retryAfterMilliseconds(error);
        const delay = serverDelay ?? baseDelayMs * (2 ** attempt);
        // Do not hammer an endpoint whose server says to wait a long time.
        if (delay > maxRetryDelayMs) throw error;
        await sleep(delay);
      }
    }
  };

  return {
    get(key, request) {
      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
      if (cached) cache.delete(key);
      if (inFlight.has(key)) return inFlight.get(key);

      const requestGeneration = generation;
      const pending = requestWithBackoff(request)
        .then((value) => {
          if (requestGeneration === generation) {
            cache.set(key, { value, expiresAt: Date.now() + ttlMs });
            if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
          }
          return value;
        })
        .finally(() => {
          if (inFlight.get(key) === pending) inFlight.delete(key);
        });
      inFlight.set(key, pending);
      return pending;
    },
    clear() {
      cache.clear();
      inFlight.clear();
      generation += 1;
    },
  };
};

export const formatApiError = (error) => {
  const status = error.response?.status;
  const message = error.response?.data?.backendMessage ?? error.response?.data?.message;
  const path = typeof error.config?.url === "string"
    ? ` on ${error.config.url.split("?", 1)[0]}`
    : "";
  if (!error.response) {
    return "Cannot reach the Nutrition KBS backend. Check that it is running and VITE_API_URL is correct.";
  }
  if (status === 429) {
    return `Backend rate limit reached${path} (HTTP 429): ${message || "Too many requests"}. Please wait before retrying.`;
  }
  const provider = typeof message === "string" && /\b(Gemini|FoodTales|USDA)\b/i.exec(message)?.[1];
  if (provider) return `${provider} service${path} (HTTP ${status}): ${message}`;
  if (status === 401) return `Your session is not authorized${path} (HTTP 401). Please sign in again.`;
  return `Backend request failed${path} (HTTP ${status}): ${message || "The request could not be completed."}`;
};

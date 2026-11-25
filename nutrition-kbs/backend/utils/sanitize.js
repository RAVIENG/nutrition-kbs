// Recursively removes keys starting with "$" or containing "." from an object
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      result[key] = clean(val);
    }
    return result;
  }
  return value;
};

// Express middleware: sanitizes body, params and query
const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  // In Express 5 req.query is read-only, so mutate in place instead of reassigning
  if (req.query) {
    const cleaned = clean(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, cleaned);
  }
  next();
};

export default sanitizeInput;

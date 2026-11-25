// Wraps an async controller so that any thrown error is passed to the
// error middleware automatically (no try/catch needed in every controller).
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;

// A custom error that carries an HTTP status code.
// Usage anywhere in the backend:  throw new ApiError(404, 'Food not found');
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export default ApiError;

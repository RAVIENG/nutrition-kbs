import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

// Place after a list of express-validator checks. Stops the request if any failed.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    return next(new ApiError(400, message));
  }
  next();
};

export default validate;

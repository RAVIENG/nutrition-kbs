import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../validators/validate.js";
import {
  profileRules,
  deleteAccountRules,
} from "../validators/profileValidator.js";
import {
  getOptions,
  getProfile,
  updateProfile,
  deleteAccount,
} from "../controllers/userController.js";

const router = express.Router();

router.use(protect); // every route below requires login

router.get("/options", getOptions);
router.get("/profile", getProfile);
router.put("/profile", profileRules, validate, updateProfile);
router.delete("/account", deleteAccountRules, validate, deleteAccount);

export default router;

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { changePassword, getSession, signIn, signOut, signUp, updateProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { changePasswordSchema, signInSchema, signUpSchema, updateProfileSchema } from "../validation/authSchemas.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." },
});

router.post("/sign-up/email", authLimiter, validate(signUpSchema), signUp);
router.post("/sign-in/email", authLimiter, validate(signInSchema), signIn);
router.get("/get-session", authenticate, getSession);
router.post("/update-user", authenticate, validate(updateProfileSchema), updateProfile);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.post("/sign-out", signOut);

export default router;

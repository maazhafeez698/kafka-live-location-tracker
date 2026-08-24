import { Router } from "express";
import * as Controller from "./auth.controller.js";
import RegisterDto from "./dto/register.dto.js";
import validate from "../../common/middleware/validate.middleware.js";
import LoginDto from "./dto/login.dto.js";
import { authenticate } from "./auth.middleware.js";
import ForgotPasswordDto from "./dto/forgot-password.dto.js";
import ResetPasswordDto from "./dto/reset-password.dto.js";

const router = Router();

router.post("/signup", validate(RegisterDto), Controller.signup);
router.post("/signin", validate(LoginDto), Controller.signin);
router.post("/refresh-token", Controller.refreshToken);
router.post("/logout", authenticate, Controller.logout);
router.get("/verify-email/:token", Controller.verifyEmail);
router.post(
  "/forgot-password",
  validate(ForgotPasswordDto),
  Controller.forgotPassword,
);
router.put(
  "/reset-password/:token",
  validate(ResetPasswordDto),
  Controller.resetPassword,
);
router.get("/me", authenticate, Controller.getMe);

export default router;

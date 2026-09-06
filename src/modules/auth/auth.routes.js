import { Router } from "express";
import * as Controller from "./auth.controller.js";
import RegisterDto from "./dto/register.dto.js";
import validate from "../../common/middleware/validate.middleware.js";
import LoginDto from "./dto/login.dto.js";
import { authenticate } from "./auth.middleware.js";

const router = Router();

router.post("/signup", validate(RegisterDto), Controller.signup);
router.post("/signin", validate(LoginDto), Controller.signin);
router.post("/logout", authenticate, Controller.logout);
router.get("/verify-email/:token", Controller.verifyEmail);
router.get("/me", authenticate, Controller.getMe);

export default router;

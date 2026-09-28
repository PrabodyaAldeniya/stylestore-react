import express from "express";
import rateLimit from "express-rate-limit";
import {
  authenticateAdmin,
  endAdminSession,
  getAdminStatus,
  isAdminConfigured,
  startAdminSession,
} from "../lib/auth.js";

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_ATTEMPTS",
    message: "Too many sign-in attempts. Try again later.",
  },
});

router.get("/me", (req, res) => {
  res.json({ success: true, ...getAdminStatus(req) });
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    if (!isAdminConfigured()) {
      return res.status(503).json({
        success: false,
        code: "ADMIN_NOT_CONFIGURED",
        message: "Admin access is not configured yet.",
      });
    }
    const username = typeof req.body?.username === "string" ? req.body.username : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!username || !password || !(await authenticateAdmin(username, password))) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Username or password is incorrect.",
      });
    }
    startAdminSession(res, username);
    return res.json({ success: true, authenticated: true, username });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  endAdminSession(req, res);
  res.json({ success: true, authenticated: false });
});

export default router;

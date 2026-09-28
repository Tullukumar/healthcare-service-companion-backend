const express = require("express");

const {
  registerUser,
  registerUserAfterVerification,
  loginUser,
  loginUserAfterVerification,
  forgotPassword,
  resetPassword,
  resetPasswordAfterVerification,
} = require("../controllers/authController");

const {
  authLimiter,
} = require("../middleware/rateLimitMiddleware");

const validate = require("../middleware/validationMiddleware");

const {
  registerSchema,
  registerVerifiedSchema,
  loginSchema,
  loginVerifiedSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordVerifiedSchema,
} = require("../validators/authValidator");

const router = express.Router();

// ==========================================
// NORMAL REGISTER
// ==========================================

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  registerUser
);

// ==========================================
// REGISTER AFTER OTP
// ==========================================

router.post(
  "/register-verified",
  authLimiter,
  validate(registerVerifiedSchema),
  registerUserAfterVerification
);

// ==========================================
// NORMAL LOGIN
// ==========================================

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  loginUser
);

// ==========================================
// LOGIN AFTER OTP
// ==========================================

router.post(
  "/login-verified",
  authLimiter,
  validate(loginVerifiedSchema),
  loginUserAfterVerification
);

// ==========================================
// FORGOT PASSWORD
// ==========================================

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

// ==========================================
// RESET PASSWORD WITH TOKEN
// ==========================================

router.post(
  "/reset-password/:token",
  authLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

// ==========================================
// RESET PASSWORD AFTER OTP
// ==========================================

router.post(
  "/reset-password-verified",
  authLimiter,
  validate(resetPasswordVerifiedSchema),
  resetPasswordAfterVerification
);

module.exports = router;
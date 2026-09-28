const express = require("express");

const {
  sendOTP,
  verifyOTP,
} = require("../controllers/otpController");

const {
  authLimiter,
} = require("../middleware/rateLimitMiddleware");

const validate = require("../middleware/validationMiddleware");

const {
  sendOTPSchema,
  verifyOTPSchema,
} = require("../validators/authValidator");

const router = express.Router();

// ===============================
// SEND OTP
// ===============================

router.post(
  "/send",
  authLimiter,
  validate(sendOTPSchema),
  sendOTP
);

// ===============================
// VERIFY OTP
// ===============================

router.post(
  "/verify",
  authLimiter,
  validate(verifyOTPSchema),
  verifyOTP
);

module.exports = router;
const crypto = require("crypto");
const OTP = require("../models/OTP");

// ==========================================
// GENERATE OTP
// ==========================================

const generateOTP = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

// ==========================================
// HASH OTP
// ==========================================

const hashOTP = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

// ==========================================
// SEND OTP
// ==========================================

const sendOTP = async (req, res) => {
  try {
    const {
      identifier,
      type,
      purpose,
    } = req.body;

    // ==========================================
    // CHECK REQUIRED FIELDS
    // ==========================================

    if (
      !identifier ||
      !type ||
      !purpose
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifier, type and purpose are required.",
      });
    }

    // ==========================================
    // CHECK TYPE
    // ==========================================

    if (
      !["email", "phone"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type must be email or phone.",
      });
    }

    // ==========================================
    // CHECK PURPOSE
    // ==========================================

    if (
      ![
        "register",
        "login",
        "forgot-password",
      ].includes(purpose)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid OTP purpose.",
      });
    }

    // ==========================================
    // NORMALIZE IDENTIFIER
    // ==========================================

    const normalizedIdentifier =
      type === "email"
        ? identifier.trim().toLowerCase()
        : identifier.trim();

    // ==========================================
    // GENERATE OTP
    // ==========================================

    const otp = generateOTP();

    // ==========================================
    // HASH OTP BEFORE STORAGE
    // ==========================================

    const hashedOTP = hashOTP(otp);

    // ==========================================
    // OTP EXPIRATION
    // ==========================================

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // ==========================================
    // REMOVE PREVIOUS OTP
    // ==========================================

    await OTP.deleteMany({
      identifier: normalizedIdentifier,
      purpose,
    });

    // ==========================================
    // SAVE HASHED OTP
    // ==========================================

    await OTP.create({
      identifier: normalizedIdentifier,
      otp: hashedOTP,
      type,
      purpose,
      expiresAt,
      attempts: 0,
    });

    // ==========================================
    // DEVELOPMENT MODE
    // ==========================================

    console.log(
      `OTP for ${normalizedIdentifier}: ${otp}`
    );

    return res.status(200).json({
      success: true,
      message:
        `OTP sent successfully to your ${type}.`,

      ...(process.env.NODE_ENV !==
        "production" && {
        developmentOTP: otp,
      }),
    });
  } catch (error) {
    console.error(
      "Send OTP error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while sending OTP.",
    });
  }
};

// ==========================================
// VERIFY OTP
// ==========================================

const verifyOTP = async (req, res) => {
  try {
    const {
      identifier,
      type,
      purpose,
      otp,
    } = req.body;

    // ==========================================
    // CHECK REQUIRED FIELDS
    // ==========================================

    if (
      !identifier ||
      !type ||
      !purpose ||
      !otp
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifier, type, purpose and OTP are required.",
      });
    }

    // ==========================================
    // NORMALIZE IDENTIFIER
    // ==========================================

    const normalizedIdentifier =
      type === "email"
        ? identifier.trim().toLowerCase()
        : identifier.trim();

    // ==========================================
    // FIND ACTIVE OTP
    // ==========================================

    const otpRecord =
      await OTP.findOne({
        identifier:
          normalizedIdentifier,
        type,
        purpose,
        verified: false,
      });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP. Please request a new OTP.",
      });
    }

    // ==========================================
    // CHECK EXPIRATION
    // ==========================================

    if (
      otpRecord.expiresAt <
      new Date()
    ) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    // ==========================================
    // CHECK MAXIMUM ATTEMPTS
    // ==========================================

    const MAX_ATTEMPTS = 5;

    if (
      otpRecord.attempts >=
      MAX_ATTEMPTS
    ) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    // ==========================================
    // HASH SUBMITTED OTP
    // ==========================================

    const hashedOTP = hashOTP(
      otp.toString()
    );

    // ==========================================
    // CHECK OTP
    // ==========================================

    if (
      hashedOTP !== otpRecord.otp
    ) {
      // Increment failed attempts
      otpRecord.attempts += 1;

      // Delete OTP after final failed attempt
      if (
        otpRecord.attempts >=
        MAX_ATTEMPTS
      ) {
        await otpRecord.deleteOne();

        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect OTP attempts. Please request a new OTP.",
        });
      }

      await otpRecord.save();

      const remainingAttempts =
        MAX_ATTEMPTS -
        otpRecord.attempts;

      return res.status(400).json({
        success: false,
        message:
          `Invalid OTP. ${remainingAttempts} attempt${
            remainingAttempts === 1
              ? ""
              : "s"
          } remaining.`,
      });
    }

    // ==========================================
    // OTP IS CORRECT
    // ==========================================

    const verificationToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    otpRecord.verified = true;

    otpRecord.verificationToken =
      verificationToken;

    await otpRecord.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully.",
      verificationToken,
    });
  } catch (error) {
    console.error(
      "Verify OTP error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while verifying OTP.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendOTP,
  verifyOTP,
};


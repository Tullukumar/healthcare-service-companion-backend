const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    otp: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },

    purpose: {
      type: String,
      enum: [
        "register",
        "login",
        "forgot-password",
      ],
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: "",
    },

    // Maximum OTP verification attempts
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically delete expired OTP documents
otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "OTP",
  otpSchema
);
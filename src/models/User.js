const mongoose = require("mongoose");

// ==========================================
// USER SCHEMA
// ==========================================

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    // ==========================================
    // PASSWORD
    // ==========================================

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: true,
    },

    // ==========================================
    // ROLE
    // ==========================================

    role: {
      type: String,
      enum: [
        "patient",
        "doctor",
        "admin",
        "ambulance",
      ],
      default: "patient",
    },

    // ==========================================
    // DOCTOR / ACCOUNT STATUS
    // ==========================================

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // LOGIN SECURITY
    // ==========================================

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    // ==========================================
    // JWT SECURITY
    // ==========================================

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// EXPORT
// ==========================================

module.exports = mongoose.model(
  "User",
  userSchema
);
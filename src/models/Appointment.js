const mongoose = require("mongoose");

// ======================================================
// APPOINTMENT SCHEMA
// ======================================================

const appointmentSchema = new mongoose.Schema(
  {
    // ====================================================
    // PATIENT
    // ====================================================

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ====================================================
    // DOCTOR
    // ====================================================

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: true,
    },

    // ====================================================
    // APPOINTMENT DATE
    // ====================================================

    date: {
      type: String,
      required: true,
      trim: true,
    },

    // ====================================================
    // APPOINTMENT TIME
    // ====================================================

    time: {
      type: String,
      required: true,
      trim: true,
    },

    // ====================================================
    // REASON FOR APPOINTMENT
    // ====================================================

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    // ====================================================
    // CONSULTATION FEE
    // ====================================================

    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ====================================================
    // APPOINTMENT STATUS
    // ====================================================

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    // ====================================================
    // PAYMENT STATUS
    // ====================================================

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "pending",
    },

    // ====================================================
    // PAYMENT ORDER ID
    // ====================================================

    paymentOrderId: {
      type: String,
      default: "",
      trim: true,
    },

    // ====================================================
    // PAYMENT ID
    // ====================================================

    paymentId: {
      type: String,
      default: "",
      trim: true,
    },

    // ====================================================
    // PAYMENT SIGNATURE
    // ====================================================

    paymentSignature: {
      type: String,
      default: "",
      trim: true,
    },
  },

  // ======================================================
  // TIMESTAMPS
  // ======================================================

  {
    timestamps: true,
  }
);

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);
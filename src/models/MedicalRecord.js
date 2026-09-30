const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    // ==========================================
    // PATIENT
    // ==========================================

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==========================================
    // DOCTOR
    // ==========================================

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: true,
    },

    // ==========================================
    // RELATED APPOINTMENT
    // ==========================================

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    // ==========================================
    // MEDICAL INFORMATION
    // ==========================================

    diagnosis: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    symptoms: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    allergies: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    medications: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    medicalHistory: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    // ==========================================
    // FOLLOW-UP
    // ==========================================

    followUpDate: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "MedicalRecord",
  medicalRecordSchema
);
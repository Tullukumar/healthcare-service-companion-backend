const mongoose = require("mongoose");

const sevaRequestSchema = new mongoose.Schema(
  {
    // ==========================================
    // PATIENT
    // ==========================================

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // REQUEST TYPE
    // ==========================================

    requestType: {
      type: String,
      enum: [
        "FREE_TREATMENT",
        "FINANCIAL_ASSISTANCE",
        "MEDICINE",
        "MEDICAL_EQUIPMENT",
        "BLOOD",
      ],
      required: true,
    },

    // ==========================================
    // REQUEST TITLE
    // ==========================================

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // ==========================================
    // DESCRIPTION
    // ==========================================

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // ==========================================
    // MEDICAL CONDITION
    // ==========================================

    medicalCondition: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    // ==========================================
    // HOSPITAL
    // ==========================================

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },

    // ==========================================
    // REQUIRED AMOUNT
    // Used for financial/treatment assistance
    // ==========================================

    requiredAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ==========================================
    // RECEIVED AMOUNT
    // ==========================================

    receivedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ==========================================
    // MEDICINE DETAILS
    // ==========================================

    medicineDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // ==========================================
    // EQUIPMENT DETAILS
    // ==========================================

    equipmentDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // ==========================================
    // BLOOD GROUP
    // ==========================================

    bloodGroup: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    // ==========================================
    // URGENCY
    // ==========================================

    urgency: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "EMERGENCY",
      ],
      default: "MEDIUM",
    },

    // ==========================================
    // REQUEST STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    // ==========================================
    // ADMIN REVIEW
    // ==========================================

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // ==========================================
    // ADDITIONAL NOTES
    // ==========================================

    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // ==========================================
    // SUPPORT DEADLINE
    // ==========================================

    supportDeadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

sevaRequestSchema.index({
  patient: 1,
  status: 1,
});

sevaRequestSchema.index({
  requestType: 1,
  status: 1,
});

sevaRequestSchema.index({
  hospital: 1,
  status: 1,
});

sevaRequestSchema.index({
  urgency: 1,
  status: 1,
});

// ==========================================
// MODEL
// ==========================================

const SevaRequest = mongoose.model(
  "SevaRequest",
  sevaRequestSchema
);

module.exports = SevaRequest;
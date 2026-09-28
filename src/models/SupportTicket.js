// ==========================================
// SUPPORT TICKET MODEL
// ==========================================

const mongoose = require("mongoose");

// ==========================================
// SUPPORT MESSAGE SCHEMA
// ==========================================

const supportMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

// ==========================================
// SUPPORT TICKET SCHEMA
// ==========================================

const supportTicketSchema = new mongoose.Schema(
  {
    // ========================================
    // PATIENT
    // ========================================

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ========================================
    // HOSPITAL
    // ========================================

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
      index: true,
    },

    // ========================================
    // SUPPORT CATEGORY
    // ========================================

    category: {
      type: String,
      enum: [
        "PAYMENT",
        "DOCTOR",
        "APPOINTMENT",
        "HOSPITAL",
        "MEDICINE",
        "OTHER",
      ],
      required: true,
    },

    // ========================================
    // SUBJECT
    // ========================================

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // ========================================
    // PROBLEM DESCRIPTION
    // ========================================

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // ========================================
    // PRIORITY
    // ========================================

    priority: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
      ],
      default: "MEDIUM",
    },

    // ========================================
    // STATUS
    // ========================================

    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
      ],
      default: "OPEN",
      index: true,
    },

    // ========================================
    // ASSIGNED SUPPORT PERSON
    // ========================================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ========================================
    // MESSAGES
    // ========================================

    messages: {
      type: [supportMessageSchema],
      default: [],
    },

    // ========================================
    // ATTACHMENT
    // ========================================

    attachment: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      publicId: {
        type: String,
        default: "",
        trim: true,
      },

      originalName: {
        type: String,
        default: "",
        trim: true,
      },

      mimeType: {
        type: String,
        default: "",
        trim: true,
      },

      size: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ========================================
    // RESOLUTION
    // ========================================

    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // ========================================
    // RESOLVED DATE
    // ========================================

    resolvedAt: {
      type: Date,
      default: null,
    },

    // ========================================
    // CLOSED DATE
    // ========================================

    closedAt: {
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

supportTicketSchema.index({
  patient: 1,
  createdAt: -1,
});

supportTicketSchema.index({
  hospital: 1,
  status: 1,
  createdAt: -1,
});

// ==========================================
// MODEL
// ==========================================

const SupportTicket = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);

// ==========================================
// EXPORT
// ==========================================

module.exports = SupportTicket;
const mongoose = require("mongoose");

const doctorProfileSchema = new mongoose.Schema(
  {
    // ==========================================
    // DOCTOR USER
    // ==========================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // PROFESSIONAL INFORMATION
    // ==========================================

    specialization: {
      type: String,
      required: true,
      trim: true,
    },

    qualification: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: Number,
      required: true,
      min: 0,
    },

    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // HOSPITAL
    // ==========================================

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    // ==========================================
    // LOCATION
    // ==========================================

    city: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // ABOUT DOCTOR
    // ==========================================

    about: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // PROFILE IMAGE
    // ==========================================

    profileImage: {
      type: String,
      default: "",
    },

    // ==========================================
    // DOCTOR APPROVAL STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // DOCTOR APPOINTMENT SCHEDULE
    // ==========================================
    //
    // Doctor decides:
    // - Which days they work
    // - Start time
    // - End time
    // - Appointment slot duration
    //
    // Example:
    //
    // Monday:
    // 10:00 AM - 02:00 PM
    // 30 minute slots
    //
    // Wednesday:
    // OFF
    //
    // ==========================================

    schedule: [
      {
        day: {
          type: String,

          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],

          required: true,
        },

        isAvailable: {
          type: Boolean,
          default: false,
        },

        startTime: {
          type: String,
          default: "",
          trim: true,
        },

        endTime: {
          type: String,
          default: "",
          trim: true,
        },

        slotDuration: {
          type: Number,

          enum: [
            15,
            30,
            45,
            60,
          ],

          default: 30,
        },
      },
    ],
  },

  {
    timestamps: true,
  }
);

// ==========================================
// EXPORT
// ==========================================

module.exports = mongoose.model(
  "DoctorProfile",
  doctorProfileSchema
);
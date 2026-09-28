const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Driver user account
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    driverName: {
      type: String,
      required: true,
      trim: true,
    },

    driverPhone: {
      type: String,
      required: true,
      trim: true,
    },

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    type: {
      type: String,
      enum: ["basic", "advanced", "icu"],
      default: "basic",
    },

    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },

    // Driver online/offline status
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Last time the driver's location was updated
    lastLocationUpdate: {
      type: Date,
      default: null,
    },

    currentLocation: {
      address: {
        type: String,
        default: "",
        trim: true,
      },

      latitude: {
        type: Number,
        default: null,
      },

      longitude: {
        type: Number,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Ambulance",
  ambulanceSchema
);
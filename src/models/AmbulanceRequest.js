const mongoose = require("mongoose");

const ambulanceRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ambulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      default: null,
    },

    pickupAddress: {
      type: String,
      default: "",
      trim: true,
    },

    pickupLocation: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },

    emergencyType: {
      type: String,
      default: "Medical Emergency",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "requested",
        "accepted",
        "on-the-way",
        "arrived",
        "completed",
        "cancelled",
      ],
      default: "requested",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AmbulanceRequest",
  ambulanceRequestSchema
);
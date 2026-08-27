const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    operator: {
      type: String,
      required: true,
      trim: true,
    },

    busType: {
      type: String,
      enum: ["AC", "NON_AC", "SLEEPER", "SEMI_SLEEPER"],
      required: true,
    },

    seatCapacity: {
      type: Number,
      required: true,
      min: 1,
    },

    amenities: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Bus = mongoose.model("Bus", busSchema);

module.exports = Bus;
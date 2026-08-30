const mongoose = require("mongoose");

const tripSeatSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    seatNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "LOCKED", "BOOKED"],
      default: "AVAILABLE",
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lockExpiresAt: {
      type: Date,
      default: null,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tripSeatSchema.index(
  {
    tripId: 1,
    seatNumber: 1,
  },
  {
    unique: true,
  }
);

const TripSeat = mongoose.model("TripSeat", tripSeatSchema);

module.exports = TripSeat;
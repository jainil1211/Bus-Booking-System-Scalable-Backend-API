const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    seatNumbers: {
      type: [Number],
      required: true,
      validate: {
        validator: (seats) => seats.length > 0,
        message: "At least one seat is required",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    bookedAt: {
      type: Date,
      default: Date.now,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
    confirmationEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ status: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
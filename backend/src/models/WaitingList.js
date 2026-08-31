const mongoose = require("mongoose");

const waitingListSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["WAITING", "ELIGIBLE", "LEFT"],
      default: "WAITING",
    },
    position: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent user from having multiple active entries for the same trip
waitingListSchema.index(
  { tripId: 1, userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["WAITING", "ELIGIBLE"] } } }
);

// Ensure position is unique per trip for active entries, to handle concurrency safely
waitingListSchema.index(
  { tripId: 1, position: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["WAITING", "ELIGIBLE"] } } }
);

module.exports = mongoose.model("WaitingList", waitingListSchema);

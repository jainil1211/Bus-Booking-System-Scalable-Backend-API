const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const TripSeat = require("../models/TripSeat");
const Booking = require("../models/Booking");
const WaitingList = require("../models/WaitingList");

const joinWaitingList = async (req, res) => {
  try {
    const { tripId } = req.body;
    const userId = req.user.userId;

    // 1. Verify trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({ success: false, message: "Trip is not active" });
    }

    // 2. Prevent joining if there are AVAILABLE seats
    const availableSeatsCount = await TripSeat.countDocuments({
      tripId,
      status: "AVAILABLE",
    });

    if (availableSeatsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Seats are currently available. Please book directly.",
      });
    }

    // 3. Check if user already has an active booking for this trip
    const activeBooking = await Booking.findOne({
      tripId,
      userId,
      status: { $in: ["PENDING", "CONFIRMED"] },
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: "You already have an active booking for this trip.",
      });
    }

    // 4. Check if user is already on the waiting list
    const existingEntry = await WaitingList.findOne({
      tripId,
      userId,
      status: { $in: ["WAITING", "ELIGIBLE"] },
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "You are already on the waiting list for this trip.",
      });
    }

    // 5. Calculate position and insert. Use a retry loop to safely handle concurrent position conflicts.
    // The compound index (tripId, position) will throw a duplicate key error (11000) if a race condition occurs.
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        // Find the max position currently active
        const lastEntry = await WaitingList.findOne({
          tripId,
          status: { $in: ["WAITING", "ELIGIBLE"] },
        })
          .sort({ position: -1 })
          .select("position");

        const nextPosition = lastEntry ? lastEntry.position + 1 : 1;

        const newEntry = await WaitingList.create({
          tripId,
          userId,
          status: "WAITING",
          position: nextPosition,
        });

        return res.status(201).json({
          success: true,
          message: "Successfully joined the waiting list",
          data: newEntry,
        });
      } catch (err) {
        if (err.code === 11000 && i < MAX_RETRIES - 1) {
          // Duplicate key error on position index, race condition detected, retry the loop
          continue;
        }
        throw err; // throw other errors or final failure
      }
    }
  } catch (error) {
    console.error("Join waiting list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const leaveWaitingList = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    // Find user's active waiting list entry
    const entry = await WaitingList.findOne({
      tripId,
      userId,
      status: { $in: ["WAITING", "ELIGIBLE"] },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Active waiting list entry not found",
      });
    }

    const removedPosition = entry.position;

    // Change status to LEFT
    entry.status = "LEFT";
    await entry.save();

    // Decrease the position of everyone behind them securely
    await WaitingList.updateMany(
      {
        tripId,
        status: { $in: ["WAITING", "ELIGIBLE"] },
        position: { $gt: removedPosition },
      },
      {
        $inc: { position: -1 },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Successfully left the waiting list",
    });
  } catch (error) {
    console.error("Leave waiting list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  joinWaitingList,
  leaveWaitingList,
};

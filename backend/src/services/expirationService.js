const TripSeat = require("../models/TripSeat");
const Booking = require("../models/Booking");

const checkExpirations = async () => {
  try {
    const now = new Date();

    // 1. Find all expired locked seats
    const expiredSeats = await TripSeat.find({
      status: "LOCKED",
      lockExpiresAt: { $lt: now },
    });

    if (expiredSeats.length === 0) {
      return;
    }

    // Extract unique booking IDs
    const bookingIds = [...new Set(expiredSeats.map((seat) => seat.bookingId.toString()))];

    // 2. Release the seats (Match what bookingController.js does on cancel)
    const seatUpdateResult = await TripSeat.updateMany(
      { _id: { $in: expiredSeats.map((s) => s._id) } },
      {
        $set: {
          status: "AVAILABLE",
          lockedBy: null,
          lockExpiresAt: null,
          bookingId: null,
        },
      }
    );

    // 3. Cancel the associated PENDING bookings only
    // If a booking is CONFIRMED, this strictly ignores it, protecting paid bookings.
    const bookingUpdateResult = await Booking.updateMany(
      {
        _id: { $in: bookingIds },
        status: "PENDING",
      },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: now,
        },
      }
    );

    // 4. Trigger waiting list processing for affected trips
    const { processWaitingListForTrip } = require("./waitingListService");
    const { getIO } = require("../config/socket");
    const tripIds = [...new Set(expiredSeats.map((seat) => seat.tripId.toString()))];
    
    for (const tripId of tripIds) {
      await processWaitingListForTrip(tripId);
      
      // Group seats for this trip and emit socket event
      const tripSeatNumbers = expiredSeats
        .filter((seat) => seat.tripId.toString() === tripId)
        .map((seat) => seat.seatNumber);

      try {
        getIO().to(`trip:${tripId}`).emit("SEAT_UPDATE", {
          tripId: tripId,
          seats: tripSeatNumbers,
          status: "AVAILABLE",
        });
      } catch (socketError) {
        console.error("Socket emit error:", socketError);
      }
    }

    console.log(
      `[Expiration Service] Released ${seatUpdateResult.modifiedCount} seats and cancelled ${bookingUpdateResult.modifiedCount} pending bookings.`
    );
  } catch (error) {
    console.error("[Expiration Service] Error checking expirations:", error);
  }
};

const startExpirationService = () => {
  // Run every 1 minute (60000 ms)
  setInterval(checkExpirations, 60000);
  console.log("Expiration service started. Running every minute.");
};

module.exports = {
  startExpirationService,
};

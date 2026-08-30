const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSeat = require("../models/TripSeat");

const LOCK_DURATION_MINUTES = 10;

const createBooking = async (req, res) => {
  try {
    const { tripId, seatNumbers } = req.body;

    // 1. Validate Trip ID
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    // 2. Validate seat selection
    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one seat must be selected",
      });
    }

    // Prevent duplicate seat numbers
    const uniqueSeats = [...new Set(seatNumbers)];

    if (uniqueSeats.length !== seatNumbers.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate seat numbers are not allowed",
      });
    }

    // 3. Find Trip
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "This trip is not available for booking",
      });
    }

    // 4. Calculate total amount on server
    const totalAmount = trip.fare * uniqueSeats.length;

    // 5. Create pending booking first
    const booking = await Booking.create({
      userId: req.user.userId,
      tripId: trip._id,
      seatNumbers: uniqueSeats,
      totalAmount,
      status: "PENDING",
    });

    // 6. Lock expiration time
    const lockExpiresAt = new Date(
      Date.now() + LOCK_DURATION_MINUTES * 60 * 1000
    );

    // 7. Atomically lock each requested seat
    

    for (const seatNumber of uniqueSeats) {
      const seat = await TripSeat.findOneAndUpdate(
        {
          tripId: trip._id,
          seatNumber,
          $or: [
            { status: "AVAILABLE" },
            {
              status: "LOCKED",
              lockExpiresAt: { $lte: new Date() },
            },
          ],
        },
        {
          $set: {
            status: "LOCKED",
            lockedBy: req.user.userId,
            lockExpiresAt,
            bookingId: booking._id,
          },
        },
        {
          new: true,
        }
      );

      if (!seat) {
        // Seat was unavailable
        await TripSeat.updateMany(
          {
            bookingId: booking._id,
          },
          {
            $set: {
              status: "AVAILABLE",
              lockedBy: null,
              lockExpiresAt: null,
              bookingId: null,
            },
          }
        );

        await Booking.findByIdAndDelete(booking._id);

        return res.status(409).json({
          success: false,
          message: `Seat ${seatNumber} is no longer available`,
        });
      }

      
    }

    // 8. Booking successfully created with seats locked
    return res.status(201).json({
      success: true,
      message: "Seats locked successfully. Complete payment within 10 minutes.",
      data: {
        bookingId: booking._id,
        tripId: booking.tripId,
        seatNumbers: booking.seatNumbers,
        totalAmount: booking.totalAmount,
        status: booking.status,
        lockExpiresAt,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Find only the logged-in user's booking
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.userId,
    }).populate({
      path: "tripId",
      select: "busId routeId travelDate departureTime arrivalTime fare status",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.user.userId,
    })
      .populate({
        path: "tripId",
        select:
          "busId routeId travelDate departureTime arrivalTime fare status",
        populate: [
          {
            path: "busId",
            select: "busNumber operator busType seatCapacity amenities",
          },
          {
            path: "routeId",
            select: "source destination stops",
          },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Find user's booking
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Only pending/confirmed bookings can be cancelled
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled",
      });
    }

    // Cancel booking
    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();

    await booking.save();

    // Release seats
    await TripSeat.updateMany(
      {
        bookingId: booking._id,
      },
      {
        $set: {
          status: "AVAILABLE",
          lockedBy: null,
          lockExpiresAt: null,
          bookingId: null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createBooking,
  getBookingById,
  getMyBookings,
  cancelBooking,
};
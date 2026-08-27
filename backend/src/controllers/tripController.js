const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Bus = require("../models/Bus");
const Route = require("../models/Route");

// Create trip
const createTrip = async (req, res) => {
  try {
    const {
      busId,
      routeId,
      travelDate,
      departureTime,
      arrivalTime,
      fare,
    } = req.body;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(busId) ||
      !mongoose.Types.ObjectId.isValid(routeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID or route ID",
      });
    }

    // Check bus
    const bus = await Bus.findById(busId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    if (!bus.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot create trip with an inactive bus",
      });
    }

    // Check route
    const route = await Route.findById(routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (!route.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot create trip with an inactive route",
      });
    }

    // Check time
    if (departureTime >= arrivalTime) {
      return res.status(400).json({
        success: false,
        message: "Arrival time must be after departure time",
      });
    }

    // Check whether the same bus already has an overlapping trip
    const conflictingTrip = await Trip.findOne({
      busId,
      travelDate: new Date(travelDate),
      status: {
        $in: ["SCHEDULED", "IN_PROGRESS"],
      },
      departureTime: {
        $lt: arrivalTime,
      },
      arrivalTime: {
        $gt: departureTime,
      },
    });

    if (conflictingTrip) {
      return res.status(409).json({
        success: false,
        message: "Bus is already scheduled for another trip during this time",
      });
    }

    const trip = await Trip.create({
      busId,
      routeId,
      travelDate: new Date(travelDate),
      departureTime,
      arrivalTime,
      fare,
    });

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Create trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all trips
const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate("busId", "busNumber operator busType seatCapacity amenities")
      .populate("routeId", "source destination stops")
      .sort({ travelDate: 1, departureTime: 1 });

    return res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get trip by ID
const getTripById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.tripId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    const trip = await Trip.findById(req.params.tripId)
      .populate("busId", "busNumber operator busType seatCapacity amenities")
      .populate("routeId", "source destination stops");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Get trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update trip
const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const {
      busId,
      routeId,
      travelDate,
      departureTime,
      arrivalTime,
      fare,
    } = req.body;

    const newBusId = busId || trip.busId;
    const newRouteId = routeId || trip.routeId;
    const newTravelDate = travelDate
      ? new Date(travelDate)
      : trip.travelDate;
    const newDepartureTime = departureTime || trip.departureTime;
    const newArrivalTime = arrivalTime || trip.arrivalTime;

    // Check bus
    const bus = await Bus.findById(newBusId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    if (!bus.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign an inactive bus to a trip",
      });
    }

    // Check route
    const route = await Route.findById(newRouteId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (!route.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign an inactive route to a trip",
      });
    }

    if (newDepartureTime >= newArrivalTime) {
      return res.status(400).json({
        success: false,
        message: "Arrival time must be after departure time",
      });
    }

    const conflictingTrip = await Trip.findOne({
      _id: { $ne: trip._id },
      busId: newBusId,
      travelDate: newTravelDate,
      status: {
        $in: ["SCHEDULED", "IN_PROGRESS"],
      },
      departureTime: {
        $lt: newArrivalTime,
      },
      arrivalTime: {
        $gt: newDepartureTime,
      },
    });

    if (conflictingTrip) {
      return res.status(409).json({
        success: false,
        message: "Bus is already scheduled for another trip during this time",
      });
    }

    trip.busId = newBusId;
    trip.routeId = newRouteId;
    trip.travelDate = newTravelDate;
    trip.departureTime = newDepartureTime;
    trip.arrivalTime = newArrivalTime;

    if (fare !== undefined) {
      trip.fare = fare;
    }

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Update trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update trip status
const updateTripStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip status",
      });
    }

    const trip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip status updated successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Update trip status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete trip
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  updateTripStatus,
  deleteTrip,
};
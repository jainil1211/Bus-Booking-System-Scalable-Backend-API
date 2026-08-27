const express = require("express");

const {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  updateTripStatus,
  deleteTrip,
} = require("../controllers/tripController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  createTripSchema,
  updateTripSchema,
} = require("../validators/tripValidator");

const validate  = require("../middleware/validateMiddleware");

const router = express.Router();

// Create trip
router.post(
  "/",
  protect,
  adminOnly,
  validate(createTripSchema),
  createTrip
);

// Get all trips
router.get(
  "/",
  protect,
  adminOnly,
  getTrips
);

// Get trip by ID
router.get(
  "/:tripId",
  protect,
  adminOnly,
  getTripById
);

// Update trip
router.patch(
  "/:tripId",
  protect,
  adminOnly,
  validate(updateTripSchema),
  updateTrip
);

// Update trip status
router.patch(
  "/:tripId/status",
  protect,
  adminOnly,
  updateTripStatus
);

// Delete trip
router.delete(
  "/:tripId",
  protect,
  adminOnly,
  deleteTrip
);

module.exports = router;
const express = require("express");


const {
    protect,
} = require("../middleware/authMiddleware");

const {
    createBookingSchema,
} = require("../validators/bookingValidator");

const validate  = require("../middleware/validateMiddleware");

const {
  createBooking,
  getBookingById,
  getMyBookings,
  cancelBooking,

} = require("../controllers/bookingController");

const router = express.Router();

// Create booking
router.post(
    "/",
    protect,
    validate(createBookingSchema),
    createBooking
);

router.get(
  "/",
  protect,
  getMyBookings
);

router.get(
  "/:bookingId",
  protect,
  getBookingById
);

router.patch(
  "/:bookingId/cancel",
  protect,
  cancelBooking
);

module.exports = router;
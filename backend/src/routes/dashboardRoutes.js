const express = require("express");
const router = express.Router();

const {
  getStats,
  getRevenueTrend,
  getRecentBookings,
} = require("../controllers/dashboardController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// All dashboard routes are protected and admin-only
router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/revenue-trend", getRevenueTrend);
router.get("/recent-bookings", getRecentBookings);

module.exports = router;

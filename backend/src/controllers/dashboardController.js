const mongoose = require("mongoose");
const User = require("../models/User");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

/**
 * @desc    Get overall system stats
 * @route   GET /api/dashboard/stats
 * @access  Private/Admin
 */
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBuses = await Bus.countDocuments();
    const totalRoutes = await Route.countDocuments({ isActive: true });
    const totalTrips = await Trip.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // Booking Status Breakdown
    const bookingStatusBreakdown = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    let confirmedBookings = 0;
    let cancelledBookings = 0;
    
    bookingStatusBreakdown.forEach((status) => {
      if (status._id === "CONFIRMED") confirmedBookings = status.count;
      if (status._id === "CANCELLED") cancelledBookings = status.count;
    });

    // Total Revenue (Only from SUCCESS payments)
    const revenueResult = await Payment.aggregate([
      {
        $match: { status: "SUCCESS" },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalBuses,
        totalActiveRoutes: totalRoutes,
        totalTrips,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        bookingStatusBreakdown,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @desc    Get 7-day revenue trend
 * @route   GET /api/dashboard/revenue-trend
 * @access  Private/Admin
 */
const getRevenueTrend = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const revenueTrend = await Payment.aggregate([
      {
        $match: {
          status: "SUCCESS",
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$amount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: revenueTrend,
    });
  } catch (error) {
    console.error("Get Revenue Trend Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @desc    Get 10 most recent bookings
 * @route   GET /api/dashboard/recent-bookings
 * @access  Private/Admin
 */
const getRecentBookings = async (req, res) => {
  try {
    const recentBookings = await Booking.find()
      .populate("userId", "name email")
      .populate({
        path: "tripId",
        select: "travelDate departureTime arrivalTime fare status",
        populate: [
          {
            path: "routeId",
            select: "source destination",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      count: recentBookings.length,
      data: recentBookings,
    });
  } catch (error) {
    console.error("Get Recent Bookings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getStats,
  getRevenueTrend,
  getRecentBookings,
};

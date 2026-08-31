const express = require("express");
const cors = require("cors");
const authRoutes = require('./routes/authRoutes');
const { protect } = require("./middleware/authMiddleware");
const busRoutes = require("./routes/busRoutes");
const routeRoutes = require("./routes/routeRoutes");
const tripRoutes = require("./routes/tripRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const waitingListRoutes = require("./routes/waitingListRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.get("/api/test-protected", protect, (req, res) => {
  res.json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bus Booking API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/waiting-list", waitingListRoutes);
app.use("/api/dashboard", dashboardRoutes);

module.exports = app;
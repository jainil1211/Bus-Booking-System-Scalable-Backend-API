const express = require("express");
const cors = require("cors");
const authRoutes=require('./routes/authRoutes');
const { protect } = require("./middleware/authMiddleware");


const app = express();

app.use(cors());
app.use(express.json());


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

app.use("/api/auth",authRoutes);


module.exports = app;
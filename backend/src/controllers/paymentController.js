const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const TripSeat = require("../models/TripSeat");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.userId;

    // 1. Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // 2. Validate ownership
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to access this booking" });
    }

    // 3. Validate booking is PENDING
    if (booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only PENDING bookings can be paid for" });
    }

    // 4. Prevent duplicate active orders by returning existing PENDING payment if it exists
    const existingPayment = await Payment.findOne({ bookingId: booking._id, status: "PENDING" });
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        data: {
          bookingId: booking._id,
          razorpayOrderId: existingPayment.razorpayOrderId,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    }

    // 5. Calculate amount in smallest currency unit (Paise for INR)
    const amountInPaise = booking.totalAmount * 100;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_booking_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        userId: userId.toString(),
      },
    };

    // 6. Create Razorpay order
    const order = await razorpay.orders.create(options);

    // 7. Create Payment document
    const payment = await Payment.create({
      bookingId: booking._id,
      userId: userId,
      razorpayOrderId: order.id,
      amount: booking.totalAmount, // Storing in INR (original amount)
      currency: "INR",
      status: "PENDING",
    });

    // 8. Update Booking to reference this Payment
    booking.paymentId = payment._id;
    await booking.save();

    // 9. Return clean response required for frontend checkout
    res.status(201).json({
      success: true,
      data: {
        bookingId: booking._id,
        razorpayOrderId: order.id,
        amount: booking.totalAmount,
        currency: "INR",
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.userId;

    // 1. Find the payment using razorpayOrderId
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment order not found" });
    }

    // 2. Validate ownership of Payment
    if (payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to access this payment" });
    }

    // 3. Find the associated booking
    const booking = await Booking.findById(payment.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Associated booking not found" });
    }

    // 4. Validate ownership of Booking
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to access this booking" });
    }

    // 5. Handle Idempotency (Already SUCCESS)
    if (payment.status === "SUCCESS" && booking.status === "CONFIRMED") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified successfully",
        data: { bookingId: booking._id, paymentId: payment._id },
      });
    }

    // 6. Validate current state is PENDING
    if (payment.status !== "PENDING" || booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Payment or booking is not in a PENDING state" });
    }

    // 7. Verify Signature Cryptographically
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // 8. Signature is valid, perform sequential database updates according to existing architecture
    
    // Update Payment
    payment.status = "SUCCESS";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    // Update Booking
    booking.status = "CONFIRMED";
    booking.bookedAt = new Date();
    await booking.save();

    // Update TripSeats
    await TripSeat.updateMany(
      { bookingId: booking._id },
      {
        $set: {
          status: "BOOKED",
          lockedBy: null,
          lockExpiresAt: null,
        },
      }
    );

    // Emit Socket.IO event
    const { getIO } = require("../config/socket");
    try {
      getIO().to(`trip:${booking.tripId}`).emit("SEAT_UPDATE", {
        tripId: booking.tripId,
        seats: booking.seatNumbers,
        status: "BOOKED",
      });
    } catch (socketError) {
      console.error("Socket emit error:", socketError);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        bookingId: booking._id,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error("Razorpay Payment Verification Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};

const webhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({ success: false, message: "Missing signature or webhook secret" });
    }

    // 1. Verify Webhook Signature using raw body
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body;

    // 2. Handle relevant event (payment.captured)
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      // Find the payment
      const payment = await Payment.findOne({ razorpayOrderId });
      if (!payment) {
        // Return 200 so Razorpay stops retrying for unrecognised orders
        return res.status(200).json({ success: true, message: "Payment order not found in our system, ignoring." });
      }

      // Find booking
      const booking = await Booking.findById(payment.bookingId);
      if (!booking) {
        return res.status(200).json({ success: true, message: "Associated booking not found, ignoring." });
      }

      // Handle Idempotency
      if (payment.status === "SUCCESS" || booking.status === "CONFIRMED") {
        return res.status(200).json({ success: true, message: "Webhook already processed previously." });
      }

      // Update records (Sequential)
      payment.status = "SUCCESS";
      payment.razorpayPaymentId = razorpayPaymentId;
      await payment.save();

      booking.status = "CONFIRMED";
      booking.bookedAt = new Date();
      await booking.save();

      await TripSeat.updateMany(
        { bookingId: booking._id },
        {
          $set: {
            status: "BOOKED",
            lockedBy: null,
            lockExpiresAt: null,
          },
        }
      );

      // Emit Socket.IO event
      const { getIO } = require("../config/socket");
      try {
        getIO().to(`trip:${booking.tripId}`).emit("SEAT_UPDATE", {
          tripId: booking.tripId,
          seats: booking.seatNumbers,
          status: "BOOKED",
        });
      } catch (socketError) {
        console.error("Socket emit error:", socketError);
      }
    }

    // Acknowledge receipt to Razorpay
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay Webhook Error:", error);
    res.status(500).json({ success: false, message: "Internal server error processing webhook" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  webhook,
};

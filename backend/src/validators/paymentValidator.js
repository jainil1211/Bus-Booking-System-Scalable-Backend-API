const { z } = require("zod");

const createOrderSchema = z.object({
  bookingId: z
    .string()
    .min(1, "Booking ID is required"),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay Payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay Signature is required"),
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
};

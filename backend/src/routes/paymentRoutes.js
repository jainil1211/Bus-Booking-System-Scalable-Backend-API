const express = require("express");
const { createOrder, verifyPayment, webhook } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");
const { createOrderSchema, verifyPaymentSchema } = require("../validators/paymentValidator");

const router = express.Router();

router.post("/order", protect, validate(createOrderSchema), createOrder);
router.post("/verify", protect, validate(verifyPaymentSchema), verifyPayment);
router.post("/webhook", webhook);

module.exports = router;

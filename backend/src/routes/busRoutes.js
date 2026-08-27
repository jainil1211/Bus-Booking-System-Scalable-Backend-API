const express = require("express");

const {
  createBus,
  getBuses,
  getBusById,
  updateBus,
  updateBusStatus,
  deleteBus,
} = require("../controllers/busController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  createBusSchema,
  updateBusSchema,
} = require("../validators/busValidator");

const  validate  = require("../middleware/validateMiddleware");

const router = express.Router();

// Create bus
router.post(
  "/",
  protect,
  adminOnly,
  validate(createBusSchema),
  createBus
);

// Get all buses
router.get(
  "/",
  protect,
  adminOnly,
  getBuses
);

// Get single bus
router.get(
  "/:busId",
  protect,
  adminOnly,
  getBusById
);

// Update bus
router.patch(
  "/:busId",
  protect,
  adminOnly,
  validate(updateBusSchema),
  updateBus
);

// Activate / deactivate bus
router.patch(
  "/:busId/status",
  protect,
  adminOnly,
  updateBusStatus
);

// Delete bus
router.delete(
  "/:busId",
  protect,
  adminOnly,
  deleteBus
);

module.exports = router;
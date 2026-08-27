const express = require("express");

const {
  createRoute,
  getRoutes,
  getRouteById,
  updateRoute,
  updateRouteStatus,
  deleteRoute,
} = require("../controllers/routeController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  createRouteSchema,
  updateRouteSchema,
} = require("../validators/routeValidator");

const  validate  = require("../middleware/validateMiddleware");

const router = express.Router();

// Create route
router.post(
  "/",
  protect,
  adminOnly,
  validate(createRouteSchema),
  createRoute
);

// Get all routes
router.get(
  "/",
  protect,
  adminOnly,
  getRoutes
);

// Get single route
router.get(
  "/:routeId",
  protect,
  adminOnly,
  getRouteById
);

// Update route
router.patch(
  "/:routeId",
  protect,
  adminOnly,
  validate(updateRouteSchema),
  updateRoute
);

// Activate / deactivate route
router.patch(
  "/:routeId/status",
  protect,
  adminOnly,
  updateRouteStatus
);

// Delete route
router.delete(
  "/:routeId",
  protect,
  adminOnly,
  deleteRoute
);

module.exports = router;    
const Route = require("../models/Route");

// Create route
const createRoute = async (req, res) => {
  try {
    const { source, destination, stops } = req.body;

    const existingRoute = await Route.findOne({
      source: source.toLowerCase(),
      destination: destination.toLowerCase(),
    });

    if (existingRoute) {
      return res.status(409).json({
        success: false,
        message: "Route already exists",
      });
    }

    const route = await Route.create({
      source,
      destination,
      stops,
    });

    return res.status(201).json({
      success: true,
      message: "Route created successfully",
      data: route,
    });
  } catch (error) {
    console.error("Create route error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all routes
const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error("Get routes error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get route by ID
const getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: route,
    });
  } catch (error) {
    console.error("Get route error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update route
const updateRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(
      req.params.routeId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Route updated successfully",
      data: route,
    });
  } catch (error) {
    console.error("Update route error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update route status
const updateRouteStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const route = await Route.findByIdAndUpdate(
      req.params.routeId,
      { isActive },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Route ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: route,
    });
  } catch (error) {
    console.error("Update route status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete route
const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Route deleted successfully",
    });
  } catch (error) {
    console.error("Delete route error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createRoute,
  getRoutes,
  getRouteById,
  updateRoute,
  updateRouteStatus,
  deleteRoute,
};
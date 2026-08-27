const Bus = require("../models/Bus");


const createBus = async (req, res) => {
  try {
    const {
      busNumber,
      operator,
      busType,
      seatCapacity,
      amenities,
    } = req.body;

    const existingBus = await Bus.findOne({
      busNumber: busNumber.toUpperCase(),
    });

    if (existingBus) {
      return res.status(409).json({
        success: false,
        message: "Bus with this number already exists",
      });
    }

    const bus = await Bus.create({
      busNumber,
      operator,
      busType,
      seatCapacity,
      amenities,
    });

    return res.status(201).json({
      success: true,
      message: "Bus created successfully",
      data: bus,
    });
  } catch (error) {
    console.error("Create bus error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



const getBuses = async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: buses,
    });
  } catch (error) {
    console.error("Get buses error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: bus,
    });
  } catch (error) {
    console.error("Get bus error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const updateBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(
      req.params.busId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bus updated successfully",
      data: bus,
    });
  } catch (error) {
    console.error("Update bus error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateBusStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const bus = await Bus.findByIdAndUpdate(
      req.params.busId,
      { isActive },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Bus ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: bus,
    });
  } catch (error) {
    console.error("Update bus status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.busId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bus deleted successfully",
    });
  } catch (error) {
    console.error("Delete bus error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createBus,
  getBuses,
  getBusById,
  updateBus,
  updateBusStatus,
  deleteBus,
};
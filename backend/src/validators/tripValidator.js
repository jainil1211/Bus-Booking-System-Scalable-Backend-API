const { z } = require("zod");

const createTripSchema = z.object({
  busId: z
    .string()
    .min(1, "Bus ID is required"),

  routeId: z
    .string()
    .min(1, "Route ID is required"),

  travelDate: z
    .string()
    .min(1, "Travel date is required"),

  departureTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Departure time must be in HH:mm format"
    ),

  arrivalTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Arrival time must be in HH:mm format"
    ),

  fare: z
    .number()
    .min(0, "Fare cannot be negative"),
});

const updateTripSchema = z.object({
  busId: z
    .string()
    .min(1, "Bus ID is required")
    .optional(),

  routeId: z
    .string()
    .min(1, "Route ID is required")
    .optional(),

  travelDate: z
    .string()
    .min(1, "Travel date is required")
    .optional(),

  departureTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Departure time must be in HH:mm format"
    )
    .optional(),

  arrivalTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Arrival time must be in HH:mm format"
    )
    .optional(),

  fare: z
    .number()
    .min(0, "Fare cannot be negative")
    .optional(),
});

module.exports = {
  createTripSchema,
  updateTripSchema,
};
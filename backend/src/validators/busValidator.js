const { z } = require("zod");

const createBusSchema = z.object({
  busNumber: z
    .string()
    .trim()
    .min(1, "Bus number is required"),

  operator: z
    .string()
    .trim()
    .min(1, "Operator is required"),

  busType: z.enum([
    "AC",
    "NON_AC",
    "SLEEPER",
    "SEMI_SLEEPER",
  ]),

  seatCapacity: z
    .number()
    .int("Seat capacity must be an integer")
    .positive("Seat capacity must be greater than 0"),

  amenities: z
    .array(z.string().trim().min(1))
    .optional()
    .default([]),
});
const updateBusSchema = createBusSchema.partial();
module.exports = {
  createBusSchema,
  updateBusSchema,
};
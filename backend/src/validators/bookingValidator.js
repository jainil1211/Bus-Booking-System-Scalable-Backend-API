const { z } = require("zod");

const createBookingSchema = z.object({
  tripId: z
    .string()
    .min(1, "Trip ID is required"),

  seatNumbers: z
    .array(
      z
        .number()
        .int("Seat number must be an integer")
        .positive("Seat number must be greater than 0")
    )
    .min(1, "At least one seat must be selected"),
});

module.exports = {
  createBookingSchema,
};
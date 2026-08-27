const { z } = require("zod");

const stopSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Stop name is required"),

  order: z
    .number()
    .int("Stop order must be an integer")
    .positive("Stop order must be greater than 0"),
});

const createRouteSchema = z
  .object({
    source: z
      .string()
      .trim()
      .min(1, "Source is required"),

    destination: z
      .string()
      .trim()
      .min(1, "Destination is required"),

    stops: z
      .array(stopSchema)
      .optional()
      .default([]),
  })
  .refine(
    (data) =>
      data.source.toLowerCase() !== data.destination.toLowerCase(),
    {
      message: "Source and destination cannot be the same",
      path: ["destination"],
    }
  );

const updateRouteSchema = z.object({
  source: z
    .string()
    .trim()
    .min(1, "Source is required")
    .optional(),

  destination: z
    .string()
    .trim()
    .min(1, "Destination is required")
    .optional(),

  stops: z
    .array(stopSchema)
    .optional(),
});

module.exports = {
  createRouteSchema,
  updateRouteSchema,
};
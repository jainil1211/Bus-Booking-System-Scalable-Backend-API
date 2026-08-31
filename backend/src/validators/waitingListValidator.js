const { z } = require("zod");

const joinWaitingListSchema = z.object({
  body: z.object({
    tripId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid trip ID"),
  }),
});

module.exports = {
  joinWaitingListSchema,
};

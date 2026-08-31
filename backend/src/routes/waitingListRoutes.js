const express = require("express");
const { joinWaitingList, leaveWaitingList } = require("../controllers/waitingListController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");
const { joinWaitingListSchema } = require("../validators/waitingListValidator");

const router = express.Router();

router.post("/", protect, validate(joinWaitingListSchema), joinWaitingList);
router.delete("/:tripId", protect, leaveWaitingList);

module.exports = router;

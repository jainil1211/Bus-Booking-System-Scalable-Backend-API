const TripSeat = require("../models/TripSeat");
const WaitingList = require("../models/WaitingList");

const processWaitingListForTrip = async (tripId) => {
  try {
    // 1. Count how many seats are currently AVAILABLE
    const availableSeatsCount = await TripSeat.countDocuments({
      tripId,
      status: "AVAILABLE",
    });

    if (availableSeatsCount === 0) {
      return;
    }

    // 2. Find WAITING users, strictly ordered by position ascending. 
    // The number of users we pick is exactly bounded by availableSeatsCount.
    const waitingUsers = await WaitingList.find({
      tripId,
      status: "WAITING",
    })
      .sort({ position: 1 })
      .limit(availableSeatsCount);

    if (waitingUsers.length === 0) {
      return;
    }

    // 3. Update these users to ELIGIBLE so they can be notified/book next.
    // They are NOT assigned a specific seat; they just get the right to enter the normal booking flow.
    const userIdsToUpdate = waitingUsers.map((user) => user._id);
    
    await WaitingList.updateMany(
      { _id: { $in: userIdsToUpdate } },
      { $set: { status: "ELIGIBLE" } }
    );

    // Emit generic waiting list update so clients can refresh their status
    const { getIO } = require("../config/socket");
    try {
      getIO().to(`trip:${tripId}`).emit("WAITING_LIST_UPDATE", {
        tripId,
        message: "Waiting list queue updated",
      });
    } catch (socketError) {
      console.error("Socket emit error:", socketError);
    }

    console.log(
      `[Waiting List Service] Marked ${userIdsToUpdate.length} users as ELIGIBLE for trip ${tripId}.`
    );
  } catch (error) {
    console.error("[Waiting List Service] Error processing waiting list:", error);
  }
};

module.exports = {
  processWaitingListForTrip,
};

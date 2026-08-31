const { Server } = require("socket.io");
const mongoose = require("mongoose");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join a trip-specific room to listen for seat updates
    socket.on("joinTripRoom", (tripId) => {
      if (mongoose.Types.ObjectId.isValid(tripId)) {
        const roomName = `trip:${tripId}`;
        socket.join(roomName);
        console.log(`[Socket.IO] Client ${socket.id} joined room: ${roomName}`);
      }
    });

    // Leave a trip-specific room
    socket.on("leaveTripRoom", (tripId) => {
      if (mongoose.Types.ObjectId.isValid(tripId)) {
        const roomName = `trip:${tripId}`;
        socket.leave(roomName);
        console.log(`[Socket.IO] Client ${socket.id} left room: ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};

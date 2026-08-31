const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

const http = require("http");
const { initSocket } = require("./config/socket");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Create HTTP server wrapping Express app
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server);

  // Start background workers
  const { startExpirationService } = require("./services/expirationService");
  startExpirationService();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
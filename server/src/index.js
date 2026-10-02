import "dotenv/config";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

const port = Number(process.env.PORT || 4000);

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  await connectDatabase();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`BrainScan API listening on port ${port}`);
  });

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch {
  console.error("Server startup failed. Check MongoDB configuration and network access.");
  await disconnectDatabase();
  process.exit(1);
}

import "dotenv/config"; // loads .env before anything below runs

import app from "./app.js";
import connectDB from "./config/db.js";
import { validateEnvironment } from "./config/validateEnv.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  validateEnvironment();
  await connectDB();
  const host = process.env.RENDER === "true" ? "0.0.0.0" : "127.0.0.1";
  app.listen(PORT, host, () => {
    console.log(
      `Server running on http://localhost:${PORT} (${process.env.NODE_ENV})`,
    );
  });
};

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

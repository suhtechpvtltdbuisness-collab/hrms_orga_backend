import "dotenv/config";
import app from "./app.js";
import { pool } from "./db/connection.js";

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connected successfully");

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

startServer();

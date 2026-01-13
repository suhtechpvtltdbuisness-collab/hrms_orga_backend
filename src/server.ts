import app from "./app.js";
import dotenv from "dotenv";
import { pool } from "./db/connection.js";
dotenv.config();

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await pool.query("SELECT NOW()");
    console.log("Database connected successfully");

    // Start server only after successful DB connection
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

startServer();

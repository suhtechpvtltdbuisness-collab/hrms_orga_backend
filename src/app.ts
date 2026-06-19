import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./router.js";
import { handleRazorpayWebhook } from "./controllers/subscriptionController.js";

const app = express();

const allowedOrigins = [
  "https://orga.cc",
  "https://www.orga.cc",
  "https://admin.orga.cc",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(cookieParser());

app.post(
  "/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(router);

// Error handler middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  },
);

export default app;

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./router.js";
import { handleRazorpayWebhook } from "./controllers/subscriptionController.js";
import { getUploadsDirectory } from "./services/uploadService.js";

const app = express();

const allowedOrigins = [
  "https://orga.cc",
  "https://www.orga.cc",
  "https://admin.orga.cc",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://hrms-orga-git-testing-suhtechpvtltdbuisness-collabs-projects.vercel.app",
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || []),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(cookieParser());

app.post(
  "/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);

// Camera captures are base64 encoded by the current web client. Keep this limit
// narrow and enforce the decoded 5 MB limit again in the biometric service.
app.use(express.json({ limit: "7mb" }));
app.use(express.urlencoded({ extended: true }));
// UPLOADS_DIR can point at a persistent mounted volume in production.
app.use("/uploads", express.static(getUploadsDirectory()));
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
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
      code: err.code,
      details: err.details,
    });
  },
);

export default app;

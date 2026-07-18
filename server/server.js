import express from "express";
import cors from "cors";
import "dotenv/config";

import connectDB from "./configs/db.js";
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { protect } from "./middlewares/auth.js";

const app = express();

const configuredOrigins =
  process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "";

const allowedOrigins = new Set([
  "http://localhost:5173",
  ...configuredOrigins.split(",").map((origin) => origin.trim()),
].filter(Boolean));

const corsOptions = {
  origin(origin, callback) {
    // Allows Postman, curl, Inngest and server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error(`CORS blocked origin: ${origin}`);
    error.status = 403;
    return callback(error);
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: true,
};

// Register CORS before Clerk and all API routes
app.use(cors(corsOptions));

// Express 5-compatible OPTIONS handler
app.options("/{*path}", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

const ensureDatabaseConnection = async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error("Database connection failed:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
};

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HangOut server is running",
  });
});

// Inngest verifies its own requests and must not use application-route auth.
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

// Connect to MongoDB only for application routes
app.use("/api/user", protect, ensureDatabaseConnection, userRouter);
app.use("/api/post", protect, ensureDatabaseConnection, postRouter);
app.use("/api/story", protect, ensureDatabaseConnection, storyRouter);
app.use("/api/message", protect, ensureDatabaseConnection, messageRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  const status =
    error.status ||
    (error.name === "MulterError" || error instanceof SyntaxError ? 400 : 500);

  res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Internal server error"
        : error.message || "Request failed",
  });
});

// Start a listener only during local development
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;

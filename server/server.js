import express from "express";
import cors from "cors";
import "dotenv/config";

import connectDB from "./configs/db.js";
// import { inngest, functions } from "./inngest/index.js";
// import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allows Postman, curl, Inngest and server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
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

let databaseConnection;

const ensureDatabaseConnection = async (req, res, next) => {
  try {
    if (!databaseConnection) {
      databaseConnection = connectDB().catch((error) => {
        databaseConnection = null;
        throw error;
      });
    }

    await databaseConnection;
    next();
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
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

// Inngest should remain accessible without Clerk protection
// app.use(
//   "/api/inngest",
//   serve({
//     client: inngest,
//     functions,
//   })
// );

// Connect to MongoDB only for application routes
app.use("/api/user", ensureDatabaseConnection, userRouter);
app.use("/api/post", ensureDatabaseConnection, postRouter);
app.use("/api/story", ensureDatabaseConnection, storyRouter);
app.use("/api/message", ensureDatabaseConnection, messageRouter);

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
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
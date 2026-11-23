
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { connectDB } from "./config/db.js";

import documentRoutes from "./routes/document.route.js";
import userRoutes from "./routes/user.route.js";
import documentShareRoutes from "./routes/documentShare.route.js";

const app = express();

const allowedOrigins = [
  "https://google-docs-three-mu.vercel.app",
  "http://localhost:5173",
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// CORS middleware MUST come before routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options(/.*/, cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Database connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(503).json({
      success: false,
      message: "Database is unavailable",
    });
  }
});

// API routes
app.use("/", userRoutes);
app.use("/document", documentRoutes);
app.use("/document", documentShareRoutes);

// Homepage
app.get("/", (req, res) => {
  res.send("homepage");
});

export default app;

// Start server only when running directly
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

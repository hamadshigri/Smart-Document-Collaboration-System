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

const allowedOrigins = new Set([
  "https://google-docs-three-mu.vercel.app",
  process.env.FRONTEND_URL?.trim().replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:5137",
].filter(Boolean));

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Database is unavailable",
    });
  }
});

app.use("/", userRoutes);
app.use("/document", documentRoutes);
app.use("/document", documentShareRoutes);

app.get("/", (req, res) => {
  res.send("homepage");
});

export default app;


if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
}

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
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

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true

}));

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


// if (process.env.VERCEL !== "1") {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`server is listening on port ${PORT}`);
//   });
// }

export default app;

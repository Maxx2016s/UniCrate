// Entry point: configures the API and serves the app locally.

require("dotenv").config();

const path = require("path");
const express = require("express");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const parcelRoutes = require("./routes/parcelRoutes");

const app = express();
const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
const publicDirectory = path.join(__dirname, "..", "public");

app.use(express.json());

// Make sure API requests have the required settings and a live database
// connection. The connection promise is shared by this server instance.
app.use("/api", async (req, res, next) => {
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  if (missingEnv.length > 0) {
    console.error(`Missing environment variables: ${missingEnv.join(", ")}`);
    return res
      .status(500)
      .json({ message: "Server configuration is incomplete." });
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/parcels", parcelRoutes);
app.use("/api/auth", authRoutes);

// Unknown API URLs get JSON instead of the website's HTML page.
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

// Vercel serves files from backend/public; this also serves them locally.
app.use(express.static(publicDirectory));

// Error handler (four arguments).
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body." });
  }

  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  if (missingEnv.length > 0) {
    console.error(`Missing environment variables: ${missingEnv.join(", ")}`);
    console.error("Check that backend/.env exists and you started from backend/.");
    process.exitCode = 1;
    return;
  }

  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`UniCrate server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  }
};

// Vercel invokes the exported Express app. Local development starts a listener.
if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer();
}


// Entry point: loads env, connects to the database, mounts routes, serves the frontend.

require("dotenv").config(); // must be first, before anything reads process.env

const path = require("path");
const express = require("express");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const parcelRoutes = require("./routes/parcelRoutes");


const app = express();


// Fail early with a clear message if the .env file is incomplete
const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing environment variables: ${missingEnv.join(", ")}`);
  console.error("Check that backend/.env exists and you started from backend/.");
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use("/api/parcels", parcelRoutes);

// API routes
app.use("/api/auth", authRoutes);

// Unknown /api/... URLs get a JSON 404 instead of an HTML page
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

// Frontend: serves everything in src/public (index.html is the default page)
app.use(express.static(path.join(__dirname, "public")));

// Error handler (4 arguments). Catches bad JSON bodies and anything unexpected.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body." });
  }

  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Something went wrong on the server." });
});

// Connect to the database first, then start listening
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`UniCrate server running on http://localhost:${PORT}`);
  });
};

startServer();

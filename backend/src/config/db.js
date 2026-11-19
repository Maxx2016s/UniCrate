// src/config/db.js
// Creates the shared Prisma client and checks the database connection.

const { PrismaClient } = require("@prisma/client");

// One client for the whole app. Every file imports this same instance.
const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    await prisma.$connect();

    // Real check: ask MongoDB to answer a ping, so wrong credentials
    // or a blocked IP show up now instead of on the first request.
    await prisma.$runCommandRaw({ ping: 1 });

    console.log("Database connected (MongoDB Atlas via Prisma)");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };
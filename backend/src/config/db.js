// Creates the shared Prisma client and checks the database connection.

const { PrismaClient } = require("@prisma/client");

// One client and one connection check are shared by this app instance.
const prisma = new PrismaClient();
let connectionPromise;

const connectDB = () => {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await prisma.$connect();

      // Ask MongoDB to answer a ping, so bad credentials or network access
      // problems are reported before the first database operation.
      await prisma.$runCommandRaw({ ping: 1 });
      console.log("Database connected (MongoDB Atlas via Prisma)");
    })().catch((error) => {
      // Allow a later request to retry if the first connection attempt failed.
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
};

module.exports = { prisma, connectDB };

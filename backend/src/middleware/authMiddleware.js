const jwt = require("jsonwebtoken");
const { prisma } = require("../config/db");

const protect = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Not authorized. Please log in." });
    }

    const token = authHeader.split(" ")[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        registrationNumber: true,
        role: true,
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "User no longer exists. Please log in again." });
    }


    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: "Invalid token. Please log in again." });
    }

    console.error("Auth middleware error:", error.message);
    return res.status(500).json({ message: "Server error during authentication." });
  }
};

module.exports = { protect };

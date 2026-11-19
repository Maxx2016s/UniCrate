// Maps /api/auth/* URLs to controller functions.

const express = require("express");
const router = express.Router();

const { prisma } = require("../config/db");
const { register, login, getMe } = require("../Controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Only ADMIN and EDITOR may create accounts.
// (authController then limits EDITOR to creating VIEWER accounts.)
const staffOnly = authorizeRoles("ADMIN", "EDITOR");

// Gate for POST /register:
//  - If no users exist yet, let the request through without a token,
//    so the very first ADMIN can be created.
//  - Otherwise, require a valid login AND an ADMIN or EDITOR role.
const registerGate = async (req, res, next) => {
  try {
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      return next();
    }

    // Run protect first; only if it succeeds, run the role check.
    return protect(req, res, () => staffOnly(req, res, next));
  } catch (error) {
    console.error("Register gate error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// POST /api/auth/register
router.post("/register", registerGate, register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me
router.get("/me", protect, getMe);

module.exports = router;
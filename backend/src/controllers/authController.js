// register, login and getMe

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/db");

const VALID_ROLES = ["ADMIN", "EDITOR", "VIEWER"];

// Fields that are safe to send back. The password hash is never included.
const safeUserFields = {
  id: true,
  name: true,
  email: true,
  registrationNumber: true,
  role: true,
  createdAt: true,
};

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

// Trim and uppercase so "21cs001 " and "21CS001" are treated as the same number
const normalizeRegistrationNumber = (value) => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toUpperCase();
  return cleaned === "" ? null : cleaned;
};

// POST /api/auth/register
// Allowed: first-ever user (becomes ADMIN), ADMIN (any role), EDITOR (VIEWER only)
const register = async (req, res) => {
  try {
    const body = req.body || {};
    const { name, email, password, role } = body;

    // 1. Basic input validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required." });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({ message: "Invalid input." });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters." });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    // 2. Decide which role the new account gets
    let newRole;

    if (!req.user) {
      // No logged-in user. This is only allowed for the very first account.
      const userCount = await prisma.user.count();

      if (userCount > 0) {
        return res
          .status(401)
          .json({ message: "Not authorized. Please log in." });
      }

      newRole = "ADMIN"; // first account is always the admin
    } else {
      newRole = role ? String(role).toUpperCase() : "VIEWER";

      if (!VALID_ROLES.includes(newRole)) {
        return res
          .status(400)
          .json({ message: "Role must be ADMIN, EDITOR or VIEWER." });
      }

      // EDITOR may only create student (VIEWER) accounts
      if (req.user.role === "EDITOR" && newRole !== "VIEWER") {
        return res.status(403).json({
          message: "Editors can only create student (VIEWER) accounts.",
        });
      }

      // VIEWER can never reach this point (the route blocks them),
      // but we check again so this function is safe on its own.
      if (req.user.role === "VIEWER") {
        return res.status(403).json({
          message: "Access denied. You do not have permission to do this.",
        });
      }
    }

    // 3. Registration number rules
    const registrationNumber = normalizeRegistrationNumber(
      body.registrationNumber
    );

    if (newRole === "VIEWER" && !registrationNumber) {
      return res
        .status(400)
        .json({ message: "Registration number is required for students." });
    }

    // 4. Duplicate checks (email is also protected by a database unique index)
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingEmail) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists." });
    }

    if (registrationNumber) {
      const existingRegNo = await prisma.user.findFirst({
        where: { registrationNumber },
      });

      if (existingRegNo) {
        return res.status(409).json({
          message: "A user with this registration number already exists.",
        });
      }
    }

    // 5. Hash the password and save the user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        registrationNumber,
        role: newRole,
      },
      select: safeUserFields,
    });

    return res
      .status(201)
      .json({ message: "User registered successfully.", user });
  } catch (error) {
    // P2002 = unique constraint failed (two requests with the same email at once)
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: "A user with this email already exists." });
    }

    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Server error during registration." });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input." });
    }

    // We need the password hash here, so no "select" that hides it
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Same message for "no such email" and "wrong password",
    // so attackers cannot find out which emails are registered.
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // The token only carries the user id. The role is read from the
    // database on every request (see authMiddleware.js).
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        registrationNumber: user.registrationNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Server error during login." });
  }
};

// GET /api/auth/me
// protect has already loaded the user (without password) into req.user
const getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

module.exports = { register, login, getMe };
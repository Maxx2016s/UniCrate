// src/routes/parcelRoutes.js
// Maps /api/parcels/* URLs to controller functions.

const express = require("express");
const router = express.Router();

const {
  createParcel,
  getParcels,
  getParcelById,
  updateParcel,
  collectParcel,
  deleteParcel,
  getParcelStats,
} = require("../Controllers/parcelController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Every parcel route requires a logged-in user
router.use(protect);

const staffOnly = authorizeRoles("ADMIN", "EDITOR");
const adminOnly = authorizeRoles("ADMIN");

// Open to all logged-in users (the controller limits students to their own parcels)
router.get("/", getParcels);

// IMPORTANT: /stats must be declared BEFORE /:id,
// otherwise Express would treat the word "stats" as a parcel ID.
router.get("/stats", getParcelStats);

router.get("/:id", getParcelById);

// Staff only
router.post("/", staffOnly, createParcel);
router.put("/:id", staffOnly, updateParcel);
router.patch("/:id/collect", staffOnly, collectParcel);

// Admin only
router.delete("/:id", adminOnly, deleteParcel);

module.exports = router;

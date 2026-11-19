// src/controllers/parcelController.js
// Parcel CRUD, search/filter, collection and dashboard stats.

const { prisma } = require("../config/db");
const generateTrackingId = require("../utils/generateTrackingId");

const VALID_STATUSES = ["PENDING", "COLLECTED"];
const MAX_TRACKING_ID_ATTEMPTS = 5;

// Only these user fields are ever sent back (never the password hash)
const userSummary = { id: true, name: true, email: true, role: true };

// Attached to every parcel we return
const parcelInclude = {
  registeredBy: { select: userSummary },
  collectedBy: { select: userSummary },
};

// ---------- Helpers ----------

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

// Returns a trimmed string, or null if the value is not a non-empty string
const cleanText = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

// Same normalization as authController, so student numbers always match
const normalizeRegNo = (value) => {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.toUpperCase() : null;
};

// Returns a Date, or null if the value is not a valid date
const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// THE PRIVACY RULE:
// A student can only ever see parcels with their own registration number.
// This comes from req.user (loaded from the database), never from the request.
// Staff get an empty filter, which means "all parcels".
const accessFilter = (user) => {
  if (user.role === "VIEWER") {
    // Empty string matches nothing, because parcels always have a number
    return { studentRegistrationNumber: user.registrationNumber || "" };
  }
  return {};
};

// ---------- Controllers ----------

// POST /api/parcels
const createParcel = async (req, res) => {
  try {
    const body = req.body || {};

    const studentName = cleanText(body.studentName);
    const studentRegistrationNumber = normalizeRegNo(
      body.studentRegistrationNumber
    );
    const studentEmail = cleanText(body.studentEmail);
    const courierName = cleanText(body.courierName);

    if (
      !studentName ||
      !studentRegistrationNumber ||
      !studentEmail ||
      !courierName
    ) {
      return res.status(400).json({
        message:
          "Student name, registration number, student email and courier name are required.",
      });
    }

    const cleanEmail = studentEmail.toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid student email." });
    }

    // Optional fields
    let description = null;
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== "string") {
        return res.status(400).json({ message: "Invalid description." });
      }
      description = cleanText(body.description);
    }

    let arrivalDate;
    if (
      body.arrivalDate !== undefined &&
      body.arrivalDate !== null &&
      body.arrivalDate !== ""
    ) {
      arrivalDate = parseDate(body.arrivalDate);
      if (!arrivalDate) {
        return res.status(400).json({ message: "Invalid arrival date." });
      }
    }
    // If arrivalDate stays undefined, the schema default (now) is used.

    // Create the parcel. If the random tracking ID happens to exist already
    // (Prisma error P2002), generate a new one and try again.
    let parcel = null;

    for (let attempt = 1; attempt <= MAX_TRACKING_ID_ATTEMPTS; attempt++) {
      try {
        parcel = await prisma.parcel.create({
          data: {
            trackingId: generateTrackingId(),
            studentName,
            studentRegistrationNumber,
            studentEmail: cleanEmail,
            courierName,
            description,
            arrivalDate,
            registeredById: req.user.id,
          },
          include: parcelInclude,
        });
        break;
      } catch (error) {
        if (error.code !== "P2002" || attempt === MAX_TRACKING_ID_ATTEMPTS) {
          throw error;
        }
      }
    }

    return res
      .status(201)
      .json({ message: "Parcel registered successfully.", parcel });
  } catch (error) {
    console.error("Create parcel error:", error.message);
    return res.status(500).json({ message: "Server error while registering parcel." });
  }
};

// GET /api/parcels?search=...&status=PENDING
const getParcels = async (req, res) => {
  try {
    const { search, status } = req.query;

    // Every condition goes into this list and is combined with AND.
    // The privacy filter is always first, so a search can never widen it.
    const conditions = [accessFilter(req.user)];

    if (status !== undefined && status !== "") {
      const cleanStatus = typeof status === "string" ? status.toUpperCase() : "";

      if (!VALID_STATUSES.includes(cleanStatus)) {
        return res
          .status(400)
          .json({ message: "Status must be PENDING or COLLECTED." });
      }

      conditions.push({ status: cleanStatus });
    }

    if (typeof search === "string" && search.trim() !== "") {
      const term = search.trim();

      conditions.push({
        OR: [
          { trackingId: { contains: term, mode: "insensitive" } },
          { studentName: { contains: term, mode: "insensitive" } },
          { studentRegistrationNumber: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    const parcels = await prisma.parcel.findMany({
      where: { AND: conditions },
      include: parcelInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ count: parcels.length, parcels });
  } catch (error) {
    console.error("Get parcels error:", error.message);
    return res.status(500).json({ message: "Server error while fetching parcels." });
  }
};

// GET /api/parcels/:id
const getParcelById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid parcel ID." });
    }

    // The privacy filter is part of the query itself. A student asking for
    // someone else's parcel gets 404, so they can't even tell it exists.
    const parcel = await prisma.parcel.findFirst({
      where: { id, ...accessFilter(req.user) },
      include: parcelInclude,
    });

    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found." });
    }

    return res.status(200).json({ parcel });
  } catch (error) {
    console.error("Get parcel error:", error.message);
    return res.status(500).json({ message: "Server error while fetching parcel." });
  }
};

// PUT /api/parcels/:id
// Updates only the fields that are sent. Status, tracking ID and collection
// details cannot be changed here (collecting has its own endpoint).
const updateParcel = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid parcel ID." });
    }

    const data = {};

    // Required text fields: if sent, they must not be empty
    for (const field of ["studentName", "courierName"]) {
      if (body[field] !== undefined) {
        const value = cleanText(body[field]);
        if (!value) {
          return res.status(400).json({ message: `${field} cannot be empty.` });
        }
        data[field] = value;
      }
    }

    if (body.studentRegistrationNumber !== undefined) {
      const regNo = normalizeRegNo(body.studentRegistrationNumber);
      if (!regNo) {
        return res
          .status(400)
          .json({ message: "studentRegistrationNumber cannot be empty." });
      }
      data.studentRegistrationNumber = regNo;
    }

    if (body.studentEmail !== undefined) {
      const email = cleanText(body.studentEmail);
      if (!email || !isValidEmail(email.toLowerCase())) {
        return res
          .status(400)
          .json({ message: "Please enter a valid student email." });
      }
      data.studentEmail = email.toLowerCase();
    }

    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== "string") {
        return res.status(400).json({ message: "Invalid description." });
      }
      data.description = cleanText(body.description); // empty text clears it
    }

    if (body.arrivalDate !== undefined) {
      const date = parseDate(body.arrivalDate);
      if (!date) {
        return res.status(400).json({ message: "Invalid arrival date." });
      }
      data.arrivalDate = date;
    }

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields were provided to update." });
    }

    const existing = await prisma.parcel.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Parcel not found." });
    }

    const parcel = await prisma.parcel.update({
      where: { id },
      data,
      include: parcelInclude,
    });

    return res
      .status(200)
      .json({ message: "Parcel updated successfully.", parcel });
  } catch (error) {
    // P2025 = record vanished between the check and the update
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Parcel not found." });
    }

    console.error("Update parcel error:", error.message);
    return res.status(500).json({ message: "Server error while updating parcel." });
  }
};

// PATCH /api/parcels/:id/collect
// Marks a parcel as collected and records when and by whom.
const collectParcel = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid parcel ID." });
    }

    const existing = await prisma.parcel.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Parcel not found." });
    }

    if (existing.status === "COLLECTED") {
      return res
        .status(409)
        .json({ message: "This parcel has already been collected." });
    }

    const parcel = await prisma.parcel.update({
      where: { id },
      data: {
        status: "COLLECTED",
        collectedAt: new Date(),
        collectedById: req.user.id,
      },
      include: parcelInclude,
    });

    return res
      .status(200)
      .json({ message: "Parcel marked as collected.", parcel });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Parcel not found." });
    }

    console.error("Collect parcel error:", error.message);
    return res.status(500).json({ message: "Server error while updating parcel." });
  }
};

// DELETE /api/parcels/:id
const deleteParcel = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid parcel ID." });
    }

    const existing = await prisma.parcel.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Parcel not found." });
    }

    await prisma.parcel.delete({ where: { id } });

    return res.status(200).json({ message: "Parcel deleted successfully." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Parcel not found." });
    }

    console.error("Delete parcel error:", error.message);
    return res.status(500).json({ message: "Server error while deleting parcel." });
  }
};

// GET /api/parcels/stats
// Dashboard numbers. For students, the numbers cover only their own parcels.
const getParcelStats = async (req, res) => {
  try {
    const scope = accessFilter(req.user);

    const [total, pending, collected, recent] = await Promise.all([
      prisma.parcel.count({ where: scope }),
      prisma.parcel.count({ where: { AND: [scope, { status: "PENDING" }] } }),
      prisma.parcel.count({ where: { AND: [scope, { status: "COLLECTED" }] } }),
      prisma.parcel.findMany({
        where: scope,
        include: parcelInclude,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return res.status(200).json({
      stats: { total, pending, collected },
      recentParcels: recent,
    });
  } catch (error) {
    console.error("Parcel stats error:", error.message);
    return res.status(500).json({ message: "Server error while loading stats." });
  }
};

module.exports = {
  createParcel,
  getParcels,
  getParcelById,
  updateParcel,
  collectParcel,
  deleteParcel,
  getParcelStats,
};

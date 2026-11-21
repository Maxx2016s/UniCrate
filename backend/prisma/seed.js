// Adds a small, repeatable set of fictional records for a UniCrate demo.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;

const ensureUser = async ({ name, email, role, registrationNumber }, passwordHash) => {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const existingRegistrationNumber = existing.registrationNumber || null;
    const expectedRegistrationNumber = registrationNumber || null;
    if (
      existing.role !== role ||
      existingRegistrationNumber !== expectedRegistrationNumber
    ) {
      throw new Error(
        "Demo email already exists with different account details: " + email
      );
    }
    return existing;
  }

  if (registrationNumber) {
    const existingStudent = await prisma.user.findFirst({
      where: { registrationNumber },
    });
    if (existingStudent) {
      throw new Error(
        "Demo registration number is already assigned to another account: " +
          registrationNumber
      );
    }
  }

  return prisma.user.create({
    data: {
      name,
      email,
      role,
      registrationNumber: registrationNumber || null,
      password: passwordHash,
    },
  });
};

const main = async () => {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error(
      "Set SEED_DEMO_PASSWORD in backend/.env to a private password of at least 8 characters."
    );
  }

  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const admin = await ensureUser({
    name: "UniCrate Demo Admin",
    email: "admin@demo.unicrate.test",
    role: "ADMIN",
  }, passwordHash);
  const staff = await ensureUser({
    name: "Demo Parcel Desk",
    email: "desk@demo.unicrate.test",
    role: "EDITOR",
  }, passwordHash);
  const studentOne = await ensureUser({
    name: "Aarav Mehta",
    email: "aarav@demo.unicrate.test",
    role: "VIEWER",
    registrationNumber: "UC-DEMO-001",
  }, passwordHash);
  const studentTwo = await ensureUser({
    name: "Mira Kapoor",
    email: "mira@demo.unicrate.test",
    role: "VIEWER",
    registrationNumber: "UC-DEMO-002",
  }, passwordHash);

  const parcels = [
    { trackingId: "DEMO-UC-001", student: studentOne, courierName: "Delhivery", description: "Course books", daysAgo: 0, status: "PENDING" },
    { trackingId: "DEMO-UC-002", student: studentOne, courierName: "India Post", description: "Official documents", daysAgo: 2, status: "COLLECTED" },
    { trackingId: "DEMO-UC-003", student: studentOne, courierName: "Blue Dart", description: "Laptop accessory", daysAgo: 1, status: "PENDING" },
    { trackingId: "DEMO-UC-004", student: studentOne, courierName: "Amazon Logistics", description: "Personal care package", daysAgo: 5, status: "COLLECTED" },
    { trackingId: "DEMO-UC-005", student: studentTwo, courierName: "Delhivery", description: "Stationery", daysAgo: 0, status: "PENDING" },
    { trackingId: "DEMO-UC-006", student: studentTwo, courierName: "India Post", description: "Family parcel", daysAgo: 4, status: "COLLECTED" },
    { trackingId: "DEMO-UC-007", student: studentTwo, courierName: "Blue Dart", description: "Research papers", daysAgo: 3, status: "PENDING" },
    { trackingId: "DEMO-UC-008", student: studentOne, courierName: "Amazon Logistics", description: "Winter clothing", daysAgo: 6, status: "PENDING" },
  ];

  let addedParcels = 0;
  for (const item of parcels) {
    const existing = await prisma.parcel.findUnique({
      where: { trackingId: item.trackingId },
    });
    if (existing) continue;

    const arrivalDate = new Date(Date.now() - item.daysAgo * DAY_MS);
    const isCollected = item.status === "COLLECTED";
    await prisma.parcel.create({
      data: {
        trackingId: item.trackingId,
        studentName: item.student.name,
        studentRegistrationNumber: item.student.registrationNumber,
        studentEmail: item.student.email,
        courierName: item.courierName,
        description: item.description,
        arrivalDate,
        status: item.status,
        collectedAt: isCollected ? new Date(arrivalDate.getTime() + 3 * 60 * 60 * 1000) : null,
        registeredById: staff.id,
        collectedById: isCollected ? staff.id : null,
      },
    });
    addedParcels += 1;
  }

  console.log("Demo accounts: admin@demo.unicrate.test, desk@demo.unicrate.test, aarav@demo.unicrate.test, mira@demo.unicrate.test");
  console.log("The password for newly created accounts comes from SEED_DEMO_PASSWORD in backend/.env.");
  console.log("Added " + addedParcels + " missing demo parcels. Existing demo parcels were left unchanged.");
  console.log("Admin account ready: " + admin.email);
};

main()
  .catch((error) => {
    console.error("Demo data setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

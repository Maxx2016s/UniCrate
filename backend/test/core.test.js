// Basic checks for role access, student parcel privacy, and tracking IDs.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/unicrate_test";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { authorizeRoles } = require("../src/middleware/roleMiddleware");
const { getParcels } = require("../src/controllers/parcelController");
const { prisma } = require("../src/config/db");
const generateTrackingId = require("../src/utils/generateTrackingId");

const createResponse = () => ({
  statusCode: null,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

test("staff role checks reject signed-out users and students", () => {
  const staffOnly = authorizeRoles("ADMIN", "EDITOR");
  let nextCalled = false;

  const signedOutResponse = createResponse();
  staffOnly({ user: null }, signedOutResponse, () => {
    nextCalled = true;
  });
  assert.equal(signedOutResponse.statusCode, 401);
  assert.equal(nextCalled, false);

  const studentResponse = createResponse();
  staffOnly({ user: { role: "VIEWER" } }, studentResponse, () => {
    nextCalled = true;
  });
  assert.equal(studentResponse.statusCode, 403);
  assert.equal(nextCalled, false);

  staffOnly({ user: { role: "EDITOR" } }, createResponse(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test("parcel queries keep each student's registration number in the privacy filter", async () => {
  const originalFindMany = prisma.parcel.findMany;
  const capturedQueries = [];
  prisma.parcel.findMany = async (query) => {
    capturedQueries.push(query);
    return [];
  };

  try {
    const firstResponse = createResponse();
    await getParcels({
      user: { role: "VIEWER", registrationNumber: "UC-DEMO-001" },
      query: { search: "books", status: "PENDING" },
    }, firstResponse);

    const secondResponse = createResponse();
    await getParcels({
      user: { role: "VIEWER", registrationNumber: "UC-DEMO-002" },
      query: {},
    }, secondResponse);

    const staffResponse = createResponse();
    await getParcels({
      user: { role: "EDITOR", registrationNumber: null },
      query: {},
    }, staffResponse);

    assert.equal(firstResponse.statusCode, 200);
    assert.equal(secondResponse.statusCode, 200);
    assert.equal(staffResponse.statusCode, 200);
    assert.deepEqual(capturedQueries[0].where.AND[0], {
      studentRegistrationNumber: "UC-DEMO-001",
    });
    assert.deepEqual(capturedQueries[1].where.AND[0], {
      studentRegistrationNumber: "UC-DEMO-002",
    });
    assert.deepEqual(capturedQueries[2].where.AND[0], {});
    assert.equal(capturedQueries[0].where.AND[1].status, "PENDING");
  } finally {
    prisma.parcel.findMany = originalFindMany;
  }
});

test("tracking IDs use the readable campus format", () => {
  const trackingId = generateTrackingId();
  assert.match(trackingId, /^UC-\d{8}-[A-HJ-NP-Z2-9]{6}$/);
});

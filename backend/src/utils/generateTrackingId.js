// src/utils/generateTrackingId.js
// Generates tracking IDs like UC-20261119-A7F3K2

const crypto = require("crypto");

// Letters and digits, without look-alike characters (0/O, 1/I)
// so staff can read IDs aloud or copy them from paper without mistakes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 6;

const generateTrackingId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;

  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }

  return `UC-${datePart}-${suffix}`;
};

module.exports = generateTrackingId;
import { aesDecrypt } from "./serverCrypto.js"; // ← zero-install helper

const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET; // set in .env

// ─── decryptPayload ───────────────────────────────────────────────────────────
// Decrypts req.body.encrypted (set by SignIn.tsx → encryptBody)

export const decryptPayload = (req, res, next) => {
  if (req.body?.encrypted) {
    try {
      const decrypted = aesDecrypt(req.body.encrypted, PAYLOAD_SECRET);
      req.body = JSON.parse(decrypted);
    } catch (error) {
      console.error("Payload Decryption Error:", error.message);
      return res.status(400).json({ message: "Invalid encrypted payload" });
    }
  }
  next();
};

// ─── decryptHeaders ───────────────────────────────────────────────────────────
// Decrypts x-file-name and x-file-path headers (set by FileUploadDownload.js → encryptHeader)

export const decryptHeaders = (req, res, next) => {
  try {
    if (req.headers["x-file-name"]) {
      req.headers["x-file-name"] = aesDecrypt(
        decodeURIComponent(req.headers["x-file-name"]),
        PAYLOAD_SECRET,
      );
    }

    if (req.headers["x-file-path"]) {
      req.headers["x-file-path"] = aesDecrypt(
        decodeURIComponent(req.headers["x-file-path"]),
        PAYLOAD_SECRET,
      );
    }
  } catch (error) {
    console.error("Header Decryption Error:", error.message);
    return res.status(400).json({ message: "Invalid encrypted headers" });
  }

  next();
};

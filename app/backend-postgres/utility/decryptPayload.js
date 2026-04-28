import CryptoJS from "crypto-js";

const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET; // 32-char secret, set in .env

export const decryptPayload = (req, res, next) => {
  if (req.body?.encrypted) {
    try {
      const bytes = CryptoJS.AES.decrypt(req.body.encrypted, PAYLOAD_SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      req.body = JSON.parse(decrypted);
    } catch {
      return res.status(400).json({ message: "Invalid encrypted payload" });
    }
  }
  next();
};

export const decryptHeaders = (req, res, next) => {
  try {
    if (req.headers["x-file-name"]) {
      const bytes = CryptoJS.AES.decrypt(
        decodeURIComponent(req.headers["x-file-name"]),
        PAYLOAD_SECRET,
      );
      req.headers["x-file-name"] = bytes.toString(CryptoJS.enc.Utf8);
    }
    if (req.headers["x-file-path"]) {
      const bytes = CryptoJS.AES.decrypt(
        decodeURIComponent(req.headers["x-file-path"]),
        PAYLOAD_SECRET,
      );
      req.headers["x-file-path"] = bytes.toString(CryptoJS.enc.Utf8);
    }
  } catch {
    return res.status(400).json({ message: "Invalid encrypted headers" });
  }
  next();
};

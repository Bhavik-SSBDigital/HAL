/**
 * serverCrypto.js (Node.js backend)
 * Matches the Pure CryptoJS AES-CBC format coming from the frontend.
 * ZERO npm installs required (uses Node's built-in 'crypto').
 */

import crypto from "crypto";

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Standard EVP_BytesToKey implementation used by CryptoJS to derive
 * the Key and IV from a password and salt using MD5.
 */
function evpBytesToKey(password, salt, keyLen, ivLen) {
  const passbuf = Buffer.from(password, "utf8");
  let currentHash = Buffer.alloc(0);
  const generatedBytes = [];

  while (Buffer.concat(generatedBytes).length < keyLen + ivLen) {
    const hash = crypto.createHash("md5");
    hash.update(currentHash);
    hash.update(passbuf);
    hash.update(salt);
    currentHash = hash.digest();
    generatedBytes.push(currentHash);
  }

  const combined = Buffer.concat(generatedBytes);
  return {
    key: combined.subarray(0, keyLen),
    iv: combined.subarray(keyLen, keyLen + ivLen),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Decrypt a Base64 string encrypted by CryptoJS on the frontend.
 *
 * @param {string} b64Ciphertext  Base64 string from browser
 * @param {string} passphrase     PAYLOAD_SECRET
 * @returns {string}              Decrypted plain-text string
 */
export function aesDecrypt(b64Ciphertext, passphrase) {
  const encryptedBytes = Buffer.from(b64Ciphertext, "base64");

  // CryptoJS standard format prefixes the payload with "Salted__" (8 bytes)
  if (encryptedBytes.toString("utf8", 0, 8) !== "Salted__") {
    throw new Error("Invalid payload: Missing CryptoJS Salted__ prefix.");
  }

  // Next 8 bytes are the salt, the rest is the actual ciphertext
  const salt = encryptedBytes.subarray(8, 16);
  const ciphertext = encryptedBytes.subarray(16);

  // Derive the 32-byte key and 16-byte IV
  const { key, iv } = evpBytesToKey(passphrase, salt, 32, 16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plain.toString("utf8");
}

/**
 * Encrypt a string value back into CryptoJS format (useful for server→browser).
 *
 * @param {string} value
 * @param {string} passphrase
 * @returns {string}  Base64-encoded ciphertext
 */
export function aesEncrypt(value, passphrase) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(passphrase, salt, 32, 16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  // Pack: "Salted__" (8) + salt(8) + ciphertext
  return Buffer.concat([
    Buffer.from("Salted__", "utf8"),
    salt,
    encrypted,
  ]).toString("base64");
}

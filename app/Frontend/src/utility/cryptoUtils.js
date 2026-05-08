/**
 * cryptoUtils.js — TRUE UNIVERSAL SAFE VERSION
 * Exclusively uses CryptoJS to guarantee matching outputs between
 * an HTTP Browser Frontend and a Node Backend.
 */

// Import the local file you created in Step 1
import CryptoJS from '../lib/crypto-js.js';

// ─────────────────────────────────────────
// MAIN API (Pure CryptoJS)
// ─────────────────────────────────────────

export async function aesEncrypt(value, passphrase) {
  // CryptoJS is synchronous, but we keep async/await to prevent
  // breaking your existing SignIn.tsx and FileUploadDownload.js
  return CryptoJS.AES.encrypt(String(value), passphrase).toString();
}

export async function aesDecrypt(ciphertext, passphrase) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

  if (!decryptedData) {
    throw new Error('Decryption failed. Invalid passphrase or corrupted data.');
  }

  return decryptedData;
}

export async function encryptHeader(value, passphrase) {
  const enc = await aesEncrypt(value, passphrase);
  return encodeURIComponent(enc);
}

export async function encryptBody(data, passphrase) {
  const enc = await aesEncrypt(JSON.stringify(data), passphrase);
  return { encrypted: enc };
}

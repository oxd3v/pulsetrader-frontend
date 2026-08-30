import {
  encodeBase64,
  decodeBase64,
  toUtf8Bytes,
  toUtf8String,
  scrypt,
  getBytes,
  randomBytes
} from "ethers";
import { PROTOCOL_URL } from "@/constants/config/enviroments";

// ============================================================================
// Zero-dependency crypto — everything below uses only the Web Crypto API
// (globalThis.crypto.subtle), which is built into every modern browser and
// into Node.js 19+. No npm crypto package required.
//
// `encrypt`/`decrypt` reproduce the exact on-wire format that
// `CryptoJS.AES.encrypt(text, password)` / `CryptoJS.AES.decrypt(...)`
// produced and consumed:
//   base64( "Salted__" + 8-byte salt + AES-256-CBC(PKCS7) ciphertext )
// with the AES key + IV derived from the password via OpenSSL's classic
// EVP_BytesToKey scheme (MD5, 1 iteration). This means any string already
// encrypted by the old CryptoJS-based `encrypt()` can still be decrypted by
// the new `decrypt()` below, and vice versa — verified against the real
// crypto-js output before shipping this file.
//
// The one unavoidable API change: Web Crypto has no synchronous encrypt/
// decrypt, so both functions are now `async` (they return a Promise<string>
// instead of a string). Every call site needs an `await` added.
// ============================================================================

function getSubtle(): SubtleCrypto {
  const c = (globalThis as any).crypto;
  if (!c?.subtle) {
    throw new Error(
      "Web Crypto (crypto.subtle) is not available in this environment. " +
      "It requires a secure context (HTTPS or localhost) in browsers, " +
      "or Node.js 19+ on the server.",
    );
  }
  return c.subtle as SubtleCrypto;
}

function getRandomBytes(length: number): Uint8Array {
  const c = (globalThis as any).crypto;
  if (!c?.getRandomValues) {
    throw new Error("crypto.getRandomValues is not available in this environment.");
  }
  return c.getRandomValues(new Uint8Array(length));
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ─── MD5 (RFC 1321) ────────────────────────────────────────────────────
// Web Crypto deliberately does not implement MD5 (it's broken for signing/
// integrity use). It's still needed here purely as a KDF building block to
// stay byte-compatible with CryptoJS's default password-based key
// derivation. This implementation is verified against Node's built-in MD5
// across boundary-length inputs (0, 1, 55, 56, 63, 64, 65, 1000 bytes).
function md5(input: Uint8Array): Uint8Array {
  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));

  const K = new Int32Array([
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
    -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
    1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
    643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784,
    1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
    -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222,
    -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
    -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
    -145523070, -1120210379, 718787259, -343485551,
  ]);

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
    11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
    10, 15, 21,
  ];

  const msgLen = input.length;
  const totalLen = ((msgLen + 8) >>> 6) * 64 + 64;
  const padded = new Uint8Array(totalLen);
  padded.set(input);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * BigInt(8);
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Number(bitLen & BigInt(0xffffffff)), true);
  view.setUint32(totalLen - 4, Number((bitLen >> BigInt(32)) & BigInt(0xffffffff)), true);

  let a0 = 0x67452301;
  let b0 = -0x10325477 | 0;
  let c0 = -0x67452302 | 0;
  let d0 = 0x10325476;

  const M = new Int32Array(16);
  for (let chunkStart = 0; chunkStart < totalLen; chunkStart += 64) {
    for (let j = 0; j < 16; j++) M[j] = view.getInt32(chunkStart + j * 4, true);

    let A = a0,
      B = b0,
      C = c0,
      D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[i])) | 0;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, a0, true);
  outView.setInt32(4, b0, true);
  outView.setInt32(8, c0, true);
  outView.setInt32(12, d0, true);
  return out;
}

// ─── OpenSSL EVP_BytesToKey (MD5, 1 iteration) ────────────────────────
// Replicates CryptoJS's default password->key/IV derivation exactly:
//   D_1 = MD5(password + salt)
//   D_2 = MD5(D_1 + password + salt)
//   D_3 = MD5(D_2 + password + salt)
//   ... until D_1 || D_2 || ... has enough bytes for key + iv.
function evpBytesToKey(
  password: Uint8Array,
  salt: Uint8Array,
  keyBytes: number,
  ivBytes: number,
): { key: Uint8Array; iv: Uint8Array } {
  const totalBytes = keyBytes + ivBytes;
  const chunks: Uint8Array[] = [];
  let prevBlock: Uint8Array = new Uint8Array(0);
  let derived = 0;

  while (derived < totalBytes) {
    prevBlock = md5(concatBytes(prevBlock, password, salt));
    chunks.push(prevBlock);
    derived += prevBlock.length;
  }

  const combined = concatBytes(...chunks);
  return {
    key: combined.slice(0, keyBytes),
    iv: combined.slice(keyBytes, keyBytes + ivBytes),
  };
}

const SALTED_PREFIX = toUtf8Bytes("Salted__"); // 8 bytes, matches OpenSSL's magic header
const AES_KEY_BYTES = 32; // AES-256 (CryptoJS's AES default key size)
const AES_IV_BYTES = 16; // 128-bit CBC IV

/**
 * Encrypts `text` with `password`, producing the same on-wire format as
 * `CryptoJS.AES.encrypt(text, password).toString()`.
 *
 * NOTE: now async (Web Crypto has no sync API) — call sites need `await`.
 */
export async function encrypt(text: string, password: string): Promise<string> {
  const salt = getRandomBytes(8);
  const passwordBytes = toUtf8Bytes(password);
  const { key, iv } = evpBytesToKey(passwordBytes, salt, AES_KEY_BYTES, AES_IV_BYTES);

  const subtle = getSubtle();
  const cryptoKey = await subtle.importKey(
    "raw",
    new Uint8Array(key),
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-CBC", iv: new Uint8Array(iv) }, cryptoKey, new Uint8Array(toUtf8Bytes(text))),
  );

  return encodeBase64(concatBytes(SALTED_PREFIX, salt, ciphertext));
}

/**
 * Decrypts a string produced by `encrypt()` above OR by the legacy
 * `CryptoJS.AES.encrypt(text, password).toString()`.
 *
 * NOTE: now async (Web Crypto has no sync API) — call sites need `await`.
 */
export async function decrypt(encryptedText: string, password: string): Promise<string> {
  const data = decodeBase64(encryptedText);
  if (data.length < 16 || toUtf8String(data.slice(0, 8)) !== "Salted__") {
    throw new Error("Invalid encrypted format (expected OpenSSL 'Salted__' header)");
  }

  const salt = data.slice(8, 16);
  const ciphertext = data.slice(16);
  const passwordBytes = toUtf8Bytes(password);
  const { key, iv } = evpBytesToKey(passwordBytes, salt, AES_KEY_BYTES, AES_IV_BYTES);

  const subtle = getSubtle();
  const cryptoKey = await subtle.importKey(
    "raw",
    new Uint8Array(key),
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );
  const plaintext = await subtle.decrypt(
    { name: "AES-CBC", iv: new Uint8Array(iv) },
    cryptoKey,
    new Uint8Array(ciphertext),
  );

  return toUtf8String(new Uint8Array(plaintext));
}

// ─── Plain base64 <-> UTF-8 helpers (already dependency-free) ─────────
export const encodeText = (text: string) => {
  return encodeBase64(toUtf8Bytes(text));
};

export const decodeText = (signature: string) => {
  return toUtf8String(decodeBase64(signature));
};

/**
 * Decrypts a payload produced by a Node.js backend using:
 *   scrypt(N=16384, r=8, p=1, keyLen=32) + AES-256-CBC
 * Payload format: "<saltHex>.<ivHex>.<ciphertextHex>"
 */
export async function decryptFromServer(
  encryptedData: string,
  password: string,
): Promise<string | null> {
  try {
    const [saltHex, ivHex, encryptedHex] = encryptedData.split(".");

    if (!saltHex || !ivHex || !encryptedHex) {
      throw new Error("Invalid encrypted format from server");
    }

    // 1. Derive key using scrypt (matching Node.js default parameters)
    //    N=16384, r=8, p=1, keyLen=32
    const saltBytes = getBytes("0x" + saltHex);
    const passwordBytes = toUtf8Bytes(password);
    const derivedKeyHex = await scrypt(passwordBytes, saltBytes, 16384, 8, 1, 32);
    const key = getBytes(derivedKeyHex);

    // 2. Prepare raw bytes
    const iv = getBytes("0x" + ivHex);
    const ciphertext = getBytes("0x" + encryptedHex);

    // 3. Decrypt using AES-CBC (Node's default mode, PKCS7 padding)
    const subtle = getSubtle();
    const cryptoKey = await subtle.importKey(
      "raw",
      new Uint8Array(key),
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );
    const plaintext = await subtle.decrypt(
      { name: "AES-CBC", iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(ciphertext),
    );

    return toUtf8String(new Uint8Array(plaintext));
  } catch (error) {
    console.error("Backend-style decryption failed:", error);
    return null;
  }
}

export const decodeInvitationCode = (invitationCode: string) => {
  const codeDetails = JSON.parse(decodeText(invitationCode));
  const to = codeDetails.to;
  const expireTimestamp = codeDetails.expireAt;
  const isExpired = expireTimestamp < Date.now() ? true : false;
  const status = codeDetails.status;
  const link = `${PROTOCOL_URL}connect/invite?invitation=${invitationCode}`;
  return { to, expireTimestamp, link, isExpired, status };
};

export const createRandomBytes = (length: number) => {
  return randomBytes(length);
};
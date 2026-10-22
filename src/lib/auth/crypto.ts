import crypto from "node:crypto";

/**
 * Generates a random cryptographic salt.
 */
export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hashes a plaintext password using PBKDF2 with HMAC-SHA256 and salt.
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
}

/**
 * Securely verifies a candidate password against an existing hash and salt.
 */
export function verifyPassword(
  candidate: string,
  storedHash: string,
  salt: string
): boolean {
  const candidateHash = hashPassword(candidate, salt);
  try {
    const hashBuffer = Buffer.from(storedHash, "hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    if (hashBuffer.length !== candidateBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
  } catch {
    return false;
  }
}

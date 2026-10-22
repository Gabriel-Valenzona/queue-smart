import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSalt,
  hashPassword,
  verifyPassword,
} from "../../src/lib/auth/crypto";

describe("Cryptographic Utilities", () => {
  it("should generate random hex salt of specified length", () => {
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    assert.equal(salt1.length, 32); // 16 bytes = 32 hex chars
    assert.equal(salt2.length, 32);
    assert.notEqual(salt1, salt2);
  });

  it("should produce deterministic hashes for identical inputs", () => {
    const salt = generateSalt();
    const hash1 = hashPassword("TestPassword123!", salt);
    const hash2 = hashPassword("TestPassword123!", salt);
    assert.equal(hash1, hash2);
  });

  it("should produce different hashes for different salts", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = hashPassword("TestPassword123!", salt1);
    const hash2 = hashPassword("TestPassword123!", salt2);
    assert.notEqual(hash1, hash2);
  });

  it("should correctly verify valid passwords", () => {
    const salt = generateSalt();
    const hash = hashPassword("MyCorrectPassword!", salt);
    const isValid = verifyPassword("MyCorrectPassword!", hash, salt);
    assert.equal(isValid, true);
  });

  it("should reject incorrect passwords", () => {
    const salt = generateSalt();
    const hash = hashPassword("MyCorrectPassword!", salt);
    const isValid = verifyPassword("WrongPassword!", hash, salt);
    assert.equal(isValid, false);
  });

  it("should handle corrupted or mismatched hash lengths gracefully", () => {
    const salt = generateSalt();
    const isValid = verifyPassword("MyPassword!", "invalid_hex", salt);
    assert.equal(isValid, false);
  });
});

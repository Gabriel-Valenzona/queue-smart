import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateRegisterInput,
  validateLoginInput,
  LIMITS,
} from "../../src/lib/auth/validation";

describe("Authentication Validation Rules", () => {
  describe("validateRegisterInput", () => {
    it("should reject non-object or null payloads", () => {
      const nullResult = validateRegisterInput(null);
      assert.equal(nullResult.valid, false);
      assert.ok(nullResult.errors._general);

      const arrayResult = validateRegisterInput([1, 2, 3]);
      assert.equal(arrayResult.valid, false);
      assert.ok(arrayResult.errors._general);

      const stringResult = validateRegisterInput("not an object");
      assert.equal(stringResult.valid, false);
      assert.ok(stringResult.errors._general);
    });

    it("should require email and password", () => {
      const result = validateRegisterInput({});
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, "Email address is required.");
      assert.equal(result.errors.password, "Password is required.");
    });

    it("should reject non-string email and password types", () => {
      const result = validateRegisterInput({
        email: 12345,
        password: true,
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, "Email must be a string.");
      assert.equal(result.errors.password, "Password must be a string.");
    });

    it("should reject empty or whitespace email", () => {
      const result = validateRegisterInput({
        email: "   ",
        password: "ValidPassword123!",
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, "Email address cannot be empty.");
    });

    it("should enforce maximum email length limit (254 chars)", () => {
      const longEmail = "a".repeat(245) + "@example.com"; // 257 chars
      const result = validateRegisterInput({
        email: longEmail,
        password: "ValidPassword123!",
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.email?.includes(`exceed ${LIMITS.EMAIL_MAX_LENGTH}`));
    });

    it("should reject malformed email formats", () => {
      const invalidEmails = [
        "notanemail",
        "missing@domain",
        "@nodomain.com",
        "user@.com",
        "user@domain..com",
        "user name@example.com",
      ];
      for (const email of invalidEmails) {
        const result = validateRegisterInput({
          email,
          password: "ValidPassword123!",
        });
        assert.equal(result.valid, false, `Expected ${email} to be rejected`);
        assert.ok(result.errors.email);
      }
    });

    it("should enforce minimum password length limit (6 chars)", () => {
      const result = validateRegisterInput({
        email: "test@example.com",
        password: "12345",
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.password?.includes(`at least ${LIMITS.PASSWORD_MIN_LENGTH}`));
    });

    it("should enforce maximum password length limit (128 chars)", () => {
      const result = validateRegisterInput({
        email: "test@example.com",
        password: "a".repeat(129),
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.password?.includes(`cannot exceed ${LIMITS.PASSWORD_MAX_LENGTH}`));
    });

    it("should enforce password confirmation match", () => {
      const result = validateRegisterInput({
        email: "test@example.com",
        password: "SecretPassword123!",
        confirmPassword: "DifferentPassword456!",
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.confirmPassword, "Passwords do not match.");
    });

    it("should reject non-string confirmPassword", () => {
      const result = validateRegisterInput({
        email: "test@example.com",
        password: "SecretPassword123!",
        confirmPassword: 99999,
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.confirmPassword, "Confirm password must be a string.");
    });

    it("should reject non-string or excessive name length", () => {
      const nonString = validateRegisterInput({
        name: 1234,
        email: "test@example.com",
        password: "SecretPassword123!",
      });
      assert.equal(nonString.valid, false);
      assert.equal(nonString.errors.name, "Name must be a string.");

      const tooLong = validateRegisterInput({
        name: "x".repeat(101),
        email: "test@example.com",
        password: "SecretPassword123!",
      });
      assert.equal(tooLong.valid, false);
      assert.ok(tooLong.errors.name?.includes("cannot exceed 100 characters"));
    });

    it("should validate allowed role values (user, admin)", () => {
      const invalidRole = validateRegisterInput({
        email: "test@example.com",
        password: "SecretPassword123!",
        role: "superadmin",
      });
      assert.equal(invalidRole.valid, false);
      assert.equal(invalidRole.errors.role, "Role must be either 'user' or 'admin'.");

      const nonStringRole = validateRegisterInput({
        email: "test@example.com",
        password: "SecretPassword123!",
        role: 1,
      });
      assert.equal(nonStringRole.valid, false);
      assert.equal(nonStringRole.errors.role, "Role must be a string.");
    });

    it("should accept valid registration inputs for both roles", () => {
      const validUser = validateRegisterInput({
        name: "Jordan Lee",
        email: "jordan@example.com",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
        role: "user",
      });
      assert.equal(validUser.valid, true);
      assert.deepEqual(validUser.errors, {});

      const validAdmin = validateRegisterInput({
        name: "Admin User",
        email: "admin@queuesmart.com",
        password: "AdminPassword123!",
        confirmPassword: "AdminPassword123!",
        role: "admin",
      });
      assert.equal(validAdmin.valid, true);
      assert.deepEqual(validAdmin.errors, {});
    });
  });

  describe("validateLoginInput", () => {
    it("should reject non-object payloads", () => {
      const result = validateLoginInput(null);
      assert.equal(result.valid, false);
      assert.ok(result.errors._general);
    });

    it("should require email and password", () => {
      const result = validateLoginInput({});
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, "Email address is required.");
      assert.equal(result.errors.password, "Password is required.");
    });

    it("should reject empty or whitespace email", () => {
      const result = validateLoginInput({
        email: "   ",
        password: "ValidPassword123!",
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, "Email address cannot be empty.");
    });

    it("should reject invalid email format", () => {
      const result = validateLoginInput({
        email: "bademail",
        password: "ValidPassword123!",
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.email);
    });

    it("should reject non-string password and email", () => {
      const result = validateLoginInput({
        email: 100,
        password: {},
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, "Email must be a string.");
      assert.equal(result.errors.password, "Password must be a string.");
    });

    it("should reject password exceeding maximum length", () => {
      const result = validateLoginInput({
        email: "test@example.com",
        password: "x".repeat(129),
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.password?.includes("cannot exceed 128 characters"));
    });

    it("should accept valid login credentials", () => {
      const result = validateLoginInput({
        email: "admin@queuesmart.com",
        password: "Admin123!",
      });
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, {});
    });
  });
});

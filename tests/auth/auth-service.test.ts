import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../../src/lib/auth/auth-service";
import { UserStore } from "../../src/lib/auth/user-store";

describe("AuthService Business Logic & Role Handling", () => {
  let store: UserStore;
  let service: AuthService;

  beforeEach(() => {
    store = new UserStore();
    service = new AuthService(store);
  });

  describe("User Registration", () => {
    it("should successfully register a standard user", async () => {
      const result = await service.registerUser({
        name: "Riley Carter",
        email: "riley@example.com",
        password: "UserSecret123!",
        confirmPassword: "UserSecret123!",
        role: "user",
      });

      assert.equal(result.success, true);
      assert.equal(result.statusCode, 201);
      assert.ok(result.user);
      assert.equal(result.user.email, "riley@example.com");
      assert.equal(result.user.name, "Riley Carter");
      assert.equal(result.user.role, "user");
      assert.equal(result.redirectUrl, "/user");
      assert.ok(result.token);

      // Verify stored without returning password hash
      assert.equal((result.user as unknown as Record<string, unknown>).passwordHash, undefined);
      assert.equal((result.user as unknown as Record<string, unknown>).salt, undefined);
    });

    it("should successfully register an administrator with admin role and redirect", async () => {
      const result = await service.registerUser({
        name: "Security Admin",
        email: "secadmin@queuesmart.com",
        password: "AdminSecret123!",
        role: "admin",
      });

      assert.equal(result.success, true);
      assert.equal(result.statusCode, 201);
      assert.ok(result.user);
      assert.equal(result.user.role, "admin");
      assert.equal(result.redirectUrl, "/admin");
      assert.ok(result.token);
    });

    it("should auto-derive display name from email when name is not provided", async () => {
      const result = await service.registerUser({
        email: "casey.kim@example.com",
        password: "Password123!",
      });

      assert.equal(result.success, true);
      assert.ok(result.user);
      assert.equal(result.user.name, "Casey Kim");
    });

    it("should reject duplicate email registrations with 409 Conflict", async () => {
      // Seeded user: admin@queuesmart.com already exists
      const result = await service.registerUser({
        email: "admin@queuesmart.com",
        password: "SomePassword123!",
      });

      assert.equal(result.success, false);
      assert.equal(result.statusCode, 409);
      assert.ok(result.message.includes("already exists"));
      assert.ok(result.errors?.email);
    });

    it("should reject invalid inputs with 400 Bad Request and validation errors", async () => {
      const result = await service.registerUser({
        email: "invalid-email",
        password: "123", // too short
      });

      assert.equal(result.success, false);
      assert.equal(result.statusCode, 400);
      assert.ok(result.errors?.email);
      assert.ok(result.errors?.password);
    });
  });

  describe("Login Authentication", () => {
    it("should authenticate a seeded user and route to /user", async () => {
      const result = await service.authenticateUser({
        email: "alex@example.com",
        password: "User123!",
      });

      assert.equal(result.success, true);
      assert.equal(result.statusCode, 200);
      assert.ok(result.user);
      assert.equal(result.user.email, "alex@example.com");
      assert.equal(result.user.role, "user");
      assert.equal(result.redirectUrl, "/user");
      assert.ok(result.token);
    });

    it("should authenticate an administrator and route to /admin", async () => {
      const result = await service.authenticateUser({
        email: "admin@queuesmart.com",
        password: "Admin123!",
      });

      assert.equal(result.success, true);
      assert.equal(result.statusCode, 200);
      assert.ok(result.user);
      assert.equal(result.user.email, "admin@queuesmart.com");
      assert.equal(result.user.role, "admin");
      assert.equal(result.redirectUrl, "/admin");
      assert.ok(result.token);
    });

    it("should reject non-existent user with 401 Unauthorized", async () => {
      const result = await service.authenticateUser({
        email: "nonexistent@example.com",
        password: "Password123!",
      });

      assert.equal(result.success, false);
      assert.equal(result.statusCode, 401);
      assert.equal(result.message, "Invalid email or password.");
      assert.equal(result.user, undefined);
    });

    it("should reject incorrect password with 401 Unauthorized", async () => {
      const result = await service.authenticateUser({
        email: "admin@queuesmart.com",
        password: "WrongPassword999!",
      });

      assert.equal(result.success, false);
      assert.equal(result.statusCode, 401);
      assert.equal(result.message, "Invalid email or password.");
    });

    it("should reject invalid login formats with 400 Bad Request", async () => {
      const result = await service.authenticateUser({});

      assert.equal(result.success, false);
      assert.equal(result.statusCode, 400);
      assert.ok(result.errors?.email);
      assert.ok(result.errors?.password);
    });
  });

  describe("Session Tokens & Verification", () => {
    it("should sign and verify valid session tokens", () => {
      const mockUser = {
        id: "usr_mock_1",
        name: "Test User",
        email: "test@example.com",
        role: "user" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const token = service.createSessionToken(mockUser);
      assert.ok(typeof token === "string");
      assert.ok(token.includes("."));

      const verified = service.verifySessionToken(token);
      assert.equal(verified.valid, true);
      assert.ok(verified.payload);
      assert.equal(verified.payload.userId, "usr_mock_1");
      assert.equal(verified.payload.email, "test@example.com");
      assert.equal(verified.payload.role, "user");
    });

    it("should reject tampered or invalid tokens", () => {
      const invalidTokens = [
        "",
        "notatoken",
        "invalid.payload.here",
        "dGVzdA.tamperedsignature123",
      ];

      for (const token of invalidTokens) {
        const verified = service.verifySessionToken(token);
        assert.equal(verified.valid, false);
      }
    });

    it("should find sanitized user by id", async () => {
      const user = await service.getUserById("usr_admin_001");
      assert.ok(user);
      assert.equal(user.email, "admin@queuesmart.com");
      assert.equal((user as unknown as Record<string, unknown>).passwordHash, undefined);

      const notFound = await service.getUserById("fake_id");
      assert.equal(notFound, null);
    });
  });
});

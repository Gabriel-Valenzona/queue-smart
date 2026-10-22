import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST as registerHandler } from "../../src/app/api/auth/register/route";
import { POST as loginHandler } from "../../src/app/api/auth/login/route";
import { GET as meHandler } from "../../src/app/api/auth/me/route";
import { POST as logoutHandler } from "../../src/app/api/auth/logout/route";
import { authService } from "../../src/lib/auth/auth-service";

describe("Authentication REST API Handlers", () => {
  describe("POST /api/auth/register", () => {
    it("should successfully register and return 201 with session cookie", async () => {
      const email = `api.test.${Date.now()}@queuesmart.com`;
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "API Tester",
          email,
          password: "ApiPassword123!",
          confirmPassword: "ApiPassword123!",
          role: "user",
        }),
      });

      const response = await registerHandler(request);
      assert.equal(response.status, 201);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.user?.email, email);
      assert.equal(json.redirectUrl, "/user");

      const cookies = response.headers.get("set-cookie");
      assert.ok(cookies?.includes("qs_session="));
    });

    it("should return 400 when malformed payload is provided", async () => {
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-content{{{",
      });

      const response = await registerHandler(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.errors?._general);
    });

    it("should return 400 when validation rules fail", async () => {
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bad-email",
          password: "123",
        }),
      });

      const response = await registerHandler(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.errors?.email);
      assert.ok(json.errors?.password);
    });

    it("should return 409 when registering existing user email", async () => {
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@queuesmart.com",
          password: "ValidPass123!",
        }),
      });

      const response = await registerHandler(request);
      assert.equal(response.status, 409);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes("already exists"));
    });
  });

  describe("POST /api/auth/login", () => {
    it("should return 200 and role redirect for valid admin login", async () => {
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@queuesmart.com",
          password: "Admin123!",
        }),
      });

      const response = await loginHandler(request);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.user?.role, "admin");
      assert.equal(json.redirectUrl, "/admin");

      const cookies = response.headers.get("set-cookie");
      assert.ok(cookies?.includes("qs_session="));
    });

    it("should return 401 when given incorrect password", async () => {
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@queuesmart.com",
          password: "WrongPassword999!",
        }),
      });

      const response = await loginHandler(request);
      assert.equal(response.status, 401);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.equal(json.message, "Invalid email or password.");
    });

    it("should return 400 when required fields are missing", async () => {
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await loginHandler(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.success, false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 when no token or cookie is supplied", async () => {
      const request = new Request("http://localhost:3000/api/auth/me", {
        method: "GET",
      });

      const response = await meHandler(request);
      assert.equal(response.status, 401);

      const json = await response.json();
      assert.equal(json.success, false);
    });

    it("should return 200 and user session when Bearer token is provided", async () => {
      const admin = await authService.getUserById("usr_admin_001");
      assert.ok(admin);
      const token = authService.createSessionToken(admin);

      const request = new Request("http://localhost:3000/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const response = await meHandler(request);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.user?.email, "admin@queuesmart.com");
      assert.equal(json.user?.role, "admin");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should return 200 and clear session cookies", async () => {
      const response = await logoutHandler();
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);

      const setCookie = response.headers.get("set-cookie") || "";
      assert.ok(setCookie.includes("qs_session="));
    });
  });
});
